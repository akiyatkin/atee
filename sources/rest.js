import Access from "/-controller/Access.js"
import nicked from '/-nicked'
import config from "/-config"
import Sources from "/-sources/Sources.js"

import Rest from "/-rest"
const rest = new Rest()

import rest_set from '/-sources/rest.set.js'
rest.extra(rest_set)

import rest_get from '/-sources/rest.get.js'
rest.extra(rest_get)

import rest_sources from '/-sources/rest.sources.js'
rest.extra(rest_sources)

import rest_db from '/-db/rest.db.js'
rest.extra(rest_db)

export default rest

const db = await rest.data('db')
//База данных могла не перезапуститься и процесс реально ещё остался
await db.exec(`UPDATE sources_sources SET date_start = null`)




rest.addResponse('settings', ['admin'], async view => {

	const conf = await config('sources')
	view.data.dir = conf.dir

	return view.ret()
})

rest.addResponse('main', async view => {
	const isdb = await view.get('isdb')
	view.data.admin = await Access.isAdmin(view.visitor.client.cookie)
	view.data.isdb = !!isdb
	if (!view.data.admin || !view.data.isdb) return view.err()

	const db = await view.get('db')
	const list = view.data.list = await Sources.getSources(db)
	
	// for (const source of list) {
	// 	source.entities = await db.colAll(`
	// 		select e.entity_plural 
	// 		FROM sources_custom_sheets cs, sources_entities e
	// 		WHERE cs.source_id = :source_id 
	// 		and (e.entity_id = :entity_id or e.entity_id = cs.entity_id)
	// 	`, source)
	// }

	const conf = await config('sources')
	view.data.dir = conf.dir
	return view.ret()
})
rest.addResponse('props', ['admin'], async view => {
	const db = await view.get('db')
	const entity_id = view.data.entity_id = await view.get('entity_id#required')
	const list = view.data.list = await Sources.getProps(db, entity_id)
	return view.ret()
})
rest.addResponse('prop', ['admin'], async view => {
	const db = await view.get('db')
	const prop_id = await view.get('prop_id#required')
	const prop = view.data.prop = await Sources.getProp(db, prop_id)
	return view.ret()
})
rest.addResponse('entity', ['admin'], async view => {
	const db = await view.get('db')
	const entity_id = view.data.entity_id = await view.get('entity_id')
	const entity = view.data.entity = await Sources.getEntity(db, entity_id)
	return view.ret()
})
rest.addResponse('entities', ['admin'], async view => {
	const db = await view.get('db')
	const list = view.data.list = await Sources.getEntities(db)
	return view.ret()
})
rest.addResponse('source', ['admin'], async view => {
	
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const source = view.data.source = await Sources.getSource(db, source_id)

	return view.ret()
})