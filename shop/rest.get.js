import Shop from "/-shop/Shop.js"
import config from "/-config"
import Files from "/-showcase/Files.js"
import unique from "/-nicked/unique.js"
import Rest from '/-rest'
const rest = new Rest()
export default rest


import rest_db from '/-db/rest.db.js'
rest.extra(rest_db)

import rest_bed from '/-shop/rest.shop.js'
rest.extra(rest_bed)


rest.addResponse('get-search-filters', async view => {
	const md = view.data.md = await view.get('md')
	const partner = await view.get('partner')
	const conf = view.data.conf = await config('shop', true)
	const group = view.data.group = await view.get('group#required')
	const db = await view.get('db')

	
	const filters = view.data.filters = []
	
	// const res = {}
	// const opt = await Catalog.getGroupOpt(db, view.visitor, group.group_id)
	


	for (const prop_nick in md.mget) {
	 	if (~group.filters.indexOf(prop_nick)) continue
	 	const filter = await Shop.getFilterConf(db, prop_nick, group, md, partner)
	 	if (!filter) continue
	 	filters.push(filter)
	}

	for (const prop_nick of group.filters) {
		const filter = await Shop.getFilterConf(db, prop_nick, group, md, partner)
		if (!filter) continue
		filters.push(filter)
	}	

	const props = view.data.props = {}
	const values = view.data.values = {}
	for (const filter of filters) {
		const prop = props[filter.prop_nick] = await Shop.getPropByNick(db, filter.prop_nick)
		if (prop.type != 'value') continue
		for (const value_nick of filter.values) {
			values[value_nick] = await Shop.getValueByNick(db, value_nick)
		}
	}
	for (const prop_nick in md.mget) {
		props[prop_nick] = await Shop.getPropByNick(db, prop_nick)
		const val = md.mget[prop_nick]
		if (typeof val == 'object') {
			for (const value_nick in val) {
				values[value_nick] = await Shop.getValueByNick(db, value_nick)
			}
		}
	}
	return view.ret()
})


rest.addResponse('get-search-title', async view => {
	const md = view.data.md = await view.get('md')
	const conf = view.data.conf = await config('shop', true)
	const group = view.data.group = await view.get('group#required')
	const db = await view.get('db')

	const props = view.data.props = {}
	const values = view.data.values = {}
	for (const prop_nick in md.mget) {
		props[prop_nick] = await Shop.getPropByNick(db, prop_nick)
		const val = md.mget[prop_nick]
		if (typeof val == 'object') {
			for (const value_nick in val) {
				values[value_nick] = await Shop.getValueByNick(db, value_nick)
			}
		}	
	}

	return view.ret()
})
rest.addResponse('get-search-groups', async view => {
	const md = view.data.md = await view.get('md')
	const partner = await view.get('partner')
	const conf = view.data.conf = await config('shop', true)
	const group = view.data.group = await view.get('group#required')
	const db = await view.get('db')

	const childs = view.data.childs = await Shop.getGroupFilterChilds(db, group.group_id)
	
	for (const i in childs) {
		const child = {...childs[i]}
		child.modcount = await Shop.getModcount(db, md, partner, child.group_id)
		childs[i] = child
	}
	
	return view.ret()
})

rest.addResponse('get-model', async (view) => {
	
	const db = await view.get('db')
	const conf = view.data.conf = await config('shop', true)
	const root = view.data.root = await view.get('root#required')
	

	const partner = await view.get('partner')
	view.data.partner = partner.key

	const model = view.data.model = await view.get('model#required')
	

	const allgroupids = await Shop.getGroupIdsByItem(db, model.recap)
	let groupnicks = []
	for (const group_id of allgroupids) {
		if (!await Shop.canI(db, group_id)) continue
		if (!await Shop.runGroupDown(db, group_id, (child) => {
			if (group_id == child.group_id) return
			if (~allgroupids.indexOf(child.group_id)) return true //Есть какая-то более вложенная группа
		})) {
			const group = await Shop.getGroupById(db, group_id)
			groupnicks.push(group.group_nick) //Если внутри группы не нашли других
		}
	}
	const groups = view.data.groups = []
	for (const group_nick of groupnicks) {
		const group_id = await Shop.getGroupIdByNick(db, group_nick)
		const group = await Shop.getGroupById(db, group_id)
		groups.push(group)
	}


	const files = view.data.files = (model.recap.files || []).map(src => Files.srcInfo(src))	


	const props = view.data.props = {}
	const values = view.data.values = {}
	for (const prop_nick in model.recap) {
		const prop = props[prop_nick] = await Shop.getPropByNick(db, prop_nick)
		if (prop.type != 'value') continue
		for (const value_nick of model.recap[prop_nick]) {
			values[value_nick] = await Shop.getValueByNick(db, value_nick)
		}
	}
	
	return view.ret()
})
rest.addResponse('get-search-list', async (view) => {
	const md = view.data.md = await view.get('md')
	const conf = view.data.conf = await config('shop', true)
	const group = view.data.group = await view.get('group#required')
	const db = await view.get('db')
	const partner = await view.get('partner')

	const p = await view.get('p')
	const count = await view.get('count')
	
	const bind = await Shop.getBind(db)
	const samples = await Shop.getSamplesUpByGroupId(db, group.group_id)
	const marked_samples = Shop.addSamples(samples, [md.mget])

	const {from, join, where, sort} = await Shop.getWhereBySamples(db, marked_samples, md.hashs, partner)


	const countonpage = count || conf.limit
	const start = (p - 1) * countonpage
	
	const moditem_ids = await db.all(`
		SELECT wva.value_id, GROUP_CONCAT(win.key_id separator ',') as key_ids 
		FROM ${from.join(', ')} ${join.join(' ')}
		WHERE ${where.join(' and ')}
		GROUP BY wva.value_id 
		ORDER BY ${sort.join(', ')}
		LIMIT ${start}, ${countonpage}
	`, bind)

	const total = await Shop.getModcount(db, md, partner)


	const list = await Shop.getModelsByItems(db, moditem_ids, partner)


	let last = total <= countonpage ? 1 : Math.ceil(total / countonpage)
	const pagination = {
		last: last,
		page: last < p ? last + 1 : p
	}
	const res = { list, pagination, count:total, countonpage }
	Object.assign(view.data, res)
	if (!list.length) view.status = 404

	const props = view.data.props = {}
	const values = view.data.values = {}
	for (const model of list) {
		for (const prop_nick in model.recap) {
			const prop = props[prop_nick] = await Shop.getPropByNick(db, prop_nick)
			if (prop.type != 'value') continue
			for (const value_nick of model.recap[prop_nick]) {
				values[value_nick] = await Shop.getValueByNick(db, value_nick)
			}	
		}
	}
	return view.ret()
})
// rest.addResponse('get-search-list', async (view) => {	
// 	const db = await view.get('db')
// 	const root = view.data.root = await view.get('root#required')
// 	const group = view.data.group = await view.get('group')
// 	const search = view.data.search = await view.get('search')
// 	const hashs = await view.get('hashs')
// 	const md = view.data.md = await view.get('md')
// 	const partner = await view.get('partner')
// 	const p = await view.get('p')
// 	const count = await view.get('count')
// 	const conf = await config('shop')
// 	view.data.m = md.m
// 	view.data.limit = conf.limit
	
