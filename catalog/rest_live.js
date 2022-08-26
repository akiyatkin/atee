import { nicked } from "/-nicked/nicked.js"
import { unique } from "/-nicked/unique.js"
import { Access } from "/-controller/Access.js"
import { Db } from "/-db/Db.js"

const getAllCount = Access.cache(async () => {
	const db = await new Db().connect()
	const count = await db.col('SELECT count(*) FROM showcase_models')
	const gcount = await db.col('SELECT count(*) FROM showcase_groups')

	const list = []
	const root_id = await db.col('SELECT group_id from showcase_groups WHERE parent_id is null')
	const groups = !root_id ? [] : await db.all('select group_title, group_nick from showcase_groups WHERE parent_id = :root_id order by ordain', {root_id})
	return {count, gcount, list, groups}
})
const getProp = Access.cache(async (prop_title) => {
	const db = await new Db().connect()
	const prop_nick = nicked(prop_title)
	const prop = await db.fetch('SELECT * from showcase_props where prop_nick = :prop_nick', { prop_nick })
	return prop
})
const getBrandById = Access.cache(async (brand_id) => {
	const db = await new Db().connect()
	const brand = await db.fetch('SELECT * from showcase_brands where brand_id = :brand_id', { brand_id })
	return brand
})
const addParents = (group, parent_id, tree) => {
	if (!parent_id) return
	group.path.unshift(parent_id)
	addParents(group, tree[parent_id].parent_id, tree)
}
const getTree = Access.cache(async () => {
	const db = await new Db().connect()
	const tree = await db.allto('group_id', 'SELECT group_id, parent_id, group_nick, icon, group_title FROM showcase_groups ORDER by ordain')
	for (const group_id in tree) {
		const group = tree[group_id]
		group.path = []
		addParents(group, group.parent_id, tree)
	}
	return tree
})

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
		const { hashs, db } = await view.gets(['db','hashs'])

		if (!hashs.length) {
			const {gcount, count, list, groups} = await getAllCount()
			view.ans.gcount = gcount
			view.ans.count = count
			view.ans.list = list
			view.ans.groups = groups
			return view.ret()
		}
		//hashs.map('search like = ')
		const timer = Date.now()
		
		const sql = `
			SELECT distinct m.group_id
			FROM showcase_items i, showcase_models m
			WHERE i.model_id = m.model_id
				and m.search like "%${hashs.join('%" and m.search like "%')}%"
		`
		const childs = await db.colAll(sql)
		if (!childs.length) {
			view.ans.list = []
			view.ans.groups = []
			view.ans.gcount = 0
			view.ans.count = 0
			return view.ret()
		}


		const tree = await getTree()
		const some_id = childs[0]

		const path = childs.reduce((path, group_id) => {
			const somepath = tree[group_id].path
			const newpath = path.filter(value => somepath.includes(value));
			return newpath
		}, tree[some_id].path)
		
		const showgroups = []
		childs.forEach((group_id) => {
			const group = tree[group_id]
			group_id = group.path[path.length] || group.group_id
			if (~showgroups.indexOf(group_id)) return
			showgroups.push(group_id)
		})
		view.ans.gcount = childs.length
		
		view.ans.groups = showgroups.reduce((groups, group_id) => {
			const g = {}
			const group = tree[group_id]

			for (const prop of ['group_nick','group_title']) g[prop] = group[prop]
			groups.push(g)
			return groups
		}, [])

		
		const models = await db.colAll(`
			SELECT SQL_CALC_FOUND_ROWS distinct m.model_id
			FROM showcase_items i, showcase_models m
			WHERE i.model_id = m.model_id
				and m.search like "%${hashs.join('%" and m.search like "%')}%"
			LIMIT 12
		`)
		view.ans.count = await db.col('SELECT FOUND_ROWS()')

		const list = []
		for (const model_id of models) {
			const model = await db.fetch(`
				SELECT m.model_nick, m.model_title, m.brand_id
				FROM showcase_models m
				WHERE m.model_id = :model_id
			`, { model_id })
			

			const brand = await getBrandById(model.brand_id)
			model.brand_nick = brand.brand_nick
			model.brand_title = brand.brand_title
			delete model.brand_id
			model.model_id = model_id

			const name = await getProp('Наименование')
			model['Наименование'] = await db.col(`
				SELECT ip.text 
				FROM showcase_iprops ip
				WHERE ip.model_id = :model_id and ip.prop_id = :prop_id
			`, {...name, model_id})
			

			const cost = await getProp('Цена')
			model['Цена'] = Number(await db.col(`
				SELECT ip.number 
				FROM showcase_iprops ip
				WHERE ip.model_id = :model_id and ip.prop_id = :prop_id
			`, {...cost, model_id}))


			list.push(model)
		}
		view.ans.list = list
		
		view.ans.timer = Date.now() - timer
		
		//console.log(size, g)

		// if (hashs.length) {
		//     $sql = `SELECT m.model_id, m.group_id
		//     from showcase_models m
		//     WHERE m.search like "%'.implode('%" and m.search like "%', $split).'%"`;
		// } else {
		//     $sql = `SELECT m.model_id, m.group_id
		//     from showcase_models m`;
		// }


		// db.all(`
		// 	SELECT distinct group_id FROM showcase_models WHERE 
		// 	`)
		
		
		return view.ret()
	})
}
