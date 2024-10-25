import nicked from '/-nicked'
import fs from "fs/promises"
import Rest from "/-rest"
import config from '/-config'


const rest = new Rest()

import rest_db from '/-db/rest.db.js'
rest.extra(rest_db)

import rest_funcs from '/-rest/rest.funcs.js'
rest.extra(rest_funcs)

rest.addArgument('id', ['mint#required'])
rest.addArgument('next_id', ['mint'])
rest.addArgument('sourceprop', (view, prop) => {
	if (~['dependent','represent_source','renovate'].indexOf(prop)) return prop
	return null
})
rest.addArgument('entityprop', (view, prop) => {
	if (~['represent_entity'].indexOf(prop)) return prop
	return null
})
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
rest.addArgument('comment', ['string'])
rest.addArgument('source_id', ['sint'], async (view, source_id) => {
	if (!source_id) return null
	const db = await view.get('db')
	source_id = await db.col('select source_id from sources_sources where source_id=:source_id', {source_id})
	if (!source_id) return view.err('Источник не найден', 404)
	return source_id
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

export default rest