// 	const {from, where, sort, bind} = Shop.getmdwhere(md, md.group.mgroup, hashs, partner)

	
	
// 	const countonpage = count || conf.limit
// 	const start = (p - 1) * countonpage
	
// 	const moditem_ids = await db.all(`
// 		SELECT pos.value_id, GROUP_CONCAT(pos.key_id separator ',') as key_ids 
// 		FROM ${from.join(', ')}
// 		WHERE ${where.join(' and ')}
// 		GROUP BY pos.value_id 
// 		ORDER BY ${sort.join(', ')}
// 		LIMIT ${start}, ${countonpage}
// 	`, bind)
	
// 	const total = await db.col(`
// 		SELECT count(distinct pos.value_id)
// 		FROM ${from.join(', ')}
// 		WHERE ${where.join(' and ')}
// 	`, bind)
	
	
// 	const list = await Shop.getModelsByItems(db, moditem_ids, partner, bind)

	

// 	let last = total <= countonpage ? 1 : Math.ceil(total / countonpage)
// 	const pagination = {
// 		last: last,
// 		page: last < p ? last + 1 : p
// 	}
// 	const res = { list, pagination, count:total, countonpage }
// 	Object.assign(view.data, res)
// 	if (!list.length) view.status = 404
// 	return view.ret()
// })



rest.addResponse('get-livemodels', async (view) => {
	const db = await view.get('db')
	const query = await view.get('query')
	const hashs = await view.get('hashs')
	const md = await Shop.getmd(db, '', query, hashs)

	const conf = view.data.conf = await config('shop', true)
	
	const partner = await view.get('partner')
	const root = await view.get('root#required')
	
	await Shop.indexGroups(db)
	
	const {list, count} = await Shop.getItemsWithKnownPropsNoMultiByMd(db, root.group_id, md, partner, {
		limit: 12,
		rand: true,
		nicks:['art','brendmodel'],
		titles:['brend','model','art','naimenovanie','images','cena']
	})
	console.log(list)
	view.data.count = count
	view.data.list = list
	if (!list.length) view.status = 404

	const group_ids = await Shop.getGroupIdsBymd(db, root.group_id, md, partner) //Все группы в которые входят позиции, которые соответсвуют поиску md.hashs	
	let rootpath = false //Путь до последней общей группы найденных
	let all = [] //Список все групп вместе с родителями
	for (const group_id of group_ids) {
		const path = []
		await Shop.runGroupUp(db, group_id, group => {
			path.unshift(group.group_id)
			if (group === root) return false
		})
		if (!rootpath) rootpath = path
		rootpath = rootpath.filter(id => ~path.indexOf(id))
		all.push(...path)
	}
	all = unique(all)

	view.data.gcount = group_ids.length
	if (group_ids.length) {
		const group = await Shop.getGroupById(db, rootpath.pop()) //общий родитель
		let childs = group.childs.filter(id => ~all.indexOf(id))
		if (!childs.length) {
			childs = [group]
		} else {
			for (const i in childs) {
				const group_id = childs[i]
				childs[i] = await Shop.getGroupById(db, group_id)
			}
		}
		view.data.groups = childs.map(group => {
			const g = {}
			for (const prop of ['group_nick','group_title']) g[prop] = group[prop]
			return g
		})
	} else {
		view.data.groups = []
	}



	return view.ret()
})
