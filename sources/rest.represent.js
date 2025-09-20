import fs from "fs/promises"

import nicked from '/-nicked/nicked.js'
import unique from '/-nicked/unique.js'
import words from '/-words/words.js'
import date from '/-words/date.html.js'
import represent from "/-sources/represent.js"
import Recalc from "/-sources/Recalc.js"
import Sources from "/-sources/Sources.js"

import Consciousness from "/-sources/Consciousness.js"

import Rest from "/-rest"
const rest = new Rest()

import rest_admin from '/-controller/rest.admin.js'
rest.extra(rest_admin)

import rest_sources from '/-sources/rest.sources.js'
rest.extra(rest_sources)


export default rest

rest.addResponse('get-represent', ['admin'], async view => {
	const db = await view.get('db')
	let source_id = await view.get('source_id')
	let entity_id = await view.get('entity_id')
	let prop_id = await view.get('prop_id')

	let col_title = await view.get('col_title')
	let sheet_title = await view.get('sheet_title')
	let multi_index = await view.get('multi_index')
//	let repeat_index = await view.get('repeat_index')
	let key_id = await view.get('key_id')
	
	const col_index = await view.get('col_index')
	const sheet_index = await view.get('sheet_index')
	const row_index = await view.get('row_index')
	if (sheet_index != null) {
		if([source_id].some(v => v == null)) return view.err('Требуется source_id и sheet_index')
		sheet_title = await db.col(`
			SELECT sheet_title FROM sources_sheets
			WHERE source_id = :source_id and sheet_index = :sheet_index
		`, {source_id, sheet_index})
	}
	if (col_index != null) {
		if([source_id, sheet_index].some(v => v == null)) return view.err('Требуется source_id и sheet_index')
		col_title = await db.col(`
			SELECT col_title FROM sources_cols 
			WHERE source_id = :source_id and sheet_index = :sheet_index and col_index = :col_index 
		`, {source_id, sheet_index, col_index})
	}
	if (row_index != null) {
		if([source_id, sheet_index].some(v => v == null)) return view.err('Требуется source_id и sheet_index')
		key_id = await db.col(`
			SELECT key_id FROM sources_rows
			WHERE source_id = :source_id and sheet_index = :sheet_index and row_index = :row_index 
		`, {source_id, sheet_index, row_index})
	}


	
	if ([sheet_title, col_title, multi_index].some(v => v != null) && !source_id) return view.err('Требуется source_id')
	if ([col_title, multi_index].some(v => v != null) && sheet_title == null) return view.err('Требуется sheet_title')
	if ([multi_index].some(v => v != null) && col_title == null) return view.err('Требуется col_title')
	if (!entity_id && !source_id && !prop_id) return view.err('Должно быть указано хоть что-то entity_id, source_id, prop_id')

	const source = view.data.source = source_id ? await Sources.getSource(db, source_id) : false
	if (source) source.cls = represent.calcCls(
		1, 
		source.represent_source,
		null
	)
	const sheet = view.data.sheet = sheet_title != null ? await Sources.getSheet(db, source_id, sheet_title) : false
	if (sheet) {
		entity_id = sheet.entity_id
		sheet.sheet_index_max = await db.col(`
			SELECT max(sheet_index) 
			FROM sources_sheets sh
			WHERE sh.source_id = :source_id
		`, sheet)
		sheet.cls = represent.calcCls(
			source.represent_source, 
			sheet.represent_custom_sheet, 
			source.represent_sheets
		)
	}

	const col = view.data.col = (col_title != null) ? await Sources.getCol(db, source_id, sheet_title, col_title) : false	
	
	if (col) col.col_index_max = await db.col(`
		SELECT max(col_index) 
		FROM sources_cols ro
		WHERE ro.source_id = :source_id
	`, col)
	if (col) prop_id = col.prop_id
	if (col) {
		col.cls = represent.calcCls(
			source.represent_source && sheet.represent_sheet, 
			col.represent_custom_col, 
			source.represent_cols
		)
	}


	
	const row = view.data.row = row_index != null ? await Sources.getRowByIndex(db, source_id, sheet_index, row_index) : false //(db, {source_id, sheet_title, key_id, repeat_index, sheet_index, row_index})
	//const row = view.data.row = repeat_index != null ? await Sources.getRow(db, source_id, sheet_title, key_id, repeat_index) : false
	if (row) {
		row.row_index_max = await db.col(`
			SELECT max(row_index) 
			FROM sources_rows ro
			WHERE ro.source_id = :source_id and ro.sheet_index = :sheet_index
		`, row)
		// if (row.key_id) {
		// 	row.repeat_index_max = await db.col(`
		// 		SELECT max(repeat_index) 
		// 		FROM sources_rows ro
		// 		WHERE ro.source_id = :source_id and ro.sheet_index = :sheet_index and ro.key_id = :key_id
		// 	`, row)
		// } else {
		// 	row.repeat_index_max = await db.col(`
		// 		SELECT max(repeat_index) 
		// 		FROM sources_rows ro
		// 		WHERE ro.source_id = :source_id and ro.sheet_index = :sheet_index and ro.key_id is null
		// 	`, row)
		// }
	}
	if (row) key_id = row.key_id
	// if (row) {
	// 	row.cls = represent.calcCls(
	// 		source.represent_source && sheet.represent_sheet, 
	// 		row.represent_custom_row, 
	// 		source.represent_rows * !!row.key_id
	// 	)

	// 	row.key = key_id ? await Sources.getCellByIndex(db, source_id, row.sheet_index, row.row_index, row.key_index, 0) : false	
	// 	if (row.key) {
	// 		row.key.cls = represent.calcCls(
	// 			source.represent_source && sheet.represent_sheet && row.represent_row && col.represent_col, 
	// 			row.key.represent_custom_cell, 
	// 			source.represent_cells
	// 		)
	// 	}
	// }

	
	
	const cell = view.data.cell = (multi_index != null) ? await Sources.getCellByIndex(db, source_id, sheet_index, row_index, col_index, multi_index) : false	
	//const cell = view.data.cell = (multi_index != null) ? await Sources.cell(db, {source_id, sheet_title, key_id, repeat_index, col_title, multi_index, sheet_index, row_index, col_index}) : false	
	
	//const cell = view.data.cell = (multi_index != null) ? await Sources.getCell(db, source_id, sheet_title, key_id, repeat_index, col_title, multi_index) : false	
	if (cell) cell.multi_index_max = await db.col(`
		SELECT max(multi_index) 
		FROM sources_cells ce
		WHERE ce.source_id = :source_id and ce.row_index = :row_index and ce.col_index = :col_index
	`, cell)

	// if (cell) {
	// 	cell.cls = represent.calcCls(
	// 		source.represent_source && sheet.represent_sheet && (sheet.key_index == cell.col_index || row.represent_row_key) && row.represent_row && col.represent_col, 
	// 		cell.represent_custom_cell, 
	// 		source.represent_cells * !!key_id
	// 	)
	// }
	const prop = view.data.prop = prop_id ? await Sources.getProp(db, prop_id) : false
	//if (prop) entity_id = prop_id
	const entity = view.data.entity = entity_id ? await Sources.getEntity(db, entity_id) : false
	
	if (prop) {
		prop.cls = represent.calcCls(
			entity.represent_entity, 
			prop.represent_prop && null, 
			1
		)
	}

	const item = view.data.item = key_id ? await Sources.getItem(db, entity_id, key_id) : false
	if (item) {
		item.cls = represent.calcCls(
			entity.represent_prop, 
			item.represent_custom_value, 
			entity.represent_values
		)
		// item.value = key_id ? await Sources.getValue(db, entity_id, entity.prop_id, 0) : false	
		// if (item.key) {
		// item.keycls = represent.calcCls(
		// 	entity.represent_prop && item.represent_value, 
		// 	item.represent_custom_value && null, 
		// 	source.represent_cells
		// )
		// }
	}
	
	const key = view.data.key = key_id ? await db.fetch(`
		SELECT 
			va.value_id,
			va.value_nick,
			va.value_title,
			date_appear as date_appear, 
			date_disappear as date_disappear
		FROM sources_appears ap
			LEFT JOIN sources_values va on va.value_nick = ap.key_nick
		WHERE va.value_id = :key_id and ap.entity_id = :entity_id
	`, {key_id, entity_id}) : false
	// if (key_id) {
	// 	// key.keycls = represent.calcCls(
	// 	// 	entity.represent_prop && (item ? item.represent_value : 0), 
	// 	// 	(item ? item.represent_custom_value : null), 
	// 	// 	source.represent_cells
	// 	// )
	// }
	const value = view.data.value = cell?.value_id ? await Sources.getValue(db, prop_id, cell.value_id) : false
	if (value) {
		value.cls = represent.calcCls(
			entity.represent_entity && prop.represent_prop && item.represent_value, 
			value.represent_custom_value, 
			entity.represent_values
		)
	}


	if (col && row) {
		//cell
		if (!key || !prop) {
			view.data.rels = []
			view.data.rels.push({
				source_id: col.source_id,
				row_index: row.row_index,
				col_index: col.col_index,
				sheet_index: col.sheet_index,

				source_title: source.source_title,
				ordain: source.ordain,
				sheet_title: sheet.sheet_title,
				sheet_index: sheet.sheet_index,
				row_index: row.row_index,
				col_title: col.col_title,
				col_index: col.col_index,
				choice: true,
				winner: false,
				represent_source: source.represent_source,
			 	represent_sheet: sheet.represent_sheet,
			 	represent_col: col.represent_col,

				text: (await db.colAll(`
					select text 
					from sources_cells 
					where
					source_id = :source_id
					and sheet_index = :sheet_index
					and col_index = :col_index
					and row_index = :row_index
				`, {...col, ...row})).join(', ')
			})
		} else {
			view.data.rels = await db.all(`
				SELECT 
					ce.source_id,
					ce.row_index,
					ce.col_index,
					ce.sheet_index,

					wi.source_id as wsource_id,
					wi.row_index as wrow_index,
					wi.col_index as wcol_index,
					wi.sheet_index as wsheet_index,

					so.source_title, so.ordain, sh.sheet_title, sh.sheet_index, ro.row_index, co.col_title, co.col_index, 
					so.represent_source + 0 as represent_source,
			 		sh.represent_sheet + 0 as represent_sheet,
			 		co.represent_col + 0 as represent_col,

			 		nvl(wi.source_id, '') as winner,

					GROUP_CONCAT(ce.text separator ', ') as text
				FROM
					
					sources_sources so,
					sources_cols co,
					sources_rows ro,
					sources_sheets sh,
					sources_cells ce
						LEFT JOIN sources_wcells wi on (
							wi.source_id = ce.source_id 
							and wi.sheet_index = ce.sheet_index
							and wi.col_index = ce.col_index
							and wi.row_index = ce.row_index
						)
				WHERE 
					sh.entity_id = :entity_id
					and co.prop_id = :prop_id
					and ro.key_id = :key_id

					and so.source_id = ce.source_id

					and sh.source_id = ce.source_id
					and sh.sheet_index = ce.sheet_index

					and co.source_id = ce.source_id
					and co.sheet_index = ce.sheet_index
					and co.col_index = ce.col_index
					
					and ro.source_id = ce.source_id
					and ro.sheet_index = ce.sheet_index
					and ro.row_index = ce.row_index

				group by ce.source_id, ce.sheet_index, ce.row_index, ce.col_index
				order by so.ordain, ce.sheet_index, ce.row_index, ce.col_index
			`, {key_id, entity_id, prop_id})
			view.data.rels.forEach(rel => {
				rel.choice = rel.source_id == source_id && rel.sheet_index == sheet_index && rel.row_index == row_index && rel.col_index == col_index
			})			
		}
	}
	

	let main = ''
	if (multi_index != null) main = 'cell'
	else if (col) main = 'col'
	else if (row) main = 'row'
	else if (prop) main = 'prop'
	else if (sheet) main = 'sheet'
	else if (source) main = 'source'
	else if (item) main = 'item'
	else if (entity) main = 'entity'
	else main = 'wtf'

	view.data.main = main
	return view.ret()
})


