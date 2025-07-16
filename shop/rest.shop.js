import nicked from '/-nicked'
import Shop from "/-shop/api/Shop.js"
import User from "/-user/User.js"
import config from "/-config"

import Rest from "/-rest"
import unique from "/-nicked/unique.js"

const rest = new Rest()
export default rest

import rest_funcs from '/-rest/rest.funcs.js'
rest.extra(rest_funcs)

import rest_db from '/-db/rest.db.js'
rest.extra(rest_db)

import rest_admin from '/-controller/rest.admin.js'
rest.extra(rest_admin)

import rest_search from "/-dialog/search/rest.search.js" //аргументы hashs, hash, search 
rest.extra(rest_search)

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


rest.addArgument('p', ['int'], (view, n) => n || 1)
rest.addArgument('count', ['int'])


rest.addArgument('group_id', ['mint'])
rest.addVariable('group_id#required', ['group_id','required'])



rest.addArgument('group_nick', ['nicked'])
rest.addVariable('group', ['group_nick','null'], async (view, group_nick) => {
	if (group_nick == null) return null
	const db = await view.get('db')
	const group_id = await Shop.getGroupIdByNick(db, group_nick)
	const group = await Shop.getGroupById(db, group_id)
	if (!group) return view.err('Группа не найдена', 404)
	return group
})
rest.addVariable('group_nick#required', ['group_nick', 'required'])
rest.addVariable('group#required', ['group', 'required'])

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



// rest.addArgument('search', ['string']) //Строка поиска
// rest.addVariable('hashs', ['search'], (view, hashs) => {
// 	hashs = hashs.split(',').map(hash => unique(nicked(hash).split('-')).filter(r => r).sort()).filter(r => r.length)
// 	return hashs
// })



rest.addArgument('partner', async (view, partner_nick) => {
	const conf = await config('shop')
	const data = conf.partners[partner_nick]
	if (!data) return false
	data.key = partner_nick
	return data
})
rest.addArgument('m', (view, m) => {
	if (m) view.nostore = true //безчисленное количество комбинаций, браузеру не нужно запоминать	
	return m || ''
})

rest.addVariable('md', async (view) => {
	const db = await view.get('db')
	const origm = await view.get('m')
	const group = await view.get('group#required')
	const md = await Shop.getmd(db, origm, group)
	return md
})