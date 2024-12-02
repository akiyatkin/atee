import Access from "/-controller/Access.js"
import nicked from '/-nicked'
import filter from '/-nicked/filter.js'

import xlsx from "/-xlsx"
import Rest from "/-rest"
import config from "/-config"
import Sources from "/-sources/Sources.js"
const rest = new Rest()

import rest_sources from '/-sources/rest.sources.js'
rest.extra(rest_sources)

import rest_admin from '/-controller/rest.admin.js'
rest.extra(rest_admin)

import rest_search from "/-dialog/search/rest.search.js" //аргументы hash, search 
rest.extra(rest_search)

rest.addResponse('get-source-entity-search', ['admin'], async view => {
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
		SELECT entity_id, entity_title
		FROM sources_entities
		WHERE entity_nick like "%${hash.join('%" and entity_nick like "%')}%"
	`)

	view.ans.list = list.map(row => {
		row['left'] = row.entity_title
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
rest.addResponse('get-represent', ['admin'], async view => {
	const db = await view.get('db')
	let source_id = await view.get('source_id')
	let entity_id = await view.get('entity_id')
	let prop_id = await view.get('prop_id')
	const col_index = await view.get('col_index')
	const row_index = await view.get('row_index')
	const sheet_index = await view.get('sheet_index')
	const multi_index = await view.get('multi_index')
	const repeat_index = await view.get('repeat_index')
	let key_id = await view.get('key_id')
	

	if ([sheet_index, row_index, col_index, multi_index, key_id, repeat_index].some(v => v != null) && !source_id) return view.err('Требуется source_id')
	if ([row_index, col_index, multi_index, key_id, repeat_index].some(v => v != null) && sheet_index == null) return view.err('Требуется sheet_index')
	if ([multi_index, key_id, repeat_index].some(v => v != null) && row_index == null) return view.err('Требуется row_index')
	if ([multi_index].some(v => v != null) && col_index == null) return view.err('Требуется col_index')
	if (!entity_id && !source_id && !prop_id) return view.err('Должно быть указано хоть что-то entity_id, source_id, prop_id')

	const col = view.ans.col = (col_index != null) ? await Sources.getCol(db, source_id, sheet_index, col_index) : false	
	if (col) col.col_index_max = await db.col(`
		SELECT max(col_index) 
		FROM sources_cols ro
		WHERE ro.source_id = :source_id
	`, col)
	if (col) prop_id = col.prop_id

	const prop = view.ans.prop = prop_id ? await Sources.getProp(db, prop_id) : false
	if (prop) entity_id = prop.entity_id

	const source = view.ans.source = source_id ? await Sources.getSource(db, source_id) : false
	const sheet = view.ans.sheet = sheet_index != null ? await Sources.getSheet(db, source_id, sheet_index) : false
	if (sheet) {
		entity_id = sheet.entity_id
		sheet.sheet_index_max = await db.col(`
			SELECT max(sheet_index) 
			FROM sources_sheets sh
			WHERE sh.source_id = :source_id
		`, sheet)
	}

	const row = view.ans.row = row_index != null ? await Sources.getRow(db, source_id, sheet_index, row_index) : false
	if (row) {
		row.row_index_max = await db.col(`
			SELECT max(row_index) 
			FROM sources_rows ro
			WHERE ro.source_id = :source_id and ro.sheet_index = :sheet_index
		`, row)
		if (row.key_id) {
			row.repeat_index_max = await db.col(`
				SELECT max(repeat_index) 
				FROM sources_rows ro
				WHERE ro.source_id = :source_id and ro.sheet_index = :sheet_index and ro.key_id = :key_id
			`, row)
		} else {
			row.repeat_index_max = await db.col(`
				SELECT max(repeat_index) 
				FROM sources_rows ro
				WHERE ro.source_id = :source_id and ro.sheet_index = :sheet_index and ro.key_id is null
			`, row)
		}
	}
	if (row) key_id = row.key_id
	const entity = view.ans.entity = entity_id ? await Sources.getEntity(db, entity_id) : false
	const key = view.ans.key = key_id ? await Sources.getValue(db, key_id) : false

	
	const cell = view.ans.cell = (multi_index != null) ? await Sources.getCell(db, source_id, sheet_index, row_index, col_index, multi_index) : false	
	if (cell) cell.multi_index_max = await db.col(`
		SELECT max(multi_index) 
		FROM sources_cells ce
		WHERE ce.source_id = :source_id and ce.row_index = :row_index and ce.col_index = :col_index
	`, cell)
	

	let main = ''
	if (cell) main = 'cell'
	else if (col) main = 'col'
	else if (row) main = 'row'
	else if (prop) main = 'prop'
	else main = 'wtf'
	view.ans.main = main

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
			right: ''
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
			action:`/-sources/set-col-prop-create`,
			search_value: true, 
			left: '<span class="a">Создать свойство</span>',
			right: ''
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
export default rest