const getCustomSwitch = (value, def) => {
	if (value && def) return 0
	if (value == null && def) return 0
	if (value == 0 && def) return null

	if (value && !def) return null
	if (value == 0 && !def) return 1
	if (value == null && !def) return 1
}
const defcustom = (value) => {
	if (value) return 'represent-def-1'
	else return 'represent-custom-0'
}
rest.addAction('set-represent_sheets', ['admin','checkrecalc'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const source = await Sources.getSource(db, source_id)
	const newvalue = !source.represent_sheets + 0
	await db.exec(`
		UPDATE sources_sources 
		SET represent_sheets = :newvalue
   		WHERE source_id = :source_id
	`, {source_id, newvalue})

	view.data.cls = {main: `represent-${source.represent_source}`, custom: defcustom(newvalue)}

	Recalc.recalc(db, async () => {
		//await Consciousness.recalcEntitiesPropId(db)
		//await Consciousness.recalcMulti(db)
		//await Consciousness.recalcTexts(db)
		//await Consciousness.recalcKeyIndex(db)
		//await Consciousness.insertItems(db) //insert items
		
		await Consciousness.recalcRepresentSheet(db)
		//await Consciousness.recalcRepresentCol(db)
		await Consciousness.recalcMaster(db)
		return

		
		await Consciousness.recalcWinner_bySource(db, source_id)//await Consciousness.recalcWinner(db)
		//await Consciousness.recalcAppear(db)
		//Consciousness.recalcRowSearch(db) //Асинхронно расчитывается, не зависит от расчёта represent
		await Consciousness.recalcItemSearch_bySource(db, source_id) //Асинхронно расчитывается, не зависит от расчёта represent
	}, true)

	return view.ret()
})
// rest.addAction('set-represent_rows', ['admin'], async view => {
// 	const db = await view.get('db')
// 	const source_id = await view.get('source_id#required')
// 	const source = await Sources.getSource(db, source_id)
// 	const newvalue = !source.represent_rows + 0
// 	await db.exec(`
// 		UPDATE sources_sources 
// 		SET represent_rows = :newvalue
//    		WHERE source_id = :source_id
// 	`, {source_id, newvalue})
	
