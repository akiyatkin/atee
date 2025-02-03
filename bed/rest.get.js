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
	const search = await view.get('search')
	const md = view.data.md = await view.get('md')

	const partner = await view.get('partner')

	const childs = await Bed.getChilds(db, page.group_id)
	
	return view.ret()
	for (const page of childs) {
		const mpage = await Bed.getMpage(db, page.page_id)
		const {where, from} = await Bed.getmdwhere(db, mpage, md.mget, search, partner)
	}

	
	


	const work = group.childs.length ? group : parent
	const level_group_ids = unique(group_ids.filter(group_id => {
		return tree[group_id].parent_id && tree[group_id].path?.length >= work.path?.length
	}).map(group_id => {
		return tree[group_id].path[work.path.length + 1] || group_id
	}))	
	const groups = work.childs.map((id) => {
		const group = {...tree[id]}
		group.mute = !~level_group_ids.indexOf(id)
		return group
	})

	const res = {
		title:group, brand,
		parent: group.path.length ? tree[group.path.at(-1)] : groupnicks[conf.root_nick],
		childs: groups,
		path: group.path.map(id => tree[id])
	}
	const base = await view.get('base')
	await Bed.mdvalues(view, base, md, res)
	
	Object.assign(view.data, res)
	return view.ret()
})