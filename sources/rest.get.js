import Access from "/-controller/Access.js"
import nicked from '/-nicked'
import filter from '/-nicked/filter.js'

import xlsx from "/-xlsx"
import Rest from "/-rest"
import config from "/-config"
import Sources from "/-sources/Sources.js"
import eye from "/-sources/represent.js"
const rest = new Rest()

import rest_sources from '/-sources/rest.sources.js'
rest.extra(rest_sources)

import rest_admin from '/-controller/rest.admin.js'
rest.extra(rest_admin)

import rest_search from "/-dialog/search/rest.search.js" //аргументы hash, search 
rest.extra(rest_search)

export default rest

rest.addResponse('get-recalc', ['admin'], async view => {
	const db = await view.get('db')

	view.data.start = Sources.recalc.start ? Sources.recalc.start.getTime() : false
	if (!view.data.start && Sources.recalc.lastend) view.data.start = Sources.recalc.lastend.getTime() + 1000 > Date.now() ? Sources.recalc.laststart.getTime() : false

	view.data.dates = await db.fetch(`
		SELECT 
			UNIX_TIMESTAMP(date_index) as date_index, 
			UNIX_TIMESTAMP(date_recalc) as date_recalc 
		FROM sources_settings
	`)	
	view.data.indexneed = view.data.dates.date_recalc > view.data.dates.date_index

	// const titles = await db.all(`
	// 	SELECT 
	// 		so.source_title, so.date_start
	// 	FROM
	// 		sources_sources so
	// 	WHERE so.date_start is not null
	// `)
	return view.ret()
})

rest.addResponse('get-entity-export', ['admin'], async view => {
	const db = await view.get('db')
	const entity_id = await view.get('entity_id#required')

	const entity = view.data.entity = await db.fetch(`
		SELECT
			pr.prop_title,
			pr.comment,
			pr.ordain,
			pr.represent_prop + 0 as represent_prop

		FROM sources_props pr on pr.prop_id = en.prop_id
		WHERE en.entity_id = :entity_id
	`, {entity_id})

	if (!entity.comment) delete entity.comment
	if (entity.represent_prop == 1) delete entity.represent_prop
	if (entity.represent_values == 1) delete entity.represent_values

	entity.props = await db.all(`
		SELECT 
			pr.prop_title,
			pr.type,
			pr.multi + 0 as multi,
			pr.comment,
			pr.represent_custom_prop + 0 as represent_custom_prop
		FROM sources_props pr
		WHERE pr.entity_id = :entity_id
		order by pr.ordain
	`, {entity_id})
	for (const prop of entity.props) {
		if (prop.represent_custom_prop == null) delete prop.represent_custom_prop
		if (prop.multi == 0) delete prop.multi
		if (!prop.comment) delete prop.comment
	}

	entity.items = await db.all(`
		SELECT 
			cit.key_nick,
			cit.represent_custom_item + 0 as represent_custom_item
		FROM sources_custom_items cit
		WHERE cit.entity_id = :entity_id
	`, {entity_id})
	for (const item of entity.items) {
		if (item.represent_custom_item == null) delete item.represent_custom_item
	}
	// entity.values = await db.all(`
	// 	SELECT 
	// 		pr.prop_title,
	// 		cva.value_nick,
	// 		cva.represent_custom_value + 0 as represent_custom_value
	// 	FROM sources_custom_values cva, sources_props pr
	// 	WHERE pr.prop_id = cva.prop_id
	// 	and pr.entity_id = :entity_id
	// `, {entity_id})
	// for (const value of entity.values) {
	// 	if (value.represent_custom_value == null) delete value.represent_custom_value
	// }

	return view.ret()
})
// rest.addResponse('get-source-export', ['admin'], async view => {
// 	const db = await view.get('db')
// 	const source_id = await view.get('source_id#required')
// 	const source = view.data.source = await db.fetch(`
// 		SELECT 
// 			so.source_title, 
// 			pr.prop_title,
// 			so.ordain,
// 			so.master + 0 as master,
// 			so.renovate + 0 as renovate,
// 			so.comment,
// 			so.represent_source + 0 as represent_source,
// 			so.represent_sheets + 0 as represent_sheets,
// 			so.represent_cols + 0 as represent_cols,
// 		FROM sources_sources so
// 			LEFT JOIN sources_props pr on (pr.prop_id = so.entity_id)
// 		WHERE source_id = :source_id
// 	`, {source_id})
	
