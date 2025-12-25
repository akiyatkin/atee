import Rest from "@atee/rest"
import Shop from "/-shop/Shop.js"

const rest = new Rest()
export default rest

// import rest_shop from '/-shop/rest.shop.js'
// rest.extra(rest_shop)

import rest_admin from '/-controller/rest.admin.js'
rest.extra(rest_admin)

import rest_funcs from '/-rest/rest.funcs.js'
rest.extra(rest_funcs)

import rest_db from '/-db/rest.db.js'
rest.extra(rest_db)

import rest_search from "/-dialog/search/rest.search.js" //аргументы hashs, hash, search 
rest.extra(rest_search)


rest.addArgument('description', ['string'])
rest.addArgument('image_src', ['string'])

rest.addArgument('comment', ['string'])
rest.addVariable('comment#required', ['comment', 'required'])


rest.addArgument('nicks', ['array'])
rest.addVariable('nicks#required', ['nicks'], (view, nicks) => {
	if (!nicks.length) return view.err('Требуется указать nicks')
	return nicks
})

rest.addArgument('count', ['int'])
rest.addArgument('nick', ['nicked'])
rest.addArgument('detail', ['nicked'])

rest.addArgument('prop_nick', ['nicked'], async (view, prop_nick) => {
	if (!prop_nick) return null
	// const db = await view.get('db')
	// const prop = await Shop.getPropByNick(db, prop_nick)
	// if (!prop) return view.err('Свойство не найдено', 404)	
	return prop_nick

})
rest.addVariable('prop', async (view) => {
	const group_nick = await view.get('prop_nick#required')
	const db = await view.get('db')
	const prop = await Shop.getPropByNick(db, group_nick)
	return prop
})
rest.addVariable('prop_nick#required', ['prop_nick', 'required'])
rest.addVariable('prop#required', ['prop', 'required'])

rest.addArgument('partner', async (view, key) => {
	if (!key) return false
	const partner = await Shop.getPartnerByKey(key)
	return partner
})
rest.addArgument('m', (view, m) => {
	if (m) view.nostore = true //безчисленное количество комбинаций, браузеру не нужно запоминать	
	return m || ''
})

rest.addArgument('group_nick', ['nicked'], async (view, group_nick) => {
	if (!group_nick) return null
	const db = await view.get('db')
	const group_id = await Shop.getGroupIdByNick(db, group_nick)
	if (!group_id) return view.err('Группа не найдена', 404)
	return group_nick
})
rest.addVariable('group_nick#required', ['group_nick', 'required'])
rest.addVariable('group#required', ['group', 'required'])
rest.addVariable('group', async (view) => {
	const group_nick = await view.get('group_nick')
	const db = await view.get('db')
	const group_id = await Shop.getGroupIdByNick(db, group_nick)
	const group = await Shop.getGroupById(db, group_id)	
	if (!group) return null
	return group
})

rest.addArgument('brand_nick', ['string'], async (view, brand_nick) => {	
	if (!brand_nick) return null
	const db = await view.get('db')
	const value = await Shop.getValueByNick(db, brand_nick)
	if (!value) return view.err('Не найден бренд')
	return brand_nick
})
rest.addVariable('brand_nick#required', ['brand_nick','required'])

rest.addArgument('source_id', ['mint'], async (view, source_id) => {
	if (!source_id) return null
	const db = await view.get('db')
	source_id = await db.col(`select source_id from sources_sources where source_id = :source_id`, {source_id})
	if (!source_id) return view.err('Не найден источник')
	return source_id
})
rest.addVariable('source_id#required', ['source_id','required'])

rest.addArgument('group_id', ['mint'], async (view, group_id) => {
	if (!group_id) return null
	const db = await view.get('db')
	const group = await Shop.getGroupById(db, group_id)
	if (!group) return view.err('Не найдена группа')
	return group_id
})
rest.addVariable('group_id#required', ['group_id','required'])

rest.addArgument('json', ['string'])
rest.addVariable('json#required', ['json','required'])
rest.exporttables = [
	'shop_cards', 
	'shop_filters',
	'shop_groups', 
	'shop_props', 
	'shop_sampleprops', 
	'shop_samples', 
	'shop_samplevalues'
]
rest.TABLES = [
	'shop_actives',
	'shop_allitemgroups',
	'shop_basket',
	'shop_cards',
	'shop_filters',
	'shop_groups',
	'shop_itemgroups',
	'shop_orders',
	'shop_props',
	'shop_sampleprops',
	'shop_samples',
	'shop_samplevalues',
	'shop_stat',
	'shop_stat_brands',
	'shop_stat_groups',
	'shop_stat_groups_brands',
	'shop_stat_groups_sources',
	'shop_stat_sources',
	'shop_transports',
	'shop_userorders'
]


rest.addArgument('group_title', ['string'])


rest.addArgument('sub', ['string'])
rest.addVariable('sub#required',['sub','required'])


rest.addArgument('next_nick', ['nicked'])
rest.addArgument('next_nick#required', ['next_nick','required'])
// rest.addArgument('prop_nick', ['nicked'])
// rest.addVariable('prop', ['prop_nick','null'], async (view, prop_nick) => {
// 	if (prop_nick == null) return null
// 	const db = await view.get('db')
// 	const prop = await Shop.getPropByNick(db, prop_nick)
// 	if (!prop) return null
// 	return prop
// })
// rest.addVariable('prop_nick#required', ['prop_nick', 'required'])
// rest.addVariable('prop#required', ['prop', 'required'])


rest.addArgument('value_nick', ['nicked'])
rest.addVariable('value', ['value_nick','null'], async (view, value_nick) => {
	if (value_nick == null) return null
	const db = await view.get('db')
	const value = await Shop.getValueByNick(db, value_nick)
	if (!value) return view.err('Значение не найдено', 404)
	return value
})
rest.addVariable('value_nick#required', ['value_nick', 'required'])
rest.addVariable('value#required', ['value', 'required'])



rest.addArgument('next_id', ['mint'])
rest.addArgument('id', ['mint'])
rest.addVariable('id#required', ['id', 'required'])
rest.addArgument('sample_id', ['sint'])
rest.addVariable('sample_id#required', ['sample_id', 'required'])

rest.addArgument('spec', (view, val) => {
	if (!val) return val
	if (!~['exactly','any','empty'].indexOf(val)) return view.err('Некорректный spec')
	return val
})
rest.addVariable('spec#required',['spec','required'])

rest.addArgument('type', (view, val) => {
	if (!val) return val
	if (!~['sampleprop','samplevalue','sample','card','filter'].indexOf(val)) return view.err('Некорректный type')
	return val
})
rest.addVariable('type#required',['type','required'])


rest.addArgument('bit', ['int'], (view, value) => {
		if (value == null) return null
		return value ? 1 : 0
})
rest.addVariable('bit#required', ['bit','required'])




// rest.addArgument('group_id', ['mint'])
// rest.addVariable('group_id#required', ['group_id', 'required'])