// 	Recalc.recalc(db, async () => {
// 		//await Consciousness.recalcEntitiesPropId(db)
// 		//await Consciousness.recalcMulti(db)
// 		//await Consciousness.recalcTexts(db)
// 		//await Consciousness.recalcKeyIndex(db)
// 		//await Consciousness.insertItems(db) //insert items

// 		//await Consciousness.recalcRepresentSheet(db)
// 		//await Consciousness.recalcRepresentCol(db)
// 		await Consciousness.recalcMaster(db)
// 		return

// 		await Consciousness.recalcWinner_bySource(db, source_id)//await Consciousness.recalcWinner(db)
// 		//await Consciousness.recalcAppear(db)
// 		//Consciousness.recalcRowSearch(db) //Асинхронно расчитывается, не зависит от расчёта represent
// 		await Consciousness.recalcItemSearch_bySource(db, source_id) //Асинхронно расчитывается, не зависит от расчёта represent
// 	}, true)
	
// 	view.data.cls = represent.calcCls(source.represent_source, newvalue)
// 	return view.ret()
// })
rest.addAction('set-represent_cols', ['admin'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const source = await Sources.getSource(db, source_id)
	const newvalue = !source.represent_cols + 0
	await db.exec(`
		UPDATE sources_sources 
		SET represent_cols = :newvalue
   		WHERE source_id = :source_id
	`, {source_id, newvalue})
	Recalc.recalc(db, async () => {
		//await Consciousness.recalcEntitiesPropId(db)
		//await Consciousness.recalcMulti(db)
		//await Consciousness.recalcTexts(db)
		//await Consciousness.recalcKeyIndex(db)
		//await Consciousness.insertItems(db) //insert items

		//await Consciousness.recalcRepresentSheet(db)
		await Consciousness.recalcRepresentCol_bySource(db, source_id)
		await Consciousness.recalcMaster(db)
		return

		await Consciousness.recalcWinner_bySource(db, source_id)//await Consciousness.recalcWinner(db)
		//await Consciousness.recalcAppear(db)
		//Consciousness.recalcRowSearch(db) //Асинхронно расчитывается, не зависит от расчёта represent
		await Consciousness.recalcItemSearch_bySource(db, source_id) //Асинхронно расчитывается, не зависит от расчёта represent
	}, true)
	view.data.cls = represent.calcCls(source.represent_source, newvalue)
	return view.ret()
})
rest.addAction('set-represent_cells', ['admin'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const source = await Sources.getSource(db, source_id)
	const newvalue = !source.represent_cells + 0
	await db.exec(`
		UPDATE sources_sources 
		SET represent_cells = :newvalue
   		WHERE source_id = :source_id
	`, {source_id, newvalue})
	Recalc.recalc(db, async () => {
		//await Consciousness.recalcEntitiesPropId(db)
		//await Consciousness.recalcMulti(db)
		//await Consciousness.recalcTexts(db)
		//await Consciousness.recalcKeyIndex(db)
		//await Consciousness.insertItems(db) //insert items

		//await Consciousness.recalcRepresentSheet(db)
		//await Consciousness.recalcRepresentCol_bySource(db, source_id)
		await Consciousness.recalcMaster(db)
		return

		await Consciousness.recalcWinner_bySource(db, source_id)//await Consciousness.recalcWinner(db)
		//await Consciousness.recalcAppear(db)
		//Consciousness.recalcRowSearch(db) //Асинхронно расчитывается, не зависит от расчёта represent
		await Consciousness.recalcItemSearch_bySource(db, source_id) //Асинхронно расчитывается, не зависит от расчёта represent
	}, true)
	view.data.cls = represent.calcCls(source.represent_source, newvalue)
	return view.ret()
})

