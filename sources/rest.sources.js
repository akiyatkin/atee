import nicked from '/-nicked'
import fs from "fs/promises"
import Rest from "/-rest"
import config from '/-config'
import Sources from "/-sources/Sources.js"

const rest = new Rest()

import rest_db from '/-db/rest.db.js'
rest.extra(rest_db)

import rest_funcs from '/-rest/rest.funcs.js'
rest.extra(rest_funcs)
rest.addArgument('go', (view, e) => e || false) //Ссылка куда перейти. Как есть попадает в заголовок Location 301
rest.addArgument('multi', ['sint'], (view, multi) => {
	if (multi == null) return multi
	if (multi) return 1
	else return 0
})
rest.addVariable('multi#required', ['multi', 'required'])

rest.addArgument('value', ['string'])
rest.addArgument('bit', ['int'], (view, value) => {
		if (value == null) return null
		return value ? 1 : 0
})
rest.addVariable('bit#required', ['bit','required'])


rest.addArgument('id', ['mint'])
rest.addVariable('id#required', ['id', 'required'])

rest.addArgument('sheet_index', ['null', 'mint'])
rest.addVariable('sheet_index#required', ['sheet_index', 'required'])
rest.addVariable('sheet_index#orNull', async (view) => {
	const source_id = await view.get('source_id#required')
	const sheet_index = await view.get('sheet_index')
	if (sheet_index === null) return null
	const db = await view.get('db')
	const is = await db.col('select source_id from sources_sheets where source_id=:source_id and sheet_index=:sheet_index', {source_id, sheet_index})
	if (!is) return null
	return sheet_index
})



rest.addArgument('limit', ['mint'])

rest.addArgument('repeat_index', ['mint'])
rest.addVariable('repeat_index#required', ['repeat_index', 'required'])
rest.addArgument('col_index', ['sint'])
rest.addVariable('col_index#required', ['col_index', 'required'])
rest.addArgument('multi_index', ['sint'])
rest.addVariable('multi_index#required', ['multi_index', 'required'])

rest.addArgument('row_index', ['mint'])
rest.addVariable('row_index#required', ['row_index', 'required'])

rest.addArgument('next_id', ['mint'])
rest.addArgument('old_id', ['mint'])
rest.addVariable('old_id#required', ['old_id', 'required'])
rest.addArgument('sourceprop', (view, prop) => {
	if (~['renovate','master'].indexOf(prop)) return prop
	return null
})
rest.addVariable('sourceprop#required', ['sourceprop', 'required'])
rest.addArgument('custom', (view, prop) => {
	if (~['col','row','cell','prop','item', 'value', 'sheet'].indexOf(prop)) return prop
	return null
})
rest.addVariable('custom#required', ['custom', 'required'])
rest.addArgument('propprop', (view, prop) => {
	if (~['multi'].indexOf(prop)) return prop
	return null
})
rest.addVariable('propprop#required', ['propprop', 'required'])
rest.addArgument('keyfilter', (view, prop) => {
	if (~['appear','all','yes','not','pruning','unknown'].indexOf(prop)) return prop
	return 'appear'
})
rest.addVariable('keyfilter#required', ['keyfilter', 'required'])
rest.addVariable('keyfilter#appear', ['keyfilter'])

rest.addArgument('appear', (view, date) => {
	if (!date) return null
	if (date > 2147483647) date = 2147483647
	try {
		return Math.round(new Date(parseInt(date)).getTime())
	} catch (e) {
		return null
	}
})


rest.addArgument('known', (view, type) => {
	if (~['system','more','column'].indexOf(type)) return type
	return null
})
rest.addVariable('known#required', ['known', 'required'])

rest.addArgument('scale', ['tint#unsigned'])
rest.addVariable('scale#required', ['scale', 'required'])

rest.addArgument('type', (view, type) => {
	if (~['date','text','value','number'].indexOf(type)) return type
	return null
})
rest.addVariable('type#required', ['type', 'required'])






rest.addArgument('date', (view, date) => {
	if (!date) return null
	try {
		const d = new Date(date)
		//d.setHours(0)
		return Math.round(d.getTime() / 1000)
	} catch (e) {
		return null
	}

})
rest.addArgument('title', ['escape'])
rest.addVariable('title#required', ['title', 'required'])

rest.addArgument('sheet_title',['null'])
rest.addVariable('sheet_title#required', ['sheet_title', 'required'])

rest.addArgument('col_title',['null'])
rest.addVariable('col_title#required', ['col_title', 'required'])

rest.addArgument('col_nick', ['nicked','null'])
rest.addVariable('col_nick#required', ['col_nick', 'required'])

rest.addArgument('comment', ['string'])
rest.addArgument('source_id', ['sint'], async (view, source_id) => {
	if (!source_id) return null
	const db = await view.get('db')
	source_id = await db.col('select source_id from sources_sources where source_id=:source_id', {source_id})
	if (!source_id) return view.err('Источник не найден', 404)
	return source_id
})
rest.addArgument('key_id', ['mint'], async (view, key_id) => {
	if (!key_id) return null
	const db = await view.get('db')
	key_id = await db.col('select value_id from sources_values where value_id=:key_id', {key_id})
	if (!key_id) return view.err('Ключ не найден', 404)
	return key_id
})
rest.addArgument('value_id', ['mint'], async (view, value_id) => {
	if (!value_id) return null
	const db = await view.get('db')
	value_id = await db.col('select value_id from sources_values where value_id=:value_id', {value_id})
	if (!value_id) return view.err('Значение не найдено', 404)
	return value_id
})
rest.addFunction('checkstart', ['setaccess'], async (view) => {
	const db = await view.get('db')
	const source_title = await db.col(`select source_title FROM sources_sources where date_start is not null`)
	if (source_title) return view.err('Дождитесь загрузки '+ source_title)
	if (Sources.recalcinprogress) return view.err('Дождитесь пересчёта')
})
rest.addArgument('item_id', ['mint'], async (view, item_id) => {
	if (!item_id) return null
	const db = await view.get('db')
	item_id = await db.col('select value_id from sources_values where value_id=:item_id', {item_id})
	if (!item_id) return view.err('Позиция не найдена', 404)
	return item_id
})
rest.addArgument('prop_id', ['sint'], async (view, prop_id) => {
	if (!prop_id) return null
	const db = await view.get('db')
	prop_id = await db.col('select prop_id from sources_props where prop_id=:prop_id', {prop_id})
	if (!prop_id) return view.err('Свойство не найдено', 404)
	return prop_id
})
rest.addArgument('entity_id', ['sint'], async (view, entity_id) => {
	if (!entity_id) return null
	const db = await view.get('db')
	entity_id = await db.col('select prop_id from sources_props where prop_id=:entity_id', {entity_id})
	if (!entity_id) return view.err('Сущность не найдена', 404)
	return entity_id
})
rest.addVariable('key_id#required', ['key_id', 'required'])
rest.addVariable('value_id#required', ['value_id', 'required'])
rest.addVariable('item_id#required', ['item_id', 'required'])
rest.addVariable('source_id#required', ['source_id', 'required'])
rest.addVariable('entity_id#required', ['entity_id', 'required'])
rest.addVariable('prop_id#required', ['prop_id', 'required'])



export default rest