import os from 'node:os'
import process from 'node:process'
import path from 'node:path'
import fs from 'node:fs/promises'

import Access from "/-controller/Access.js"
import nicked from '/-nicked'
import config from "/-config"
import Sources from "/-sources/Sources.js"
import represent from "/-sources/represent.js"
import Rest from "/-rest"
const rest = new Rest()

import rest_set from '/-sources/rest.set.js'
rest.extra(rest_set)

import rest_get from '/-sources/rest.get.js'
rest.extra(rest_get)

import rest_sources from '/-sources/rest.sources.js'
rest.extra(rest_sources)

import rest_represent from '/-sources/rest.represent.js'
rest.extra(rest_represent)

import rest_search from '/-dialog/search/rest.search.js'
rest.extra(rest_search)

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
	const entity = view.data.entity = await Sources.getEntity(db, entity_id)
	const list = await Sources.getProps(db, entity_id)
	view.data.list = list.slice(0, 1000)
	return view.ret()
})
rest.addResponse('prop', ['admin'], async view => {
	const db = await view.get('db')
	const prop_id = await view.get('prop_id#required')
	const prop = view.data.prop = await Sources.getProp(db, prop_id)
	const entity = view.data.entity = await Sources.getEntity(db, prop.entity_id)

	const list = await db.all(`
		SELECT co.prop_id, ce.text, count(ce.text) as count, 
			ce.pruning + 0 as pruning, 
			max(ce.represent) + 0 as represent, 
			max(ce.winner) + 0 as winner, 
			ce.date, 
			ce.number, ce.value_id, va.value_title, va.value_nick
		FROM sources_cols co, sources_cells ce
			LEFT JOIN sources_values va on va.value_id = ce.value_id
		WHERE co.source_id = ce.source_id 
			and co.sheet_index = ce.sheet_index 
			and co.col_index = ce.col_index
			and co.prop_id = :prop_id
			and ce.text != ''
		GROUP BY ce.text
		ORDER BY ce.pruning DESC, count(ce.text) DESC
	`, {prop_id})
	const custom = await db.allto('value_id', `
		SELECT cva.value_id, cva.represent_custom_value + 0 as represent_custom_value
		FROM sources_custom_values cva
		WHERE prop_id = :prop_id
	`, {prop_id})
	
	for (const value of list) {
		value.cls = represent.calcCls(
			entity.represent_entity && prop.represent_prop, 
			custom[value.value_id]?.represent_custom_value, 
			entity.represent_values
		)

	}
	view.data.count = list.length
	view.data.list = list
	//view.data.list = list.slice(0, 1000)
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
const mb = (b) => Math.round((b || 0) / 2024 / 2024 * 100) / 100
const dirSize = async dir => {
	const files = await fs.readdir( dir, { withFileTypes: true } )
	const paths = files.map( async file => {
		const src = path.join( dir, file.name )
		if ( file.isDirectory() ) return await dirSize( src )
		if ( file.isFile() ) {
			const { size } = await fs.stat( src )
			return size
		}
		return 0
	})
	return ( await Promise.all( paths ) ).flat( Infinity ).reduce( ( i, size ) => i + size, 0 )
}
const getAllFiles = async (dirPath, arrayOfFiles) => {
	const files = await fs.readdir(dirPath)

	arrayOfFiles = arrayOfFiles || []
	for (const file of files) {
		if ((await fs.stat(dirPath + "/" + file)).isDirectory()) {
			arrayOfFiles = await getAllFiles(dirPath + "/" + file, arrayOfFiles)
		} else {
			arrayOfFiles.push(path.join('.', dirPath, file))
		}
	}

	return arrayOfFiles
}

const convertBytes = bytes => {
	const sizes = ["б", "Кб", "Мб", "Гб", "Тб"]

	if (bytes == 0) {
		return "n/a"
	}

	const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)))

	if (i == 0) {
		return bytes + " " + sizes[i]
	}

	return (bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i]
}