rest.addAction('set-represent_values', ['admin','checkrecalc'], async view => {
	const db = await view.get('db')
	const entity_id = await view.get('entity_id#required')
	const entity = await Sources.getEntity(db, entity_id)
	const newvalue = !entity.represent_values + 0
	await db.exec(`
		UPDATE sources_props 
		SET represent_values = :newvalue
   		WHERE prop_id = :entity_id
	`, {entity_id, newvalue})
	Recalc.recalc(db, async () => {
		//await Consciousness.recalcEntitiesPropId(db)
		//await Consciousness.recalcMulti(db)
		//await Consciousness.recalcTexts(db)
		//await Consciousness.recalcKeyIndex(db)
		//await Consciousness.insertItems(db) //insert items		

		//await Consciousness.recalcRepresentSheet(db)
		//await Consciousness.recalcRepresentCol_bySource(db, source_id)
		await Consciousness.recalcMaster(db)
		return

		await Consciousness.recalcWinner_bySource(db, source_id)//await Consciousness.recalcWinner(db)
		//await Consciousness.recalcAppear(db)
		//Consciousness.recalcRowSearch(db) //Асинхронно расчитывается, не зависит от расчёта represent
		await Consciousness.recalcItemSearch_bySource(db, source_id) //Асинхронно расчитывается, не зависит от расчёта represent
	}, true)
	view.data.cls = represent.calcCls(entity.represent_entity, newvalue)
	return view.ret()
})

