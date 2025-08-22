import Shop from "/-shop/Shop.js"
import config from "/-config"
import Files from "/-showcase/Files.js"
import unique from "/-nicked/unique.js"
//import search from "/-shop/search.html.js"
//import cards from "/-shop/cards.html.js"
import ddd from "/-words/date.html.js"
import nicked from "/-nicked"
import Rest from '/-rest'
const rest = new Rest()
export default rest


import rest_db from '/-db/rest.db.js'
rest.extra(rest_db)

import rest_shop from '/-shop/rest.shop.js'
rest.extra(rest_shop)



rest.addResponse('get-conf', async view => {
	const conf = view.data.conf = await config('shop', true)
	return view.ret()
})

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


rest.addResponse('get-search-root', async view => {
	view.data.conf = await config('shop', true)

	const md = view.data.md = await view.get('md')
	const group = view.data.group = await view.get('group#required')
	const db = await view.get('db')
	await Shop.prepareMgetPropsValues(db, view.data, md.mget)

	const group_nick = await view.get('group_nick#required')
	view.data.text = await Shop.getGroupPage(group_nick, view.visitor)

	//if (reans.status == 404) reans.data = `<script>console.log('Статья поиска ${src}')</script>`
	//if (reans.status == 404) reans.data = ' ' //Иначе переадресация
	//if (reans.status == 404) view.status = 404


	
	

	return view.ret()
})