const getTotalSize = async directoryPath => {
	const arrayOfFiles = await getAllFiles(directoryPath)

	let totalSize = 0

	for (const filePath of arrayOfFiles) {
		totalSize += (await fs.stat(filePath)).size
	}

	return convertBytes(totalSize)
}
rest.addResponse('memory', ['admin'], async view => {
	const db = await view.get('db')
	view.data.os = {}
	view.data.os.freemem = convertBytes(os.freemem())
	view.data.os.totalmem = convertBytes(os.totalmem())

	view.data.process = {}
	const memoryData = process.memoryUsage()
	view.data.process.rss = convertBytes(memoryData.rss)
	view.data.process.heapTotal = convertBytes(memoryData.heapTotal)
	view.data.process.heapUsed = convertBytes(memoryData.heapUsed)
	view.data.process.external = convertBytes(memoryData.external)

	view.data.fs = {}
	view.data.fs.data = await getTotalSize('./data')
	view.data.fs.cache = await getTotalSize('./cache')

	return view.ret()
})
rest.addResponse('disappear', ['admin'], async view => {
	const db = await view.get('db')

	const variations = view.data.variations = Object.groupBy(await db.all(`
		SELECT distinct so.source_id, so.source_title, en.entity_id, en.entity_title, en.entity_plural
		FROM sources_appears ap, sources_entities en, sources_sources so
		WHERE ap.source_id = so.source_id and ap.entity_id = en.entity_id
	`), ({ entity_id }) => entity_id)
	
	return view.ret()
})
rest.addResponse('disappear-table', ['admin'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id')
	const entity_id = await view.get('entity_id')
	if (!entity_id) return view.err('Требуется сущность')
	const entity = view.data.entity = await Sources.getEntity(db, entity_id)
	if (source_id) {
		view.ans.list = await db.all(`
			SELECT ap.key_id, va.value_title, so.source_id, so.source_title, ap.date_disappear, ap.date_appear
			FROM sources_appears ap, sources_values va, sources_sources so
			WHERE ap.entity_id = :entity_id 
				and ap.source_id = :source_id
				and so.source_id = ap.source_id
				and va.value_id = ap.key_id
				and ap.date_disappear is not null
			ORDER BY ap.date_disappear DESC
		`, {source_id, entity_id})
	} else {
		view.ans.list = await db.all(`
			SELECT ap.key_id, va.value_title, so.source_id, so.source_title, ap.date_disappear, ap.date_appear
			FROM sources_appears ap, sources_values va, sources_sources so
			WHERE ap.entity_id = :entity_id 
				and so.source_id = ap.source_id
				and va.value_id = ap.key_id
				and ap.date_disappear is not null
		`, {entity_id})
	}
	return view.ret()
})
rest.addResponse('position', ['admin'], async view => {
	const db = await view.get('db')
	const entity_id = await view.get('entity_id#required')
	const key_id = await view.get('key_id#required')
	const entity = view.data.entity = await Sources.getEntity(db, entity_id)
	const item = view.data.item = await Sources.getItem(db, entity_id, key_id)
	return view.ret()
})
rest.addResponse('position-table', ['admin'], async view => {
	const db = await view.get('db')
	const entity_id = await view.get('entity_id#required')
	const key_id = await view.get('key_id#required')
	const entity = view.data.entity = await Sources.getEntity(db, entity_id)
	
	const item = view.data.item = await Sources.getItem(db, entity_id, key_id)
	

	let cells = await db.all(`
		SELECT
			ce.number, 
			ce.date, 
			ce.text,
			
			ce.sheet_index,
			ce.source_id,
			ce.row_index,
			ce.col_index,
			ce.multi_index,

			sh.sheet_title,
			so.source_title,
			va.value_title as value, 
			co.prop_id, 
			pr.prop_title,
			ce.winner + 0 as winner,
			ce.represent + 0 as represent,
			ce.pruning + 0 as pruning,
			ro.key_id
		FROM sources_sheets sh, sources_sources so, sources_rows ro, sources_items it, sources_cols co, sources_props pr, sources_cells ce
			LEFT JOIN sources_values va on (va.value_id = ce.value_id)
		WHERE 
			sh.entity_id = :entity_id
			and so.source_id = sh.source_id
			and ro.source_id = sh.source_id
			and ro.sheet_index = sh.sheet_index 
			and ro.key_id = :key_id
			and it.entity_id = sh.entity_id
			and it.key_id = ro.key_id
			and co.source_id = sh.source_id
			and co.sheet_index = sh.sheet_index

			and pr.prop_id = co.prop_id

			and ce.source_id = sh.source_id
			and ce.sheet_index = sh.sheet_index
			and ce.row_index = ro.row_index
			and ce.col_index = co.col_index
		ORDER BY so.ordain, sh.sheet_index, ro.row_index, pr.ordain, ce.multi_index
	`, {entity_id, key_id})
	cells = Object.values(Object.groupBy(cells, (cell => cell.prop_id)))
	for (const i in cells) {
		cells[i] = Object.values(Object.groupBy(cells[i], (cell => [cell.source_id, cell.sheet_index, cell.row_index, cell.cell_index].join(':'))))
	}
	view.data.cells = cells
	return view.ret()
})
rest.addResponse('positions', ['admin'], async view => {
	const db = await view.get('db')
	const entity_id = await view.get('entity_id#required')
	const entity = view.data.entity = await Sources.getEntity(db, entity_id)
	const search = view.get('search')
	return view.ret()
})
rest.addResponse('positions-table', ['admin'], async view => {
	const db = await view.get('db')
	const entity_id = await view.get('entity_id#required')
	const entity = view.data.entity = await Sources.getEntity(db, entity_id)
	const hashs = await view.get('hashs')

	
	const where_search = []
	if (!hashs.length) where_search = ['1=1']
	for (const hash of hashs) {
		const sql = 'it.search like "% ' + hash.join('%" and it.search like "') + '%"'
		where_search.push(sql)
	}

	const props = await db.allto('prop_id', `
		SELECT
			pr.prop_id, pr.prop_title, pr.type
		FROM sources_props pr
		WHERE pr.entity_id = :entity_id 
			and pr.type != "text"
		ORDER BY pr.ordain
	`, {entity_id})

	const list = view.data.list = await db.all(`
		SELECT
			ce.number, 
			ce.date, 
			va.value_title as value, 
			co.prop_id, 
			ro.key_id
		FROM sources_sheets sh, sources_sources so, sources_rows ro, sources_items it, sources_cols co, sources_props pr, sources_cells ce
			LEFT JOIN sources_values va on (va.value_id = ce.value_id)
		WHERE 
			sh.entity_id = :entity_id
			and so.source_id = sh.source_id
			and ro.source_id = sh.source_id
			and ro.sheet_index = sh.sheet_index 

			and it.entity_id = sh.entity_id
			and it.key_id = ro.key_id
			and (${where_search.join(' or ')})
			and co.source_id = sh.source_id
			and co.sheet_index = sh.sheet_index

			and pr.prop_id = co.prop_id

			and ce.source_id = sh.source_id
			and ce.sheet_index = sh.sheet_index
			and ce.row_index = ro.row_index
			and ce.col_index = co.col_index
			and ce.winner = 1
			and (ce.number is not null or ce.value_id is not null or ce.date is not null)
		ORDER BY so.ordain, sh.sheet_index, ro.row_index, ce.multi_index
	`, {entity_id})

	const rows = view.data.rows = Object.values(Object.groupBy(list, (row => row.key_id)))

	for (const i in rows) {
		const row = rows[i]
		const byprop = {}
		for (const cell of row) {

			props[cell.prop_id].finded = true
			const type = props[cell.prop_id].type
			byprop[cell.prop_id] ??= []
			let val = cell[type]
			if (type == 'number') val = Number(val)
			byprop[cell.prop_id].push(val)
		}
		rows[i] = [row[0].key_id, byprop]
	}
	view.data.props = Object.values(props).filter(prop => prop.finded)
	return view.ret()
})
rest.addResponse('sheet', ['admin'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const source = view.data.source = await Sources.getSource(db, source_id)
	const entity = view.data.entity = source.entity_id && await Sources.getEntity(db, source.entity_id)
	
	
	
	return view.ret()
})
rest.addResponse('sheet-sheet', ['admin'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const source = view.data.source = await Sources.getSource(db, source_id)
	const entity = view.data.entity = source.entity_id && await Sources.getEntity(db, source.entity_id)
	const sheets = view.data.sheets = await Sources.getSheets(db, source_id)
	const sheet_index = await view.get('sheet_index#required')
	
	const sheet = view.data.sheet = await db.fetch(`
		SELECT sh.sheet_title, sh.sheet_index, sh.key_index, sh.sheet_index, sh.entity_id,
			sh.represent_sheet + 0 as represent_sheet
		FROM sources_sheets sh
			left join sources_custom_sheets csh on (csh.source_id = sh.source_id and csh.sheet_title = sh.sheet_title)
		WHERE sh.source_id = :source_id and sh.sheet_index = :sheet_index
	`, {source_id, sheet_index}) 
	
	view.data.count = await db.col(`
		select count(*) from sources_cells
		WHERE source_id = :source_id
	`, source)
	view.ans.date_min = await db.col(`
		SELECT UNIX_TIMESTAMP(min(ap.date_appear))
		FROM sources_appears ap
		WHERE ap.source_id = :source_id
	`, source)
	view.ans.date_max = await db.col(`
		SELECT UNIX_TIMESTAMP(max(ap.date_appear))
		FROM sources_appears ap
		WHERE ap.source_id = :source_id
	`, source)
	return view.ret()
})