rest.addAction('set-represent_sheet', ['admin','checkrecalc','setaccess'], async view => {
	const db = await view.get('db')
	const sheet_title = await view.get('sheet_title#required')
	const source_id = await view.get('source_id#required')
	const source = await Sources.getSource(db, source_id)
	const sheet = await Sources.getSheet(db, source_id, sheet_title)
	
	const newvalue = getCustomSwitch(sheet.represent_custom_sheet, source.represent_sheets)
	
	await db.exec(`
		INSERT INTO sources_custom_sheets (source_id, sheet_title, represent_custom_sheet)
   		VALUES (:source_id, :sheet_title, :newvalue)
   		ON DUPLICATE KEY UPDATE represent_custom_sheet = VALUES(represent_custom_sheet)
	`, {...sheet, newvalue})
	
	view.data.cls = represent.calcCls(source.represent_source, newvalue, source.represent_sheets)
	
	Recalc.recalc(db, async () => {
		//await Consciousness.recalcEntitiesPropId(db)
		//await Consciousness.recalcMulti(db)
		//await Consciousness.recalcTexts(db)
		//await Consciousness.recalcKeyIndex(db)
		//await Consciousness.insertItems(db) //insert items		

		await Consciousness.recalcRepresentSheet_bySheet(db, sheet.source_id, sheet.sheet_index)
		//await Consciousness.recalcRepresentCol(db)
		//await Consciousness.recalcMaster_bySheet(db, sheet.source_id, sheet.sheet_index)
		return
		
		
		
		await Consciousness.recalcWinner_bySheet(db, sheet.source_id, sheet.sheet_index)//await Consciousness.recalcWinner(db)

		//await Consciousness.recalcAppear(db)
		//Consciousness.recalcRowSearch(db) //Асинхронно расчитывается, не зависит от расчёта represent
		await Consciousness.recalcItemSearch_bySheet(db, sheet.source_id, sheet.sheet_index) //Асинхронно расчитывается, не зависит от расчёта represent
	}, true)
	
	return view.ret()
})
rest.addAction('set-represent_source', ['admin'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const source = await Sources.getSource(db, source_id)
	
	const value = source.represent_source

	const newvalue = getCustomSwitch(value, value)
	
	await db.exec(`
		UPDATE sources_sources 
		SET represent_source = :newvalue
   		WHERE source_id = :source_id
	`, {source_id, newvalue})

	Recalc.recalc(db, async () => {
		//await Consciousness.recalcEntitiesPropId(db)
		//await Consciousness.recalcMulti(db)
		//await Consciousness.recalcTexts(db)
		//await Consciousness.recalcKeyIndex(db)
		//await Consciousness.insertItems(db) //insert items

		//await Consciousness.recalcRepresentSheet(db)
		//await Consciousness.recalcRepresentCol_bySource(db, source_id)
		await Consciousness.recalcMaster(db)
		return

		await Consciousness.recalcWinner_bySource(db, source_id)//await Consciousness.recalcWinner(db)
		//await Consciousness.recalcAppear(db)
		//Consciousness.recalcRowSearch(db) //Асинхронно расчитывается, не зависит от расчёта represent
		await Consciousness.recalcItemSearch_bySource(db, source_id) //Асинхронно расчитывается, не зависит от расчёта represent
	}, true)
	view.data.cls = represent.calcCls(
		1, 
		newvalue, 
		source.represent_source
	)
	return view.ret()
})
rest.addAction('set-represent_entity', ['admin'], async view => {
	const db = await view.get('db')
	const entity_id = await view.get('entity_id#required')
	const entity = await Sources.getEntity(db, entity_id)
	
	const value = entity.represent_entity

	const newvalue = getCustomSwitch(value, value)
	
	await db.exec(`
		UPDATE sources_props 
		SET represent_prop = :newvalue
   		WHERE prop_id = :entity_id
	`, {entity_id, newvalue})

	Recalc.recalc(db, async () => {
		//await Consciousness.recalcEntitiesPropId(db)
		//await Consciousness.recalcMulti(db)
		//await Consciousness.recalcTexts(db)
		//await Consciousness.recalcKeyIndex(db)
		//await Consciousness.insertItems(db) //insert items

		//await Consciousness.recalcRepresentSheet(db)
		//await Consciousness.recalcRepresentCol_bySource(db, source_id)
		await Consciousness.recalcMaster(db)
		return

		await Consciousness.recalcWinner(db)//await Consciousness.recalcWinner(db)
		//await Consciousness.recalcAppear(db)
		//Consciousness.recalcRowSearch(db) //Асинхронно расчитывается, не зависит от расчёта represent
		await Consciousness.recalcItemSearch(db) //Асинхронно расчитывается, не зависит от расчёта represent
	}, true)
	view.data.cls = represent.calcCls(
		1, 
		newvalue, 
		entity.represent_entity
	)
	return view.ret()
})

rest.addAction('set-represent_prop', ['admin'], async view => {
	const db = await view.get('db')
	
	const prop_id = await view.get('prop_id#required')
	const prop = await Sources.getProp(db, prop_id)
	
	const value = await db.col(`
		SELECT represent_prop + 0
		FROM sources_props
		WHERE prop_id = :prop_id
	`, {prop_id})

	const newvalue = Number(!value)
	
	await db.exec(`
		UPDATE sources_props 
		SET represent_prop = :newvalue
   		WHERE prop_id = :prop_id
	`, {prop_id, newvalue})


	Recalc.recalc(db, async () => {
		//await Consciousness.recalcEntitiesPropId(db)
		//await Consciousness.recalcMulti(db)
		//await Consciousness.recalcTexts(db)
		//await Consciousness.recalcKeyIndex(db)
		//await Consciousness.insertItems(db) //insert items		

		//await Consciousness.recalcRepresentSheet(db)
		//await Consciousness.recalcRepresentCol_bySource(db, source_id)
		//await Consciousness.recalcMaster(db)
		return

		
		await Consciousness.recalcWinner(db)//await Consciousness.recalcWinner(db)
		//await Consciousness.recalcAppear(db)
		//Consciousness.recalcRowSearch(db) //Асинхронно расчитывается, не зависит от расчёта represent
		await Consciousness.recalcItemSearch(db) //Асинхронно расчитывается, не зависит от расчёта represent
	}, true)
	view.data.cls = `${defcustom(newvalue)}`
	return view.ret()
})
// rest.addAction('set-represent_value', ['admin'], async view => {
// 	const db = await view.get('db')
// 	const prop_id = await view.get('prop_id#required')
// 	const prop = await Sources.getProp(db, prop_id)
// 	const entity_id = prop_id
// 	const value_id = await view.get('value_id#required')
// 	const value_nick = await db.col('select value_nick from sources_values where value_id = :value_id', {value_id})
// 	const entity = await Sources.getEntity(db, entity_id)
	
// 	const value = await db.col(`
// 		SELECT represent_custom_value + 0
// 		FROM sources_custom_values
// 		WHERE prop_id = :prop_id and value_nick = :value_nick
// 	`, {prop_id, value_nick})

// 	const newvalue = getCustomSwitch(value, entity.represent_values)
	
// 	await db.exec(`
// 		INSERT INTO sources_custom_values (prop_id, value_nick, represent_custom_value)
//    		VALUES (:prop_id, :value_nick, :newvalue)
//    		ON DUPLICATE KEY UPDATE represent_custom_value = VALUES(represent_custom_value)
// 	`, {prop_id, value_nick, newvalue})

