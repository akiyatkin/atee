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


export default rest

rest.addResponse('settings', async view => {
	await view.get('admin')
	const conf = await config('sources')
	view.ans.dir = conf.dir

	return view.ret()
})

rest.addResponse('main', async view => {
	const isdb = await view.get('isdb')
	view.ans.admin = await Access.isAdmin(view.visitor.client.cookie)
	view.ans.isdb = !!isdb
	if (!view.ans.admin || !view.ans.isdb) return view.err()

	const db = await view.get('db')
	const list = view.ans.list = await Sources.getAll(db)
	
	for (const source of list) {
		source.entities = await db.colAll(`
			select e.entity_plural 
			FROM sources_custom_sheets cs, sources_entities e
			WHERE cs.source_id = :source_id 
			and (e.entity_id = :entity_id or e.entity_id = cs.entity_id)
		`, source)
	}

	const conf = await config('sources')
	view.ans.dir = conf.dir
	return view.ret()
})

rest.addResponse('source', async view => {
	await view.get('admin')
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const source = view.ans.source = await Sources.getSource(db, source_id)

	if (source.entity_id) {
		source.entity = await db.colAll(`
			SELECT 
				e.entity_id,
				e.entity_nick,
				e.entity_title,
				e.entity_plural 
			FROM sources_entities e
			WHERE e.entity_id = :entity_id
		`, source)
	}

	return view.ret()
})