rest.addResponse('sheet-table', ['admin'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const source = view.data.source = await Sources.getSource(db, source_id)
	
	const hashs = await view.get('hashs')

	
	const where_search = []
	if (!hashs.length) where_search = ['1=1']
	for (const hash of hashs) {
		const sql = 'ro.search like "% ' + hash.join('%" and ro.search like "') + '%"'
		where_search.push(sql)
	}

	let date = await view.get('date')
	
	view.ans.date_min = await db.col(`
		SELECT UNIX_TIMESTAMP(min(ap.date_appear))
		FROM sources_appears ap
		WHERE ap.source_id = :source_id
	`, source)
	view.ans.date_max = await db.col(`
		SELECT UNIX_TIMESTAMP(max(ap.date_appear))
		FROM sources_appears ap
		WHERE ap.source_id = :source_id
	`, source)
	// view.ans.date_min = await db.col(`
	// 	SELECT UNIX_TIMESTAMP(min(ap.date_appear))
	// 	FROM sources_appears ap
	// 	WHERE ap.source_id = :source_id
	// `, source)
	if (!date) date = view.ans.date_max
	view.ans.date = date
	
	
	const entity = view.data.entity = source.entity_id && await Sources.getEntity(db, source.entity_id)
	const sheet_index = await view.get('sheet_index#required')
	const sheet = view.data.sheet = await db.fetch(`
		SELECT sh.sheet_title, sh.key_index, sh.sheet_index, sh.entity_id,
			sh.represent_sheet + 0 as represent_sheet
		FROM sources_sheets sh
			left join sources_custom_sheets csh on (csh.source_id = sh.source_id and csh.sheet_title = sh.sheet_title)
		WHERE sh.source_id = :source_id and sh.sheet_index = :sheet_index
	`, {source_id, sheet_index}) 
	const sheet_title = sheet.sheet_title
	const cols = view.data.cols = await db.all(`
		SELECT co.col_index, co.col_title, co.prop_id, pr.prop_title,
			cco.represent_custom_col + 0 as represent_custom_col
		FROM sources_cols co
			LEFT JOIN sources_custom_cols cco on cco.source_id = :source_id and cco.col_title = co.col_title
			LEFT JOIN sources_props pr on pr.prop_id = co.prop_id
		WHERE co.source_id = :source_id and co.sheet_index = :sheet_index
		ORDER BY co.col_index
	`, {source_id, sheet_index}) 
	for (const col of cols) {
		col.cls = represent.calcCls(
			source.represent_source && sheet.represent_sheet, 
			col.represent_custom_col, 
			source.represent_cols
		)
	}
	const rows = view.ans.rows = await db.all(`
		SELECT 
			ro.row_index,
			ro.key_id,
			ro.represent_row_key + 0 as represent_row_key,
			ro.represent_row + 0 as represent_row,
			ro.repeat_index,
			ap.date_appear
		FROM sources_rows ro
			LEFT JOIN sources_sheets sh on (sh.source_id = ro.source_id and sh.sheet_index = ro.sheet_index)
			LEFT JOIN sources_appears ap on (ap.source_id = ro.source_id and ap.key_id = ro.key_id and ap.entity_id = sh.entity_id)
		WHERE ro.source_id = :source_id and ro.sheet_index = :sheet_index
		and (ap.date_appear is null or ap.date_appear >= FROM_UNIXTIME(:date))
		ORDER BY ro.row_index
	`, {source_id, sheet_index, date})


	const custom_rows = await db.all(`
		SELECT 
			cro.key_id,
			cro.repeat_index, 
			cro.represent_custom_row + 0 as represent_custom_row
		FROM sources_custom_rows cro
		WHERE cro.source_id = :source_id and cro.sheet_title = :sheet_title
	`, {source_id, sheet_title})
	const crows = {}
	for (const {key_id, repeat_index, represent_custom_row} of custom_rows) {
		crows[key_id] ??= {}
		crows[key_id][repeat_index] = represent_custom_row
	}

	for (const row of rows) {
		row.cls = represent.calcCls(
			source.represent_source && sheet.represent_sheet, 
			crows[row.key_id]?.[row.repeat_index], 
			source.represent_rows
		)
	}

	const cells = await db.all(`
		SELECT 
			ce.row_index, 
			ce.col_index, 
			ce.multi_index,
			ce.text,
			ce.pruning + 0 as pruning,
			ce.represent_cell + 0 as represent_cell,
			ce.represent + 0 as represent,
			ce.winner + 0 as winner
		FROM sources_cells ce
			LEFT JOIN sources_rows ro on (ro.source_id = ce.source_id and ro.sheet_index = ce.sheet_index and ro.row_index = ce.row_index)
			LEFT JOIN sources_sheets sh on (sh.source_id = ce.source_id and sh.sheet_index = ce.sheet_index)
			LEFT JOIN sources_appears ap on (ap.key_id = ro.key_id and ap.source_id = ce.source_id and ap.entity_id = sh.entity_id)
		WHERE ce.source_id = :source_id and ce.sheet_index = :sheet_index
		and (ap.date_appear is null or ap.date_appear >= FROM_UNIXTIME(:date))
		ORDER BY ce.row_index, ce.col_index
	`, {source_id, sheet_index, date}) 

	const texts = view.data.texts = []
	const winners = view.data.winners = []
	const prunings = view.data.prunings = []
	let text_index = -1
	let last_row_index = -1
	for (const {row_index, col_index, multi_index, text, winner, pruning} of cells) {
		if (last_row_index != row_index) text_index++
		last_row_index = row_index

		prunings[text_index] ??= []
		prunings[text_index][col_index] &&= pruning

		texts[text_index] ??= []
		texts[text_index][col_index] ??= []

		let adjust = text.replace(/<(.|\n)*?>/g, '').trim()
		//adjust = 'Тумбовая сетевая проходная «STL-03NM»'

		if (adjust.length > 31) {
			//adjust = safeSubstring(adjust, 0, 31) + '... <small class="mute">' + adjust.length + '</small>'
			adjust = adjust.slice(0, 31) + '...' //+ ' <small class="mute">' + adjust.length + '</small>'
			//adjust = adjust.substr(0, 31) + '... <small class="mute">' + adjust.length + '</small>'
			//console.log(new TextEncoder().encode(adjust))
			//adjust = adjust.match(LIMREG)[0]

		}
		texts[text_index][col_index][multi_index] = adjust

		winners[text_index] ??= []
		winners[text_index][col_index] ??= []
		winners[text_index][col_index][multi_index] = winner
	}
	for (const text_index in texts) {
		for (const {col_index} of cols) {
			texts[text_index][col_index] ??= [null]
			prunings[text_index][col_index] ??= 0
			winners[text_index][col_index] ??= [0]
		}

	}
	return view.ret()
})
rest.addResponse('source', ['admin'], async view => {
	
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const source = view.data.source = await Sources.getSource(db, source_id)
	
	const sheets = view.data.sheets = await Sources.getSheets(db, source_id)
	
	
	return view.ret()
})