// 	Recalc.recalc(db, async () => {
// 		// await Consciousness.recalcEntitiesPropId(db)
// 		// await Consciousness.recalcMulti(db)
// 		// await Consciousness.recalcTexts(db)
// 		// await Consciousness.recalcKeyIndex(db)
// 		// await Consciousness.insertItems(db)

	
// 		//await Consciousness.recalcRepresentSheet(db)
// 		//await Consciousness.recalcRepresentCol(db)
// 		//await Consciousness.recalcMaster(db)
// 		return
// 		await Consciousness.recalcWinner(db)

// 		//await Consciousness.recalcAppear(db)
// 		//Consciousness.recalcRowSearch(db) //Асинхронно расчитывается, не зависит от расчёта represent
// 		await Consciousness.recalcItemSearch(db) //Асинхронно расчитывается, не зависит от расчёта represent		
// 	}, true)
// 	view.data.cls = represent.calcCls(
// 		entity.represent_entity, 
// 		newvalue, 
// 		entity.represent_values
// 	)
// 	return view.ret()
// })
// rest.addAction('set-represent_item', ['admin'], async view => {
// 	const db = await view.get('db')
	
// 	const entity_id = await view.get('entity_id#required')
// 	const key_id = await view.get('key_id#required')
	
// 	const entity = await Sources.getEntity(db, entity_id)
// 	const item = await Sources.getItem(db, entity_id, key_id)
	
// 	const value = item.represent_custom_value

// 	const newvalue = getCustomSwitch(value, entity.represent_values)
	
// 	await db.exec(`
// 		INSERT INTO sources_custom_values (prop_id, value_nick, represent_custom_value)
//    		VALUES (:entity_id, :key_nick, :newvalue)
//    		ON DUPLICATE KEY UPDATE represent_custom_value = VALUES(represent_custom_value)
// 	`, {...item, newvalue})
	

// 	Recalc.recalc(db, async () => {
// 		// await Consciousness.recalcEntitiesPropId(db)
// 		// await Consciousness.recalcMulti(db)
// 		// await Consciousness.recalcTexts(db)
// 		// await Consciousness.recalcKeyIndex(db)
// 		// await Consciousness.insertItems(db)

	
// 		//await Consciousness.recalcRepresentSheet(db)
// 		//await Consciousness.recalcRepresentCol(db)
// 		//await Consciousness.recalcMaster(db)
// 		return
// 		await Consciousness.recalcWinner_byKey(db, entity_id, key_id)

// 		//await Consciousness.recalcAppear(db)
// 		//Consciousness.recalcRowSearch(db) //Асинхронно расчитывается, не зависит от расчёта represent
// 		await Consciousness.recalcItemSearch_byKey(db, entity_id, key_id) //Асинхронно расчитывается, не зависит от расчёта represent		
// 	}, true)
	
// 	view.data.cls = represent.calcCls(
// 		entity.represent_prop, 
// 		newvalue, 
// 		entity.represent_values
// 	)
// 	return view.ret()
// })

rest.addAction('set-represent_col', ['admin'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const col_title = await view.get('col_title#required')
	const sheet_title = await view.get('sheet_title#required')
	const source = await Sources.getSource(db, source_id)
	const col = await Sources.getCol(db, source_id, sheet_title, col_title)
	const sheet = await Sources.getSheet(db, source_id, sheet_title)
	const value = col.represent_custom_col

	const newvalue = getCustomSwitch(value, source.represent_cols)

	
	await db.exec(`
		INSERT INTO sources_custom_cols (source_id, sheet_title, col_title, represent_custom_col)
   		VALUES (:source_id, :sheet_title, :col_title, :newvalue)
   		ON DUPLICATE KEY UPDATE represent_custom_col = VALUES(represent_custom_col)
	`, {...col, newvalue})

	Recalc.recalc(db, async () => {
		// await Consciousness.recalcEntitiesPropId(db)
		// await Consciousness.recalcMulti(db)
		// await Consciousness.recalcTexts(db)
		// await Consciousness.recalcKeyIndex(db)
		// await Consciousness.insertItems(db)		
		//await Consciousness.recalcRepresentSheet(db)
		await Consciousness.recalcRepresentCol_bySource(db, sheet.source_id)
		//await Consciousness.recalcMaster_bySheet(db, sheet.source_id, sheet.sheet_index)
		return

		
		await Consciousness.recalcWinner_bySheet(db, sheet.source_id, sheet.sheet_index)

		//await Consciousness.recalcAppear(db)
		//Consciousness.recalcRowSearch(db) //Асинхронно расчитывается, не зависит от расчёта represent
		await Consciousness.recalcItemSearch_bySheet(db, sheet.source_id, sheet.sheet_index) //Асинхронно расчитывается, не зависит от расчёта represent		
	}, true)
	view.data.cls = represent.calcCls(col.represent_col, newvalue, source.represent_source)
	col.cls = represent.calcCls(
		source.represent_source && sheet.represent_sheet, 
		newvalue, 
		source.represent_cols
	)
	return view.ret()
})
// rest.addAction('set-represent_row_key', ['admin'], async view => {
// 	const db = await view.get('db')
// 	const source_id = await view.get('source_id#required')
// 	const key_id = await view.get('key_id#required')
// 	const repeat_index = await view.get('repeat_index#required')
// 	const sheet_title = await view.get('sheet_title#required')
// 	const source = await Sources.getSource(db, source_id)
// 	const row = await Sources.getRow(db, source_id, sheet_title, key_id, repeat_index)
// 	const sheet = await Sources.getSheet(db, source_id, sheet_title)
// 	if (!row) return view.err('Строка не найдена')
// 	//row.key = await Sources.getCellByIndex(db, source_id, sheet_title, row_index, row.key_index, 0)
// 	const col = await Sources.getColByIndex(db, source_id, sheet_title, row.key_index)
// 	row.key = await Sources.getCell(db, source_id, sheet_title, key_id, repeat_index, col.col_title, 0)
	
