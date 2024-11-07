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


rest.addResponse('settings', ['admin'], async view => {

	const conf = await config('sources')
	view.data.dir = conf.dir

	const db = await view.get('db')
	view.data.loads = await db.col(`
		SELECT count(*) 
		FROM sources_sources
		WHERE date_start is not null
	`)
	view.data.date_access = Math.round(Access.getAccessTime() / 1000)
	view.data.date_update = Math.round(Access.getUpdateTime() / 1000)

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
	const i_am_being_used = view.data.i_am_being_used = await db.all(`
		SELECT en.entity_title, en.entity_id
		FROM sources_intersections i, sources_entities en
		WHERE i.entity_slave_id = :entity_id and en.entity_id = i.entity_master_id
	`, {entity_id})
	const i_am_using = view.data.i_am_using = await db.all(`
		SELECT en.entity_id, en.entity_title, pr.prop_id, pr.prop_title, pr.multi + 0 as multi
		FROM sources_intersections i, sources_props pr, sources_entities en
		WHERE i.entity_master_id = :entity_id and pr.prop_id = i.prop_master_id and en.entity_id = i.entity_slave_id
	`, {entity_id})

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
	
	const custom_sheets =await db.all(`
		SELECT 
			csh.source_id,
			csh.sheet_title,
			cast(csh.represent_custom_sheet as SIGNED) as represent_custom_sheet,
			csh.entity_id,
			en.entity_title
		FROM sources_custom_sheets csh
		LEFT JOIN sources_entities en on en.entity_id = csh.entity_id
		WHERE csh.source_id = :source_id
		ORDER by csh.sheet_title
	`, source)

	const loaded_sheets = await db.all(`
		SELECT 
			sh.source_id,
			sh.sheet_index,
			sh.sheet_title,
			sh.entity_id,
			cast(sh.represent_sheet as SIGNED) as represent_sheet,
			en.entity_title
		FROM sources_sheets sh
		LEFT JOIN sources_entities en on en.entity_id = sh.entity_id
		WHERE sh.source_id = :source_id
		ORDER by sh.sheet_index
	`, source)

	const stat = view.data.stat ??= {}
	stat.sheets = loaded_sheets.length
	stat.rows = await db.col(`
		SELECT count(*)
		FROM sources_rows ro
		WHERE ro.source_id = :source_id
	`, source)


	const sheets = {}
	for (const sheet of loaded_sheets) {
		const merged = sheets[sheet.sheet_title] ??= {sheet_title: sheet.sheet_title}
		merged.loaded = sheet
		delete sheet.sheet_title
	}
	for (const sheet of custom_sheets) {
		const merged = sheets[sheet.sheet_title] ??= {sheet_title: sheet.sheet_title}
		merged.custom = sheet
		delete sheet.sheet_title
	}
	view.data.sheets = Object.values(sheets)
	return view.ret()
})