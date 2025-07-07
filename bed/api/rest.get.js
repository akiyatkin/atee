import Bed from "/-bed/api/Bed.js"
import config from "/-config"

import Rest from '/-rest'
const rest = new Rest()
export default rest


import rest_db from '/-db/rest.db.js'
rest.extra(rest_db)

import rest_bed from '/-bed/rest.bed.js'
rest.extra(rest_bed)


rest.addResponse('get-search-groups', async (view) => {
	
	const db = await view.get('db')

	const conf = await config('bed')

	view.data.root_title = conf.root_title
	const group = view.data.group = await view.get('group#required')
	

	const query = view.data.search = await view.get('query')
	const hashs = await view.get('hashs')
	
	const partner = await view.get('partner')

	const origm = await view.get('m')
	const mgetorig = Bed.makemd(origm)
	const mget = await Bed.mdfilter(mgetorig)
	const m = Bed.makemark(mget).join(':')
	const bind = await Bed.getBind(db)

	const childs = view.data.childs = await Bed.getChilds(db, group?.group_id || null)
	

	view.data.md = {m, group, mget, ...bind}

	
	const samples = await Bed.getAllSamples(db, group.group_id)
	const {from, join, where, sort} = await Bed.getWhereBySamples(db, [...samples, mget], hashs, partner, false)

	view.data.modcount = await db.col(`
		SELECT count(distinct wva.value_id)
		FROM ${from.join(', ')} ${join.join(' ')}
		WHERE ${where.join(' and ')}
		ORDER BY ${sort.join(', ')}
	`, bind)

	for (const child of childs) {
		const samples = await Bed.getAllSamples(db, child.group_id)
		const {from, join, where, sort} = await Bed.getWhereBySamples(db, [...samples, mget], hashs, partner, false)
		child.mute = !await db.col(`
			SELECT wva.value_id
			FROM ${from.join(', ')} ${join.join(' ')}
			WHERE ${where.join(' and ')}
			LIMIT 1
		`, bind)
	}
	return view.ret()


	const md = view.data.md = await view.get('md')
	

	
	
	
	
	// group.count = await db.col(`
	// 	SELECT count(distinct pos.value_id)
	// 	FROM ${from.join(', ')}
	// 	WHERE ${where.join(' and ')}
	// 	ORDER BY ${sort.join(', ')}
	// `, bind)

	// for (const child of md.childs) {
	// 	const {where, from, sort, bind} = Bed.getmdwhere(md, child.mgroup, hashs, partner)
	// 	child.mute = !await db.col(`
	// 		SELECT pos.value_id
	// 		FROM ${from.join(', ')}
	// 		WHERE ${where.join(' and ')}
	// 		LIMIT 1
	// 	`, bind)
	// }

	
	view.data.childs = md.childs
	
	return view.ret()
})
rest.addResponse('get-search-list', async (view) => {	
	const db = await view.get('db')
	
	const group = view.data.group = await view.get('group')
	const search = view.data.search = await view.get('search')
	const hashs = await view.get('hashs')
	const md = view.data.md = await view.get('md')
	const partner = await view.get('partner')
	const p = await view.get('p')
	const count = await view.get('count')
	const conf = await config('bed')
	view.data.m = md.m
	view.data.limit = conf.limit
	
	const {from, where, sort, bind} = Bed.getmdwhere(md, md.group.mgroup, hashs, partner)

	
	
	const countonpage = count || conf.limit
	const start = (p - 1) * countonpage
	
	const moditem_ids = await db.all(`
		SELECT pos.value_id, GROUP_CONCAT(pos.key_id separator ',') as key_ids 
		FROM ${from.join(', ')}
		WHERE ${where.join(' and ')}
		GROUP BY pos.value_id 
		ORDER BY ${sort.join(', ')}
		LIMIT ${start}, ${countonpage}
	`, bind)
	
	const total = await db.col(`
		SELECT count(distinct pos.value_id)
		FROM ${from.join(', ')}
		WHERE ${where.join(' and ')}
	`, bind)
	
	
	const list = await Bed.getModelsByItems(db, moditem_ids, partner, bind)

	

	let last = total <= countonpage ? 1 : Math.ceil(total / countonpage)
	const pagination = {
		last: last,
		page: last < p ? last + 1 : p
	}
	const res = { list, pagination, count:total, countonpage }
	Object.assign(view.data, res)
	if (!list.length) view.status = 404
	return view.ret()
})