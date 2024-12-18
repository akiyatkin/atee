import os from 'node:os'
import process from 'node:process'
import path from 'node:path'
import fs from 'node:fs/promises'

import Access from "/-controller/Access.js"
import nicked from '/-nicked'
import config from "/-config"
import Sources from "/-sources/Sources.js"
import eye from "/-sources/represent.js"

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
		SELECT co.prop_id, ce.text, count(ce.text) as count, ce.pruning + 0 as pruning, ce.represent + 0 as represent, 
			ce.winner + 0 as winner, 
			ce.date, 
			ce.number, ce.value_id, va.value_title, va.value_nick
		FROM sources_cols co, sources_cells ce
			LEFT JOIN sources_values va on va.value_id = ce.value_id
		WHERE co.source_id = ce.source_id 
			and co.sheet_index = ce.sheet_index 
			and co.col_index = ce.col_index
			and co.prop_id = :prop_id
		GROUP BY ce.text, ce.represent, ce.winner
		ORDER BY ce.pruning DESC, ce.winner DESC, count(ce.text) DESC
	`, {prop_id})
	view.data.count = list.length
	view.data.list = list.slice(0, 1000)
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
	console.log(view.ans.list)
	return view.ret()
})
rest.addResponse('sheet', ['admin'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const source = view.data.source = await Sources.getSource(db, source_id)
	const entity = view.data.entity = source.entity_id && await Sources.getEntity(db, source.entity_id)
	const sheet_index = await view.get('sheet_index#required')
	const sheet = view.data.sheet = await db.fetch(`
		SELECT sh.sheet_title, sh.key_index, sh.sheet_index, sh.entity_id,
			sh.represent_sheet + 0 as represent_sheet
		FROM sources_sheets sh
			left join sources_custom_sheets csh on (csh.source_id = sh.source_id and csh.sheet_title = sh.sheet_title)
		WHERE sh.source_id = :source_id and sh.sheet_index = :sheet_index
	`, {source_id, sheet_index}) 
	
	view.ans.date_max = await db.col(`
		SELECT UNIX_TIMESTAMP(max(ap.date_appear))
		FROM sources_appears ap
		WHERE ap.source_id = :source_id
	`, source)
	view.ans.date_min = await db.col(`
		SELECT UNIX_TIMESTAMP(min(ap.date_appear))
		FROM sources_appears ap
		WHERE ap.source_id = :source_id
	`, source)
	

	return view.ret()
})
rest.addResponse('sheet-table', ['admin'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const source = view.data.source = await Sources.getSource(db, source_id)
	let date = await view.get('date')
	
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
		col.cls = eye.calcCls(
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
		row.cls = eye.calcCls(
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
		prunings[text_index][col_index] = pruning

		texts[text_index] ??= []
		texts[text_index][col_index] ??= []
		texts[text_index][col_index][multi_index] = text

		winners[text_index] ??= []
		winners[text_index][col_index] ??= []
		winners[text_index][col_index][multi_index] = winner
	}
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
			en.entity_plural,
			en.entity_title,
			pr.prop_title

		FROM sources_custom_sheets csh
			LEFT JOIN sources_sources so on so.source_id = csh.source_id
			LEFT JOIN sources_entities en on en.entity_id = nvl(csh.entity_id, so.entity_id)
			LEFT JOIN sources_props pr on pr.prop_id = en.prop_id
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
			en.entity_plural,
			en.entity_title,
			pr.prop_title
		FROM sources_sheets sh
		LEFT JOIN sources_entities en on en.entity_id = sh.entity_id
		LEFT JOIN sources_props pr on pr.prop_id = en.prop_id
		WHERE sh.source_id = :source_id
		ORDER by sh.sheet_index
	`, source)

	// const stat = view.data.stat ??= {}
	// stat.sheets = loaded_sheets.length
	// stat.rows = await db.col(`
	// 	SELECT count(*)
	// 	FROM sources_rows ro
	// 	WHERE ro.source_id = :source_id
	// `, source)


	const sheets = {}
	for (const descr of loaded_sheets) {
		descr.count_rows = await db.col(`
			SELECT count(*) 
			FROM sources_rows 
			WHERE source_id = :source_id and sheet_index = :sheet_index
		`, descr)
		descr.count_keys = await db.col(`
			SELECT count(*) 
			FROM sources_rows 
			WHERE source_id = :source_id and sheet_index = :sheet_index and key_id is not null
		`, descr)
		descr.loaded = true
	}
	for (const descr of custom_sheets) descr.custom = true
	for (const descr of [...loaded_sheets, ...custom_sheets]) {
		const sheet = sheets[descr.sheet_title] ??= {source_id, sheet_title: descr.sheet_title}
		sheet.entity_title = descr.entity_title
		sheet.entity_plural = descr.entity_plural
		sheet.prop_title = descr.prop_title
		delete descr.entity_title
		delete descr.prop_title
		delete descr.entity_plural
		delete descr.sheet_title
		sheet.remove ||= descr.custom
		sheet[descr.loaded ? 'loaded' : 'custom'] = descr
	}
	view.data.sheets = Object.values(sheets)
	for (const sheet of view.data.sheets) {
		sheet.remove ||= await db.col(`
			SELECT 1 FROM sources_custom_cols
			WHERE source_id = :source_id and sheet_title = :sheet_title
			LIMIT 1
		`, sheet)
		sheet.remove ||= await db.col(`
			SELECT 1 FROM sources_custom_rows
			WHERE source_id = :source_id and sheet_title = :sheet_title
			LIMIT 1
		`, sheet)
		sheet.remove ||= await db.col(`
			SELECT 1 FROM sources_custom_cells
			WHERE source_id = :source_id and sheet_title = :sheet_title
			LIMIT 1
		`, sheet)		
		sheet.cls = eye.calcCls(source.represent_source, sheet.custom?.represent_custom_sheet, source.represent_sheets)
	}
	
	return view.ret()
})
