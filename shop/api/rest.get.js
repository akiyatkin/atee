import Shop from "/-shop/api/Shop.js"
import config from "/-config"

import Rest from '/-rest'
const rest = new Rest()
export default rest


import rest_db from '/-db/rest.db.js'
rest.extra(rest_db)

import rest_bed from '/-shop/rest.shop.js'
rest.extra(rest_bed)


rest.addResponse('get-search-groups', async (view) => {
	
	const db = await view.get('db')

	const conf = await config('shop')

	view.data.root_title = conf.root_title
	const group = view.data.group = await view.get('group#required')
	

	const query = view.data.search = await view.get('query')
	const hashs = await view.get('hashs')
	
	const partner = await view.get('partner')

	const origm = await view.get('m')
	const mgetorig = Shop.makemd(origm)
	const mget = await Shop.mdfilter(mgetorig)
	const m = Shop.makemark(mget).join(':')
	const bind = await Shop.getBind(db)

	const childs = view.data.childs = await Shop.getChilds(db, group?.group_id || null)
	

	view.data.md = {m, group, mget, ...bind}

	
	const samples = await Shop.getAllSamples(db, group.group_id)
	const {from, join, where, sort} = await Shop.getWhereBySamples(db, [...samples, mget], hashs, partner, false)

	view.data.modcount = await db.col(`
		SELECT count(distinct wva.value_id)
		FROM ${from.join(', ')} ${join.join(' ')}
		WHERE ${where.join(' and ')}
		ORDER BY ${sort.join(', ')}
	`, bind)

	for (const child of childs) {
		const samples = await Shop.getAllSamples(db, child.group_id)
		const {from, join, where, sort} = await Shop.getWhereBySamples(db, [...samples, mget], hashs, partner, false)
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
	// 	const {where, from, sort, bind} = Shop.getmdwhere(md, child.mgroup, hashs, partner)
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
	const conf = await config('shop')
	view.data.m = md.m
	view.data.limit = conf.limit
	
	const {from, where, sort, bind} = Shop.getmdwhere(md, md.group.mgroup, hashs, partner)

	
	
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
	
	
	const list = await Shop.getModelsByItems(db, moditem_ids, partner, bind)

	

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