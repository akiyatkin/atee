import { nicked } from "/-nicked/nicked.js"
import { unique } from "/-nicked/unique.js"
import { Catalog } from "/-catalog/Catalog.js"

//const wait = delay => new Promise(resolve => setTimeout(resolve, delay))

export const rest_live = (meta) => {
	meta.addArgument('hash', (view, hash) => {
		hash = nicked(hash)
		return hash
	})
	meta.addVariable('hashs', async (view) => {
		const { hash } = await view.gets(['hash'])
		const hashs = unique(hash.split('-').filter(val => !!val)).sort()
		return hashs
	})
	meta.addAction('get-livemodels', async (view) => {
		const { hash, db, visitor } = await view.gets(['db','hash', 'visitor'])
		//await wait(500)
		// if (!hashs.length) {
		// 	const {gcount, count, list, groups} = await Catalog.getAllCount()
		// 	view.ans.gcount = gcount
		// 	view.ans.count = count
		// 	view.ans.list = list
		// 	view.ans.groups = groups
		// 	return view.ret()
		// }
		const md = {search: hash}
		const { group_ids } = await Catalog.searchGroups(db, visitor, md)
		
		if (!group_ids.length) {
			view.ans.list = []
			view.ans.groups = []
			view.ans.gcount = 0
			view.ans.count = 0
			return view.ret()
		}
		const groupnicks = await Catalog.getGroups()
		const options = await Catalog.getOptions()
		const root = groupnicks[options.root_nick]


		const childs = await Catalog.getCommonChilds(group_ids, root)
		view.ans.gcount = 0
		view.ans.groups = childs.reduce((groups, group) => {
			view.ans.gcount += group.groups.length
			const g = {}
			for (const prop of ['group_nick','group_title']) g[prop] = group[prop]
			groups.push(g)
			return groups
		}, [])

		const {from, where} = await Catalog.getmdwhere(db, visitor, md)

		const list = []
		const models = await db.all(`
			SELECT m.model_id, m.model_nick, m.model_title, m.brand_id
			FROM ${from.join(', ')}
			WHERE ${where.join(' and ')}
			ORDER BY RAND()
			LIMIT 12
		`)
		view.ans.count = await db.col(`
			SELECT count(*)
			FROM ${from.join(', ')}
			WHERE ${where.join(' and ')}
		`)

		const prop = await Catalog.getProp('Наименование')
		const cost = await Catalog.getProp('Цена')
		for (const model of models) {
			const brand = await Catalog.getBrandById(model.brand_id)
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

			list.push(model)
		}
		view.ans.list = list
		return view.ret()
	})
}