// 	const value = row.key.represent_cell

// 	const newvalue = getCustomSwitch(value, source.represent_cells)

	
// 	await db.exec(`
// 		INSERT INTO sources_custom_cells (source_id, sheet_title, col_title, key_nick, repeat_index, represent_custom_cell)
//    		VALUES (:source_id, :sheet_title, :col_title, :key_nick, :repeat_index, :newvalue)
//    		ON DUPLICATE KEY UPDATE represent_custom_cell = VALUES(represent_custom_cell)
// 	`, {...row.key, newvalue})

// 	Recalc.recalc(db, async () => {
// 		// await Consciousness.recalcEntitiesPropId(db)
// 		// await Consciousness.recalcMulti(db)
// 		// await Consciousness.recalcTexts(db)
// 		// await Consciousness.recalcKeyIndex(db)
// 		// await Consciousness.insertItems(db)
	
// 		//await Consciousness.recalcRepresentSheet(db)
// 		//await Consciousness.recalcRepresentCol(db)
// 		//await Consciousness.recalcMaster(db)
// 		return
// 		await Consciousness.recalcWinner(db)

// 		//await Consciousness.recalcAppear(db)
// 		//Consciousness.recalcRowSearch(db) //Асинхронно расчитывается, не зависит от расчёта represent
// 		await Consciousness.recalcItemSearch(db) //Асинхронно расчитывается, не зависит от расчёта represent		
// 	}, true)
	
// 	view.data.cls = represent.calcCls(
// 		source.represent_source && sheet.represent_sheet && row.represent_row && col.represent_col, 
// 		newvalue, 
// 		source.represent_cells
// 	)
	
// 	return view.ret()
// })
// rest.addAction('set-represent_row', ['admin'], async view => {
// 	const db = await view.get('db')
// 	const source_id = await view.get('source_id#required')
// 	//const row_index = await view.get('row_index#required')
// 	const key_id = await view.get('key_id#required')
// 	const repeat_index = await view.get('repeat_index#required')
// 	const sheet_title = await view.get('sheet_title#required')
// 	const source = await Sources.getSource(db, source_id)
// 	const row = await Sources.getRow(db, source_id, sheet_title, key_id, repeat_index)
// 	const sheet = await Sources.getSheet(db, source_id, sheet_title)
// 	const value = row.represent_custom_row

// 	const newvalue = getCustomSwitch(value, source.represent_rows)

	
// 	await db.exec(`
// 		INSERT INTO sources_custom_rows (source_id, sheet_title, key_nick, repeat_index, represent_custom_row)
//    		VALUES (:source_id, :sheet_title, :key_nick, :repeat_index, :newvalue)
//    		ON DUPLICATE KEY UPDATE represent_custom_row = VALUES(represent_custom_row)
// 	`, {...row, newvalue})

	
// 	Recalc.recalc(db, async () => {
// 		// await Consciousness.recalcEntitiesPropId(db)
// 		// await Consciousness.recalcMulti(db)
// 		// await Consciousness.recalcTexts(db)
// 		// 	// await Consciousness.recalcKeyIndex(db)
// 		// await Consciousness.insertItems(db)

	
// 		//await Consciousness.recalcRepresentSheet(db)
// 		//await Consciousness.recalcRepresentCol(db)
// 		await Consciousness.recalcMaster_bySheet(db, sheet.source_id, sheet.sheet_index)
// 		await Consciousness.recalcWinner_bySheet(db, sheet.source_id, sheet.sheet_index)
// 		return
// 		//await Consciousness.recalcAppear(db)
// 		//Consciousness.recalcRowSearch(db) //Асинхронно расчитывается, не зависит от расчёта represent
// 		await Consciousness.recalcItemSearch_bySheet(db, sheet.source_id, sheet.sheet_index) //Асинхронно расчитывается, не зависит от расчёта represent		
// 	}, true)
// 	view.data.cls = represent.calcCls(
// 		source.represent_source && sheet.represent_sheet && row.represent_row_key, 
// 		newvalue, 
// 		source.represent_rows
// 	)
	
// 	return view.ret()
// })
// rest.addAction('set-represent_cell', ['admin'], async view => {
// 	const db = await view.get('db')
// 	const source_id = await view.get('source_id#required')
// 	//const row_index = await view.get('row_index#required')
// 	//const col_index = await view.get('col_index#required')
// 	const key_id = await view.get('key_id#required')
// 	const repeat_index = await view.get('repeat_index#required')
// 	const col_title = await view.get('col_title#required')
// 	const sheet_title = await view.get('sheet_title#required')
// 	const multi_index = await view.get('multi_index#required')
// 	const source = await Sources.getSource(db, source_id)
// 	const cell = await Sources.getCell(db, source_id, sheet_title, key_id, repeat_index, col_title, multi_index)
// 	const col = await Sources.getCol(db, source_id, sheet_title, col_title)
// 	const row = await Sources.getRow(db, source_id, sheet_title, key_id, repeat_index)
// 	const sheet = await Sources.getSheet(db, source_id, sheet_title)
// 	const value = cell.represent_custom_cell
	
