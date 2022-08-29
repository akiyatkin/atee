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
		const { hashs, db } = await view.gets(['db','hashs'])
		//await wait(500)
		if (!hashs.length) {
			const {gcount, count, list, groups} = await Catalog.getAllCount()
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


		const tree = await Catalog.getTree()
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

			const brand = await Catalog.getBrandById(model.brand_id)
			model.brand_nick = brand.brand_nick
			model.brand_title = brand.brand_title
			delete model.brand_id
			model.model_id = model_id

			const name = await Catalog.getProp('Наименование')
			model['Наименование'] = await db.col(`
				SELECT ip.text 
				FROM showcase_iprops ip
				WHERE ip.model_id = :model_id and ip.prop_id = :prop_id
			`, {...name, model_id})
			

			const cost = await Catalog.getProp('Цена')
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
