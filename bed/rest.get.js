import Bed from "/-bed/Bed.js"
import config from "/-config"

import Rest from '/-rest'
const rest = new Rest()
export default rest

import rest_search from '/-dialog/search/rest.search.js'
rest.extra(rest_search)

import rest_db from '/-db/rest.db.js'
rest.extra(rest_db)

import rest_bed from '/-bed/rest.bed.js'
rest.extra(rest_bed)


// Catalog.getGroupIds = async (view, md, partner) => {
// 	const { db } = await view.gets(['db'])
// 	const {where, from} = await Catalog.getmdwhere(view, md, partner)
// 	const res_ids = await db.colAll(`
// 		SELECT distinct g.group_id 
// 		FROM (${from.join(', ')})
// 		LEFT JOIN showcase_groups g on m.group_id = g.group_id
// 		WHERE ${where.join(' and ')}
// 		ORDER BY g.ordain
// 	`)
// 	return res_ids
// }
rest.addResponse('get-search-groups', async (view) => {
	
	const db = await view.get('db')
	const page = view.data.page = await view.get('page')
	const search = view.data.search = await view.get('search')
	const hashs = await view.get('hashs')
	
	const md = view.data.md = await view.get('md')
	
	const partner = await view.get('partner')

	


	const {where, from, sort, bind} = await Bed.getmdwhere(db, md, md.page.mpage, hashs, partner)
	
	page.mute = !await db.col(`
		SELECT pos.value_id
		FROM ${from.join(', ')}
		WHERE ${where.join(' and ')}
		LIMIT 1
	`, bind)

	for (const child of md.childs) {
		const {where, from, sort, bind} = await Bed.getmdwhere(db, md, child.mpage, hashs, partner)
		child.mute = !await db.col(`
			SELECT pos.value_id
			FROM ${from.join(', ')}
			WHERE ${where.join(' and ')}
			LIMIT 1
		`, bind)
	}

	
	view.data.childs = md.childs
	
	return view.ret()
})