// 	if (source.represent_source == 1) delete source.represent_source
// 	if (source.prop_title == null) delete source.prop_title
// 	if (source.master == 1) delete source.master
// 	if (source.renovate == 1) delete source.renovate
// 	if (source.represent_sheets == 1) delete source.represent_sheets
// 	if (source.represent_rows == 1) delete source.represent_rows
// 	if (source.represent_cols == 1) delete source.represent_cols
// 	if (source.represent_cells == 1) delete source.represent_cells
// 	if (source.comment == null) delete source.comment

// 	const sheets = source.sheets = await db.all(`
// 		SELECT 
// 			csh.sheet_title, 
// 			csh.represent_custom_sheet + 0 as represent_custom_sheet, 
// 			pr.prop_title
// 		FROM sources_custom_sheets csh
// 		LEFT JOIN sources_props pr on pr.prop_id = csh.entity_id
// 		WHERE csh.source_id = :source_id
// 	`, {source_id})
// 	for (const i in sheets) {
// 		const sheet = sheets[i]
// 		if (sheet.prop_title == null) delete sheet.prop_title
// 		if (sheet.represent_custom_sheet == null) delete sheet.represent_custom_sheet
		


// 		sheet.cols = await db.all(`
// 			SELECT 
// 				cco.col_title,
// 				pr.prop_title,
// 				cco.noprop + 0 as noprop,
// 				cco.represent_custom_col + 0 as represent_custom_col
// 			FROM sources_custom_cols cco
// 				LEFT JOIN sources_props pr on (pr.prop_id = cco.prop_id)
// 			WHERE cco.source_id = :source_id and cco.sheet_title = :sheet_title
// 		`, {...sheet, source_id})
// 		for (const col of sheet.cols) {
// 			if (col.represent_custom_col == null) delete col.represent_custom_col
// 			if (col.prop_title == null) delete col.prop_title
// 			if (col.noprop == null) delete col.noprop
// 		}
// 		// sheet.rows = await db.all(`
// 		// 	SELECT 
// 		// 		cro.key_nick,
// 		// 		cro.repeat_index,
// 		// 		cro.represent_custom_row + 0 as represent_custom_row
// 		// 	FROM sources_custom_rows cro
// 		// 	WHERE cro.source_id = :source_id and cro.sheet_title = :sheet_title
// 		// `, {...sheet, source_id})
// 		// for (const row of sheet.rows) {
// 		// 	if (row.represent_custom_row == null) delete row.represent_custom_row
// 		// }
// 		// sheet.cells = await db.all(`
// 		// 	SELECT 
// 		// 		cce.key_nick,
// 		// 		cce.repeat_index,
// 		// 		cce.col_title,
// 		// 		cce.represent_custom_cell + 0 as represent_custom_cell
// 		// 	FROM sources_custom_cells cce
// 		// 	WHERE cce.source_id = :source_id and cce.sheet_title = :sheet_title
// 		// `, {...sheet, source_id})
// 		// for (const cell of sheet.cells) {
// 		// 	if (cell.represent_custom_cell == null) delete cell.represent_custom_cell
// 		// }
// 	}
// 	return view.ret()
// })
rest.addResponse('get-source-entity-search', ['admin'], async view => {
	const db = await view.get('db')
	const hash = await view.get('hash')
	
	const list = await db.all(`
		SELECT prop_id as entity_id, prop_title
		FROM sources_props
		WHERE prop_nick like "%${hash.join('%" and prop_nick like "%')}%"
	`)

	view.ans.list = list.map(row => {
		row['left'] = row.prop_title
		row['right'] = ''
		return row
	})
	if (hash.length) {
		view.ans.list.push({
			confirm:'Cоздать новую сущность?',
			action:`/-sources/set-source-entity-create`,
			search_value: true, 
			left: '<span class="a">Новая сущность</span>',
			right: ''
		})
	}
	view.ans.list.push({
		action:`/-sources/set-source-entity-reset`,
		left: '<span class="a">Сбросить выбор</span>',
		right: ''
	})

	view.ans.count = list.length
	return view.ret()
})
rest.addResponse('get-sheet-entity-search', ['admin'], async view => {
	const db = await view.get('db')
	const hash = await view.get('hash')
	
	const list = await db.all(`
		SELECT prop_id as entity_id, prop_title
		FROM sources_props
		WHERE prop_nick like "%${hash.join('%" and prop_nick like "%')}%"
	`)

	view.ans.list = list.map(row => {
		row['left'] = row.prop_title
		row['right'] = ''
		return row
	})
	if (hash.length) {
		view.ans.list.push({
			confirm:'Cоздать новую сущность?',
			action:`/-sources/set-sheet-entity-create`,
			search_value: true, 
			left: '<span class="a">Новая сущность</span>',
			right: ''
		})
	}
	view.ans.list.push({
		action:`/-sources/set-sheet-entity-reset`,
		left: '<span class="a">Сбросить выбор</span>',
		right: ''
	})

	view.ans.count = list.length
	return view.ret()
})
rest.addResponse('get-entity-search', ['admin'], async view => {
	const db = await view.get('db')
	const hash = await view.get('hash')
	
	const list = await db.all(`
		SELECT entity_id, entity_title
		FROM sources_entities
		WHERE entity_nick like "%${hash.join('%" and entity_nick like "%')}%"
	`)

	view.ans.list = list.map(row => {
		row['left'] = row.entity_title
		row['right'] = ''
		return row
	})

	view.ans.count = list.length
	return view.ret()
})

