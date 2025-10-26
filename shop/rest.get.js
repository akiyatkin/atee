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


rest.addResponse('get-partner', async view => {
	const partner = view.data.partner = await view.get('partner')
	const conf = view.data.conf = await config('shop', true)
	if (!partner) return view.err()
	return view.ret()
})
rest.addResponse('get-conf', async view => {
	const conf = view.data.conf = await config('shop', true)
	return view.ret()
})
rest.addResponse('get-filter-prop-more-search', async view => {
	const db = await view.get('db')	
	
	const hashs = await view.get('hashs')

	const prop = await view.get('prop')
	if (!~['more','column',].indexOf(prop.known)) return view.err('Нет доступа к свойству', 403)
	if (!~['value','text','date','number',].indexOf(prop.type)) return view.err('Нет доступа к свойству', 403)
	const prop_id = prop?.prop_id
	
	const {group_id} = await view.get('group#required')
	
	const bind = await Shop.getBind(db)
	//const {from, join, where, sort, bind} = await Shop.getWhereByGroupId(db, group_id || false,[], false, true)
	
	let list = []
	if (prop.type == 'value') {
		list = await db.all(`
			WITH RECURSIVE group_tree AS (
				SELECT ${group_id} as group_id
				UNION ALL
				SELECT sg.group_id
				FROM shop_groups sg, group_tree gt 
				WHERE sg.parent_id = gt.group_id
			)
			SELECT distinct va.value_title, va.value_nick as nick
			FROM group_tree gt, shop_itemgroups ig, sources_wvalues wva, sources_values va
			WHERE 
				ig.group_id = gt.group_id
				and wva.key_id = ig.key_id
				and wva.entity_id = ${bind.brendart_prop_id}
				and wva.prop_id = ${prop_id}
				and va.value_id = wva.value_id
				and (${hashs.map(hash => 'va.value_nick like "%' + hash.join('%" and va.value_nick like "%') + '%"').join(' or ') || '1 = 1'})
			ORDER BY RAND()
			LIMIT 12
		`)

		
	} else if (prop.type == 'number') {
		list = await db.all(`
			WITH RECURSIVE group_tree AS (
				SELECT ${group_id} as group_id
				UNION ALL
				SELECT sg.group_id
				FROM shop_groups sg, group_tree gt 
				WHERE sg.parent_id = gt.group_id
			)
			SELECT distinct wn.number as nick
			FROM group_tree gt, shop_itemgroups ig, sources_wnumbers wn
			WHERE 
				ig.group_id = gt.group_id
				and wn.key_id = ig.key_id
				and wn.entity_id = ${bind.brendart_prop_id}
				and wn.prop_id = ${prop_id}
				and (${hashs.map(hash => 'wn.number like "%' + hash.join('%" and wn.number like "%') + '%"').join(' or ') || '1 = 1'})
			ORDER BY RAND()
			LIMIT 12
		`)
	}
	view.ans.list = list.map(row => {
		row['left'] = row.value_title || row.nick
		row['right'] = ''
		return row
	})
	
		
	// view.ans.list.push({
	// 	spec: 'any',
	// 	left: '<i>Любое значение</i>',
	// 	right: ''
	// })
	// view.ans.list.push({
	// 	spec: 'empty',
	// 	left: '<i>Без значения</i>',
	// 	right: ''
	// })
	
	
	return view.ret()
})
rest.addResponse('get-search-filters', async view => {

	
	const md = view.data.md = await view.get('md')

	const partner = await view.get('partner')
	const conf = view.data.conf = await config('shop', true)
	const group = view.data.group = await view.get('group#required')

	const db = await view.get('db')

	
	const filters = view.data.filters = []
	
	

	for (const prop_nick of group.filters) {
		const filter = await Shop.getFilterConf(db, prop_nick, group, md, partner)
		if (!filter) continue
		filters.push(filter)
	}
	


	for (const prop_nick in md.mget) {
	 	if (~group.filters.indexOf(prop_nick)) continue
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
	const head = await Shop.getGroupHead(group, view.vistor)
	return head
})
rest.addResponse('get-group-sitemap', async view => {
	const db = await view.get('db')
	const root = await view.get('root#required')
	const conf = await config('shop')
	const childs = {}
	const root_path = conf.root_path.slice(1)
	await Shop.runGroupDown(db, root.group_id, async group => {
		const path = [root_path, 'group', group.group_nick].join('/')
		childs[path] = await Shop.getGroupHead(group, view.vistor)
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
	const item = model.items.find(item => item.art?.[0] == art || item.brendart[0] == art) || model.items[0]	

	return Shop.getItemHead(db, item)
})
rest.addResponse('get-item-sitemap', async view => {
	const db = await view.get('db')
	const root = await view.get('root#required')
	const conf = await config('shop')

	const md = await Shop.getmd(db, '', '', [])
	
	console.time('Shop.getPlopsWithPropsNoMultiByMd')
	const {count, list} = await Shop.getPlopsWithPropsNoMultiByMd(db, root.group_id, [md.mget], md.hashs, false, {
		limit: false,
		rand: false,
		nicks:['art'], //brendmodel_nick, brendart_nick есть всегда
		titles:['brendart','brendmodel', 'opisanie','brend','art','model','naimenovanie', 'images']
	})
	console.timeEnd('Shop.getPlopsWithPropsNoMultiByMd')

	//MRL LED 1125 дымчатый
	const childs = {}
	const root_path = conf.root_path.slice(1)
	for (const plop of list) {
		const path = [root_path, 'item', plop.brendmodel_nick, plop.art_nick || plop.brendmodel_nick].join('/')
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
	const bind = await Shop.getBind(db)
	const childs = view.data.childs = await Shop.getGroupFilterChilds(db, group.group_id)

	const modcounts = view.data.modcounts = {}
	for (const group_nick of childs) {
		//modcounts[group_nick] = await Shop.getModcount(db, [md.mget], md.hashs, group_nick, partner)
		const group_id = await Shop.getGroupIdByNick(db, group_nick)
		const {from, join, where, sort} = await Shop.getWhereByGroupIndexWinMod(db, group_id, [md.mget], md.hashs, partner)		
		modcounts[group_nick] = await db.col(`
			SELECT count(distinct win.value_id)
			FROM ${from.join(', ')} ${join.join(' ')}
			WHERE ${where.join(' and ')}
		`, {group_id, ...bind})
	}
	const groups = view.data.groups = {}
	for (const group_nick of childs) {
	 	groups[group_nick] = await Shop.getGroupByNick(db, group_nick)
	}
	Shop.reduce(groups, ['group_title'])

	return view.ret()
})

const getItem = (data, env) => {
	const model = data.model
	const art = env.crumb.child?.name || ''
	return model.items.find(item => item.art == art) || model.items[0]
}
rest.addResponse('get-item-check', async (view) => {
	const art = await view.get('art')
	const search = await view.get('search')	
	const conf = await config('shop', true)
	const model = view.data.model = await view.get('model#required')

	const item = model.items.find(item => item.art?.[0] == art || item.brendart[0] == art)
	
	if (!item) {
		const item = model.items[0]
		view.data.redirect = `${conf.root_path}/item/${item.brendmodel[0]}/${item.art?.[0] || item.brendart[0]}${search ? '?' + search : ''}`
		console.log('redirect', view.data.redirect)
	}

	// const single = model.recap.brendmodel[0] == model.recap.brendart[0]
	// if ((!item && !single) || (single && art)) {
	// 	const item = model.items[0]
	// 	if (single) { //Распространённая ситуация
	// 		view.data.redirect = `${conf.root_path}/item/${item.brendmodel[0]}${search ? '?' + search : ''}`
	// 	} else {
	// 		view.data.redirect = `${conf.root_path}/item/${item.brendmodel[0]}/${item.art?.[0] || item.brendart[0]}${search ? '?' + search : ''}`
	// 	}
	// 	console.log('redirect', view.data.redirect)
	// }
	return view.ret()
})



rest.addResponse('get-model', async (view) => {
	const db = await view.get('db')
	const conf = view.data.conf = await config('shop', true)
	const root = view.data.root = await view.get('root#required')
	

	const partner = await view.get('partner')
	view.data.partner = partner.key

	const model = view.data.model = await view.get('model#required')	
	

	//const groups = view.data.groups = await Shop.samples.getFreeGroupNicksByItem(db, model.recap)

	
	const groups = view.data.groups = {}
	for (const group_nick of model.group_nicks) {
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
	const group = view.data.group = await view.get('group#required')
	const group_nick = view.data.group_nick = await view.get('group_nick#required')

	const db = await view.get('db')
	const partner = await view.get('partner')

	let p = await view.get('p')
	const count = await view.get('count')
	
	const bind = await Shop.getBind(db)
	
	//const group_ids = await Shop.getAllGroupIds(db, group.group_id)
	
	const {from, join, where, sort, sortsel} = await Shop.getWhereByGroupIndexSort(db, group.group_id, [md.mget], md.hashs, partner)
	

	const modcount = await db.col(`
		SELECT count(distinct win.value_id)
		FROM ${from.join(', ')} ${join.join(' ')}
		WHERE ${where.join(' and ')}
	`, {group_id: group.group_id, ...bind})
	//const modcount = moditem_ids[0]?.total_rows || 0
	//const modcount = await Shop.getModcount(db, md, partner, group_nick)


	const countonpage = count || conf.limit
	


	let last = modcount <= countonpage ? 1 : Math.ceil(modcount / countonpage)
	if (p > last) p = last
	const pagination = {
		last: last,
		page: last < p ? last + 1 : p
	}
	const start = (p - 1) * countonpage

	const moditem_ids = await db.all(`
		SELECT 
			win.value_id, 
			GROUP_CONCAT(win.key_id separator ',') as key_ids
			${sortsel.length ? ',' + sortsel.join(', ') : ''}
		FROM ${from.join(', ')} ${join.join(' ')}
		WHERE ${where.join(' and ')}
		GROUP BY win.value_id 
		ORDER BY ${sort.join(',')}
		LIMIT ${start}, ${countonpage}
	`, {group_id: group.group_id, ...bind})

	// console.log({group_id: group.group_id, ...bind}, `
	// 	SELECT 
	// 		win.value_id, 
	// 		GROUP_CONCAT(win.key_id separator ',') as key_ids 
	// 	FROM ${from.join(', ')} ${join.join(' ')}
	// 	WHERE ${where.join(' and ')}
	// 	GROUP BY win.value_id 
	// 	ORDER BY ${sort.join(',')}
	// 	LIMIT ${start}, ${countonpage}
	// `)
	//const propsoncards = await db.colAll(`select prop_nick from shop_cards`)
	const props = unique([
		'art',
		'brendart',
		'brendmodel',
		'brend',
		'model',
		'naimenovanie',
		'images',
		'nalichie',
		'staraya-cena',
		'cena',
		...group.card_nicks
	])

	const list = await Shop.getModelsByItems(db, moditem_ids, partner, props)

	const res = { list, pagination, modcount, countonpage }
	Object.assign(view.data, res)
	if (!list.length) view.status = 404



	await Shop.prepareModelsPropsValuesGroups(db, view.data, list)
	
	view.data.groups = {}
	view.data.groups[group_nick] = await Shop.getGroupByNick(db, group_nick)


	view.data.filtercost = await (async () => {
		if (!~group.filter_nicks.indexOf('cena')) return {max:0, min:0}
		const withoutcostget = {...md.mget}
		delete withoutcostget.cena
		const {from, join, where, sort} = await Shop.getWhereByGroupIndexWin(db, group.group_id, [withoutcostget], md.hashs, partner, 'sources_wnumbers')
		const prop = await Shop.getPropByNick(db, 'cena')
		if (!prop) return {max:0, min:0}
		const row = await db.fetch(`
			SELECT max(win.number) as max, min(win.number) as min
			FROM ${from.join(', ')} ${join.join(' ')}
			WHERE ${where.join(' and ')}
			and win.prop_id = ${prop.prop_id}
		`) 
		// row.max = Number(row.max)
		// row.min = Number(row.min)
		return row
	})();
	
	Shop.reduce(view.data.groups, ['group_title','category', 'filter_nicks'])
	Shop.reduce(view.data.values, ['value_title'])
	Shop.reduce(view.data.props, ['prop_title','card_tpl','name','unit','scale','type'])


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
	

	const bind = await Shop.getBind(db)
	const {from, join, where} = await Shop.getWhereByGroupIndexWinMod(db, root.group_id, [md.mget], md.hashs, partner)

	const countonpage = 12
	
	
	const moditem_ids = await db.all(`
		SELECT win.value_id, GROUP_CONCAT(win.key_id separator ',') as key_ids
		FROM ${from.join(', ')} ${join.join(' ')}
		WHERE ${where.join(' and ')}
		GROUP BY win.value_id 
		ORDER BY RAND()
		LIMIT ${countonpage}
	`, {group_id: root.group_id, ...bind})
	
	const count = await db.col(`
		SELECT count(distinct win.value_id)
		FROM ${from.join(', ')} ${join.join(' ')}
		WHERE ${where.join(' and ')}
	`, {group_id: root.group_id, ...bind})

	const group_ids = await db.colAll(`
		SELECT distinct ig.group_id
		FROM ${from.join(', ')} ${join.join(' ')}
		WHERE ${where.join(' and ')}
	`, {group_id: root.group_id, ...bind})
	
	//const count = await Shop.getModcount(db, md, partner, root.group_nick)

	const props = [
		// 'brend',
		// 'model',
		// 'images',
		// 'nalichie',
		// 'staraya-cena',
		'art', //ссылка на позицию
		'brendmodel', //если нет наименования
		'naimenovanie', //главная строка в списке поиска
		'brendart', //если нет art то используется в ссылке
		'cena'
	]
		
	const list = await Shop.getModelsByItems(db, moditem_ids, partner, props)

	await Shop.prepareModelsPropsValuesGroups(db, view.data, list)

	view.data.groups = {}
	view.data.groups[root.group_nick] = root
	
	view.data.count = count
	view.data.list = list
	if (!list.length) view.status = 404

	//const group_ids = await Shop.getGroupIdsBymd(db, root.group_id, md, partner) //Все группы в которые входят позиции, которые соответсвуют поиску md.hashs	
	let rootpath = false //Путь до последней общей группы найденных
	let all = [] //Список все групп вместе с родителями
	for (const group_id of group_ids) {
		const path = []
		await Shop.runGroupUp(db, group_id, group => {
			path.unshift(group.group_nick)
			if (group === root) return false
		})
		if (!rootpath) rootpath = path
		rootpath = rootpath.filter(group_nick => ~path.indexOf(group_nick))
		all.push(...path)
	}
	all = unique(all)

	view.data.gcount = group_ids.length
	if (group_ids.length) {
		const group = await Shop.getGroupByNick(db, rootpath.pop()) //общий родитель
		let childs = group.childs.filter(group_nick => ~all.indexOf(group_nick))
		if (!childs.length) {
			childs = [group]
		} else {
			for (const i in childs) {
				const group_nick = childs[i]
				childs[i] = await Shop.getGroupByNick(db, group_nick)
			}
		}
		view.data.childs = childs.map(group => {
			view.data.groups[group.group_nick] = group
			return group.group_nick
		})
	} else {
		view.data.childs = []
	}

	
	Shop.reduce(view.data.groups, ['group_nick', 'group_title'])
	Shop.reduce(view.data.props, ['prop_title', 'type'])
	Shop.reduce(view.data.values, ['value_title'])

	return view.ret()
})