rest.addResponse('get-group-head', async view => {
	const group = await view.get('group#required')
	const image_src = await view.get('image_src')
	const head = await Shop.getGroupHead(group, view.vistor, image_src)
	return head
})
rest.addResponse('get-group-sitemap', async view => {
	const db = await view.get('db')
	const root = await view.get('root#required')
	const image_src = await view.get('image_src')
	const conf = await config('shop')
	const childs = {}
	const root_path = conf.root_path.slice(1)
	
	await Shop.runGroupDown(db, root.group_id, async group => {
		const path = [root_path, 'group', group.group_nick].join('/')
		childs[path] = await Shop.getGroupHead(group, view.vistor, image_src)
	})
	
	const title = 'Группы';
	const nick = nicked(title)
	view.data.headings = {
		[nick]: { title, items:childs }
	}
	return view.ret()
})
rest.addResponse('get-item-head', async view => {
	const model = await view.get('model#required')
	const art = await view.get('art')
	const db = await view.get('db')
	const item = model.items.find(item => item.art[0] == art) || model.items[0]	

	return Shop.getItemHead(db, item)
})
rest.addResponse('get-item-sitemap', async view => {
	const db = await view.get('db')
	const root = await view.get('root#required')
	const conf = await config('shop')

	const md = await Shop.getmd(db, '', '', [])
	const {count, list} = await Shop.getPlopsWithPropsNoMultiByMd(db, root.group_id, md, false, {
		limit: false,
		rand: false,
		nicks:['art','brendmodel'],
		titles:['opisanie','brend','art','model','naimenovanie', 'images']
	})
//MRL LED 1125 дымчатый
	const childs = {}
	const root_path = conf.root_path.slice(1)
	for (const plop of list) {
		const path = [root_path, 'item', plop.brendmodel_nick, plop.art_nick].join('/')
		childs[path] = await Shop.getPlopHead(plop)
	}	
	const title = 'Позиции';
	const nick = nicked(title)
	view.data.headings = {
		[nick]: { title, items:childs }
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

const getItem = (data, env) => {
	const model = data.model
	const art = env.crumb.child?.name || ''
	return model.items.find(item => item.art == art) || model.items[0]
}
rest.addResponse('get-item-check', async (view) => {
	const art = await view.get('art')
	const conf = await config('shop', true)
	const model = view.data.model = await view.get('model#required')
	const item = model.items.find(item => item.art[0] == art)
	if (!item) {
		const item = model.items[0]
		view.data.redirect = `${conf.root_path}/item/${item.brendmodel[0]}/${item.art[0]}`
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
	

	//const groups = view.data.groups = await Shop.getLastGroupNicksByItem(db, model.recap)

	
	const groups = view.data.groups = {}
	for (const group_nick of model.groups) {
		groups[group_nick] = await Shop.getGroupByNick(db, group_nick)
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
	
	const group = view.data.group = await view.get('group#required') //depricated
	const group_nick = view.data.group_nick = await view.get('group_nick#required')

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
	

	const total = await Shop.getModcount(db, md, partner, group.group_id)

	const propsoncards = await db.colAll(`select prop_nick from shop_cards`)
	const props = unique([
		'art',
		'brendart',
		'brendmodel',
		'brend',
		'model',
		'naimenovanie',
		'images',
		'staraya-cena',
		'cena',
		...propsoncards
	])
	
	const list = await Shop.getModelsByItems(db, moditem_ids, partner, props)


	let last = total <= countonpage ? 1 : Math.ceil(total / countonpage)
	const pagination = {
		last: last,
		page: last < p ? last + 1 : p
	}
	const res = { list, pagination, count:total, countonpage }
	Object.assign(view.data, res)
	if (!list.length) view.status = 404

	await Shop.prepareModelsPropsValuesGroups(db, view.data, list)
	view.data.groups[group_nick] = await Shop.getGroupByNick(db, group_nick)
	
	return view.ret()
})

rest.addResponse('get-livemodels', async (view) => {
	const db = await view.get('db')
	const query = await view.get('query')
	const hashs = await view.get('hashs')
	const md = await Shop.getmd(db, '', query, hashs)

	const conf = view.data.conf = await config('shop', true)
	
	const partner = await view.get('partner')
	const root = await view.get('root#required')
	

	//-------------
	const bind = await Shop.getBind(db)
	const samples = await Shop.getSamplesUpByGroupId(db, root.group_id)
	const marked_samples = Shop.addSamples(samples, [md.mget])

	const {from, join, where, sort} = await Shop.getWhereBySamples(db, marked_samples, md.hashs, partner)


	const countonpage = 12
	
	
	const moditem_ids = await db.all(`
		SELECT wva.value_id, GROUP_CONCAT(win.key_id separator ',') as key_ids 
		FROM ${from.join(', ')} ${join.join(' ')}
		WHERE ${where.join(' and ')}
		GROUP BY wva.value_id 
		ORDER BY RAND()
		LIMIT ${countonpage}
	`, bind)
	

	const count = await Shop.getModcount(db, md, partner, root.group_id)

	const props = [
		'art',
		'brendart',
		'brendmodel',
		'brend',
		'model',
		'naimenovanie',
		'images',
		'staraya-cena',
		'cena'
	]
	const list = await Shop.getModelsByItems(db, moditem_ids, partner, props)

	await Shop.prepareModelsPropsValuesGroups(db, view.data, list)
	view.data.groups[root.group_nick] = root
	//----------------

	
	// const {list, count} = await Shop.getPlopsWithPropsNoMultiByMd(db, root.group_id, md, partner, {
	// 	limit: 12,
	// 	rand: true,
	// 	nicks:['art','brendmodel'],
	// 	titles:['brend','model','art','naimenovanie','images','cena']
	// })






	view.data.count = count
	view.data.list = list
	if (!list.length) view.status = 404

	// const group_nicks = []
	// for (const model of list) {
	// 	group_nicks.push(...model.groups)
	// }

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
		view.data.childs = childs.map(group => {
			view.data.groups[group.group_nick] = group
			return group.group_nick
		})
	} else {
		view.data.childs = []
	}

	const reduce = (keys, props) => {
		for (const nick in keys) {
			const obj = keys[nick]
			const nobj = {}
		 	for (const name of props) nobj[name] = obj[name]
		 	keys[nick] = nobj
		}
		
	}
	reduce(view.data.groups, ['group_nick', 'group_title'])
	reduce(view.data.props, ['prop_title', 'type'])
	reduce(view.data.values, ['value_title'])


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



// rest.addResponse('get-livemodels', async (view) => {
// 	const db = await view.get('db')
// 	const query = await view.get('query')
// 	const hashs = await view.get('hashs')
// 	const md = await Shop.getmd(db, '', query, hashs)

// 	const conf = view.data.conf = await config('shop', true)
	
// 	const partner = await view.get('partner')
// 	const root = await view.get('root#required')
	
	
// 	const {list, count} = await Shop.getPlopsWithPropsNoMultiByMd(db, root.group_id, md, partner, {
// 		limit: 12,
// 		rand: true,
// 		nicks:['art','brendmodel'],
// 		titles:['brend','model','art','naimenovanie','images','cena']
// 	})

// 	view.data.count = count
// 	view.data.list = list
// 	if (!list.length) view.status = 404

// 	const group_ids = await Shop.getGroupIdsBymd(db, root.group_id, md, partner) //Все группы в которые входят позиции, которые соответсвуют поиску md.hashs	
// 	let rootpath = false //Путь до последней общей группы найденных
// 	let all = [] //Список все групп вместе с родителями
// 	for (const group_id of group_ids) {
// 		const path = []
// 		await Shop.runGroupUp(db, group_id, group => {
// 			path.unshift(group.group_id)
// 			if (group === root) return false
// 		})
// 		if (!rootpath) rootpath = path
// 		rootpath = rootpath.filter(id => ~path.indexOf(id))
// 		all.push(...path)
// 	}
// 	all = unique(all)

// 	view.data.gcount = group_ids.length
// 	if (group_ids.length) {
// 		const group = await Shop.getGroupById(db, rootpath.pop()) //общий родитель
// 		let childs = group.childs.filter(id => ~all.indexOf(id))
// 		if (!childs.length) {
// 			childs = [group]
// 		} else {
// 			for (const i in childs) {
// 				const group_id = childs[i]
// 				childs[i] = await Shop.getGroupById(db, group_id)
// 			}
// 		}
// 		const groups = view.data.groups = childs.map(group => {
// 			const g = {}
// 			for (const prop of ['group_nick','group_title']) g[prop] = group[prop]
// 			return g
// 		})
		
// 	} else {
// 		view.data.groups = []
// 	}



// 	return view.ret()
// })