// 	const newvalue = getCustomSwitch(value, source.represent_cells)

	
// 	await db.exec(`
// 		INSERT INTO sources_custom_cells (source_id, sheet_title, col_title, key_nick, repeat_index, represent_custom_cell)
//    		VALUES (:source_id, :sheet_title, :col_title, :key_nick, :repeat_index, :newvalue)
//    		ON DUPLICATE KEY UPDATE represent_custom_cell = VALUES(represent_custom_cell)
// 	`, {...cell, newvalue})

// 	Recalc.recalc(db, async () => {
// 		// await Consciousness.recalcEntitiesPropId(db)
// 		// await Consciousness.recalcMulti(db)
// 		// await Consciousness.recalcTexts(db)
// 		// 	// await Consciousness.recalcKeyIndex(db)
// 		// await Consciousness.insertItems(db)
	
// 		//await Consciousness.recalcRepresentSheet(db)
// 		//await Consciousness.recalcRepresentCol(db)
// 		await Consciousness.recalcMaster_bySheet(db, sheet.source_id, sheet.sheet_index)
// 		return
// 		await Consciousness.recalcWinner_bySheet(db, sheet.source_id, sheet.sheet_index)

// 		//await Consciousness.recalcAppear(db)
// 		//Consciousness.recalcRowSearch(db) //Асинхронно расчитывается, не зависит от расчёта represent
// 		await Consciousness.recalcItemSearch_bySheet(db, sheet.source_id, sheet.sheet_index) //Асинхронно расчитывается, не зависит от расчёта represent		
// 	}, true)
// 	view.data.cls = represent.calcCls(
// 		source.represent_source && sheet.represent_sheet && row.represent_row && col.represent_col && (sheet.key_index == cell.col_index || row.represent_row_key), 
// 		newvalue, 
// 		source.represent_rows
// 	)
// 	return view.ret()
// })
























// rest.addAction('set-row-switch', ['admin'], async view => {
// 	const db = await view.get('db')
// 	const sheet_title = await view.get('sheet_title#required')
// 	const source_id = await view.get('source_id#required')
// 	const repeat_index = await view.get('repeat_index#required')
// 	const key_id = await view.get('key_id#required')
// 	const key_nick = await db.col(`select value_nick from sources_values where value_id = :key_id`, {key_id})
// 	const source = await Sources.getSource(db, source_id)
	
// 	const represent_sheet = await db.col(`
// 		SELECT sh.represent_sheet + 0
// 		FROM sources_sheets sh
// 		WHERE sh.source_id = :source_id and sh.sheet_title = :sheet_title
// 	`, {source_id, sheet_title}) 

// 	const value = await db.col(`
// 		SELECT represent_custom_row + 0
// 		FROM sources_custom_rows
// 		WHERE source_id = :source_id and sheet_title = :sheet_title 
// 			and key_nick = :key_nick
// 			and repeat_index = :repeat_index
// 	`, {source_id, sheet_title, key_nick, repeat_index})

// 	const newvalue = getCustomSwitch(value, source.represent_rows)
	
// 	await db.exec(`
// 		INSERT INTO sources_custom_rows (source_id, sheet_title, key_nick, repeat_index, represent_custom_row)
//    		VALUES (:source_id, :sheet_title, :key_nick, :repeat_index, :newvalue)
//    		ON DUPLICATE KEY UPDATE represent_custom_row = VALUES(represent_custom_row)
// 	`, {source_id, sheet_title, key_nick, repeat_index, newvalue})


// 	await Consequences.represent(db)	
// 	view.data.cls = represent.calcCls(
// 		source.represent_source && represent_sheet, 
// 		newvalue, 
// 		source.represent_rows
// 	)
// 	return view.ret()
// })
// rest.addAction('set-col-switch', ['admin'], async view => {
// 	const db = await view.get('db')
// 	const sheet_title = await view.get('sheet_title#required')
// 	const source_id = await view.get('source_id#required')
// 	const col_title = await view.get('col_title#required')
// 	const source = await Sources.getSource(db, source_id)
	
// 	const represent_sheet = await db.col(`
// 		SELECT sh.represent_sheet + 0
// 		FROM sources_sheets sh
// 		WHERE sh.source_id = :source_id and sh.sheet_title = :sheet_title
// 	`, {source_id, sheet_title}) 

// 	const value = await db.col(`
// 		SELECT represent_custom_col + 0
// 		FROM sources_custom_cols
// 		WHERE source_id = :source_id and sheet_title = :sheet_title and col_title = :col_title
// 	`, {source_id, sheet_title, col_title})

// 	const newvalue = getCustomSwitch(value, source.represent_cols)
	
// 	await db.exec(`
// 		INSERT INTO sources_custom_cols (source_id, sheet_title, col_title, represent_custom_col)
//    		VALUES (:source_id, :sheet_title, :col_title, :newvalue)
//    		ON DUPLICATE KEY UPDATE represent_custom_col = VALUES(represent_custom_col)
// 	`, {source_id, sheet_title, col_title, newvalue})


// 	await Consequences.represent(db)
// 	view.data.cls = represent.calcCls(
// 		source.represent_source && represent_sheet, 
// 		newvalue, 
// 		source.represent_cols
// 	)
// 	return view.ret()
// })

