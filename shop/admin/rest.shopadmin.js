import Rest from "/-rest"
import Shop from "/-shop/Shop.js"

const rest = new Rest()
export default rest

import rest_shop from '/-shop/rest.shop.js'
rest.extra(rest_shop)

import rest_admin from '/-controller/rest.admin.js'
rest.extra(rest_admin)

import rest_funcs from '/-rest/rest.funcs.js'
rest.extra(rest_funcs)

import rest_db from '/-db/rest.db.js'
rest.extra(rest_db)

import rest_search from "/-dialog/search/rest.search.js" //аргументы hashs, hash, search 
rest.extra(rest_search)

rest.exporttables = [
	'shop_cards', 'shop_filters','shop_groups', 'shop_props', 'shop_sampleprops', 'shop_samples', 'shop_samplevalues',
	'sources_custom_cells',
	'sources_custom_cols',
	'sources_custom_rows',
	'sources_custom_sheets',
	'sources_custom_values',
	'sources_sources',
	'sources_props',
	'sources_synonyms'
]

rest.addArgument('json', ['string'])

rest.addArgument('group_title', ['string'])


rest.addArgument('sub', ['string'])
rest.addVariable('sub#required',['sub','required'])


rest.addArgument('next_nick', ['nicked'])
rest.addArgument('prop_nick', ['nicked'])
rest.addVariable('prop', ['prop_nick','null'], async (view, prop_nick) => {
	if (prop_nick == null) return null
	const db = await view.get('db')
	const prop = await Shop.getPropByNick(db, prop_nick)
	if (!prop) return null
	return prop
})
rest.addVariable('prop_nick#required', ['prop_nick', 'required'])
rest.addVariable('prop#required', ['prop', 'required'])


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