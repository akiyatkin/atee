import nicked from '/-nicked'
import fs from "fs/promises"
import Rest from "/-rest"
import config from '/-config'


const rest = new Rest()

import rest_db from '/-db/rest.db.js'
rest.extra(rest_db)

import rest_funcs from '/-rest/rest.funcs.js'
rest.extra(rest_funcs)

rest.addArgument('id', ['mint'])
rest.addVariable('id#required', ['id', 'required'])
rest.addArgument('sheet_index', ['mint'])
rest.addVariable('sheet_index#required', ['sheet_index', 'required'])
rest.addArgument('next_id', ['mint'])
rest.addArgument('sourceprop', (view, prop) => {
	if (~['dependent','represent_source','renovate','represent_sheets','represent_rows', 'represent_cells', 'represent_cols'].indexOf(prop)) return prop
	return null
})
rest.addArgument('custom', (view, prop) => {
	if (~['col','row','cell','prop','item', 'value', 'sheet'].indexOf(prop)) return prop
	return null
})
rest.addArgument('propprop', (view, prop) => {
	if (~['multi', 'represent_prop','known'].indexOf(prop)) return prop
	return null
})
rest.addArgument('entityprop', (view, prop) => {
	if (~['represent_entity','represent_props','represent_values','represent_items'].indexOf(prop)) return prop
	return null
})

rest.addArgument('type', (view, type) => {
	if (~['date','text','value','number'].indexOf(type)) return type
	return null
})

rest.addVariable('custom#required', ['custom', 'required'])
rest.addVariable('type#required', ['type', 'required'])
rest.addVariable('propprop#required', ['propprop', 'required'])
rest.addVariable('sourceprop#required', ['sourceprop', 'required'])
rest.addVariable('entityprop#required', ['entityprop', 'required'])

rest.addArgument('date', (view, date) => {
	if (!date) return null
	try {
		return Math.round(new Date(date).getTime() / 1000)
	} catch (e) {
		return null
	}
})
rest.addArgument('title', ['escape'])
rest.addVariable('title#required', ['title', 'required'])

rest.addArgument('sheet_title', ['escape'])
rest.addVariable('sheet_title#required', ['sheet_title', 'required'])

rest.addArgument('col_title', ['escape'])
rest.addVariable('col_title#required', ['col_title', 'required'])

rest.addArgument('comment', ['string'])
rest.addArgument('source_id', ['sint'], async (view, source_id) => {
	if (!source_id) return null
	const db = await view.get('db')
	source_id = await db.col('select source_id from sources_sources where source_id=:source_id', {source_id})
	if (!source_id) return view.err('Источник не найден', 404)
	return source_id
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
	entity_id = await db.col('select entity_id from sources_entities where entity_id=:entity_id', {entity_id})
	if (!entity_id) return view.err('Сущность не найдена', 404)
	return entity_id
})
rest.addVariable('source_id#required', ['source_id', 'required'])
rest.addVariable('entity_id#required', ['entity_id', 'required'])
rest.addVariable('prop_id#required', ['prop_id', 'required'])



export default rest