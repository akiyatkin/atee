import nicked from "/-nicked"
import Rest from "/-rest"
import unique from "/-nicked/unique.js"
import rest_vars from '/-catalog/rest.vars.js'
import Catalog from "/-catalog/Catalog.js"
//const wait = delay => new Promise(resolve => setTimeout(resolve, delay))
const rest = new Rest(rest_vars)
export default rest
rest.addArgument('hash', (view, hash) => {
	hash = nicked(hash)
	return hash
})
rest.addVariable('hashs', async (view) => {
	const { hash } = await view.gets(['hash'])
	const hashs = unique(hash.split('-').filter(val => !!val)).sort()
	return hashs
})
rest.addResponse('get-livemodels', async (view) => {
	const { hash, db, partner, options, base} = await view.gets(['base', 'db','hash', 'partner', 'options'])
	
	const md = {search: hash}

	const group_ids = await Catalog.getGroupIds(view, md, partner)
	

	
	if (!group_ids.length) {
		view.ans.list = []
		view.ans.groups = []
		view.ans.gcount = 0
		view.ans.count = 0
		return view.ret()
	}

	const groupnicks = await Catalog.getGroups(view)
	const root = groupnicks[options.root_nick]


	const tree = await Catalog.getTree(db, view.visitor)

	let rootpath = group_ids[0] ? [...tree[group_ids[0]].path, group_ids[0]] : []		


	group_ids.forEach(group_id => {
		rootpath = rootpath.filter(id => ~tree[group_id].path.indexOf(id) || id == group_id)
	})

	const group = {...tree[rootpath.pop()]} //общий родитель
	let childs = group.childs.filter(id => {
		return group_ids.some(inid => {
			return ~tree[id].groups.indexOf(inid)
		})
	}).map(id => {
		const group = {...tree[id]}
		return group
	})
	if (!childs.length) childs = [group]

	view.ans.gcount = group_ids.length

	view.ans.groups = childs.map(group => {
		const g = {}
		for (const prop of ['group_nick','group_title']) g[prop] = group[prop]
		return g
	})

	const {from, where} = await Catalog.getmdwhere(view, md, partner)

	const list = []
	const models = await db.all(`
		SELECT distinct m.model_id, m.model_nick, m.model_title, m.brand_id
		FROM ${from.join(', ')}
		WHERE ${where.join(' and ')}
		ORDER BY RAND()
		LIMIT 12
	`)
	view.ans.count = await db.col(`
		SELECT count(distinct m.model_id)
		FROM ${from.join(', ')}
		WHERE ${where.join(' and ')}
	`)

	const prop = await base.getPropByTitle('Наименование')
	const cost = await base.getPropByTitle('Цена')
	for (const model of models) {
		const brand = await Catalog.getBrandById(view, model.brand_id)
		model.brand_nick = brand.brand_nick
		model.brand_title = brand.brand_title
		delete model.brand_id
		model['Наименование'] = await db.col(`
			SELECT ip.text 
			FROM showcase_iprops ip
			WHERE ip.model_id = :model_id and ip.prop_id = :prop_id
		`, {prop_id: prop.prop_id, model_id: model.model_id})

		model['Цена'] = Number(await db.col(`
			SELECT ip.number 
			FROM showcase_iprops ip
			WHERE ip.model_id = :model_id and ip.prop_id = :prop_id
		`, {prop_id: cost.prop_id, model_id: model.model_id}))
		
		if (partner?.discount) {
			model['Цена'] = Math.round(model['Цена'] * (100 - partner.discount) / 100)
		}

		list.push(model)
	}
	view.ans.list = list
	return view.ret()
})