rest.addResponse('get-entity-prop-search', ['admin'], async view => {
	const db = await view.get('db')
	const hash = await view.get('hash')
	const entity_id = await view.get('entity_id#required')
	const list = await db.all(`
		SELECT prop_id, prop_title, type
		FROM sources_props
		WHERE prop_nick like "%${hash.join('%" and prop_nick like "%')}%"
		and entity_id = :entity_id
	`, {entity_id})

	view.ans.list = list.map(row => {
		row['left'] = row.prop_title
		row['right'] = row.type
		return row
	})
	if (hash.length) {
		view.ans.list.push({
			confirm:'Cоздать новое свойство?',
			action:`/-sources/set-entity-prop-create`,
			search_value: true, 
			left: '<span class="a">Создать свойство</span>',
			right: 'text'
		})
	}
	view.ans.list.push({
		action:`/-sources/set-entity-prop-reset`,
		left: '<span class="a">Сбросить выбор</span>',
		right: ''
	})

	view.ans.count = list.length
	return view.ret()
})
rest.addResponse('get-col-prop-search', ['admin'], async view => {
	const db = await view.get('db')
	const hash = await view.get('hash')
	const list = await db.all(`
		SELECT prop_id, prop_title, type
		FROM sources_props
		WHERE prop_nick like "%${hash.join('%" and prop_nick like "%')}%"
	`)

	view.ans.list = list.map(row => {
		row['left'] = row.prop_title
		row['right'] = row.type
		return row
	})
	if (hash.length) {
		view.ans.list.push({
			confirm:'Cоздать новое свойство?',
			action:`/-sources/set-col-prop-create`,
			search_value: true, 
			left: '<span class="a">Создать свойство</span>',
			right: 'text'
		})
	}
	view.ans.list.push({
		action:`/-sources/set-col-prop-reset`,
		left: '<span class="a">Сбросить выбор</span>',
		right: ''
	})

	view.ans.count = list.length
	return view.ret()
})
rest.addResponse('get-prop-type-search', ['admin'], async view => {
	view.ans.list = [
		{
			'left':'number',
			'type':'number',
			'right':''
		},
		{
			'left':'date',
			'type':'date',
			'right':''
		},
		{
			'left':'value',
			'type':'value',
			'right':''
		},
		{
			'left':'text',
			'type':'text',
			'right':''
		}
	]
	view.ans.count = 4
	return view.ret()
})
rest.addResponse('get-inter-prop-search', ['admin'], async view => {
	const db = await view.get('db')
	const hash = await view.get('hash')
	const entity_id = await view.get('entity_id#required')
	const list = await db.all(`
		SELECT prop_id, prop_title, type
		FROM sources_props
		WHERE prop_nick like "%${hash.join('%" and prop_nick like "%')}%"
		and entity_id = :entity_id
	`, {entity_id})

	view.ans.list = list.map(row => {
		row['left'] = row.prop_title
		row['right'] = row.type
		return row
	})
	if (hash.length) {
		view.ans.list.push({
			confirm:'Cоздать новое свойство?',
			action:`/-sources/set-entity-prop-create`,
			search_value: true, 
			left: '<span class="a">Создать свойство</span>',
			right: ''
		})
	}
	
	view.ans.count = list.length
	return view.ret()
})


import ImpExp from "/-sources/ImpExp.js"
rest.addResponse('get-export', ['admin'], async view => {
	const db = await view.get('db')	
	const msg = await ImpExp.export(db, rest_sources.exporttables)
	if (msg) return view.ret(msg)
	return view.err('Нет данных для экспорта')
})