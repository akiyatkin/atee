import os from 'node:os'
import process from 'node:process'
import path from 'node:path'
import fs from 'node:fs/promises'
import Recalc from "/-sources/Recalc.js"
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


rest.addResponse('rows', ['admin'], async view => {
	const db = await view.get('db')
	const hashs = await view.get('hashs')
	
	/*
			
			*/
	
	const rows = await db.all(`
		SELECT
			ro.key_id,
			sh.key_index,
			so.source_title, 
			so.source_id,
			sh.sheet_title, 
			sh.sheet_index, 
			ro.source_id, 
			ro.sheet_index, 
			ro.row_index
		FROM 
			sources_rows ro, 
			sources_sheets sh,
			sources_sources so
		WHERE 
			sh.source_id = ro.source_id
			and sh.sheet_index = ro.sheet_index
			and so.source_id = ro.source_id
			
			and (${hashs.map(hash => 'ro.search like "% ' + hash.join('%" and ro.search like "% ') + '%"').join(' or ') || 'ro.search != ""'}) 
		ORDER BY RAND()
		LIMIT 25
	`)
	//and (${hashs.map(hash => 'ro.search like "% ' + hash.join('%" and ro.search like "% ') + '%"').join(' or ') || 'ro.search != ""'}) 
	//const sql = 'ro.search like "% ' + hash.join('%" and ro.search like "% ') + '%"'
	view.data.count = await db.col(`
		SELECT count(*)
		FROM 
			sources_rows ro, 
			sources_sheets sh,
			sources_sources so
		WHERE 
			sh.source_id = ro.source_id
			and sh.sheet_index = ro.sheet_index
			and so.source_id = ro.source_id
			and (${hashs.map(hash => 'ro.search like "% ' + hash.join('%" and ro.search like "% ') + '%"').join(' or ') || 'ro.search != ""'}) 
	`)
	
	for (const row of rows) {
		const props = await db.all(`
			SELECT 
				co.col_title,
				co.col_index,
				ce.pruning + 0 as pruning, 
				GROUP_CONCAT(ce.text SEPARATOR ", ") AS text, 
				COUNT(*) AS cnt, 
				nvl(wce.entity_id, "") as winner
			FROM 
				sources_cols co,
				sources_cells ce
					left join sources_wcells wce on (wce.source_id = ce.source_id and wce.sheet_index = ce.sheet_index and wce.row_index = ce.row_index and wce.col_index = ce.col_index)
			WHERE 
			ce.source_id = :source_id
			and ce.sheet_index = :sheet_index
			and ce.row_index = :row_index

			

			and co.source_id = ce.source_id
			and co.sheet_index = ce.sheet_index
			and co.col_index = ce.col_index

			
			
			GROUP BY ce.source_id, ce.sheet_index, ce.row_index, ce.col_index
		`, row)

		row.cols = {}
		for (const prop of props) {
			prop.text = prop.text.replaceAll(/<[^>]+>/g, ' ')
			if (prop.text.length > 31) prop.text = prop.text.slice(0,30) + '…'
			row.cols[prop.col_title] = prop
		}
	}
	

	//rows = [row, row]

	const table = view.data.table = await Sources.getTable(db, rows) //table = {head: [prop_title], rows:{..., cols: [cell]}
	
	return view.ret()
})

rest.addResponse('settings', ['admin'], async view => {

	const conf = await config('sources')
	view.data.dir = conf.dir
	view.data.exporttables = rest_sources.exporttables

	const db = await view.get('db')
	view.data.loads = await db.col(`
		SELECT count(*) FROM sources_sources
		WHERE date_start is not null
	`)
	

	

	// Статистика пула
	const pool = db.pool.pool
	view.data.pool = {}
	view.data.pool['Текущая очередь'] = pool._queue ? pool._queue.length : 0;
	view.data.pool['Всего соединений'] = pool._allConnections ? pool._allConnections.length : 0;
	view.data.pool['Свободных соединений'] = pool._freeConnections ? pool._freeConnections.length : 0;
	view.data.pool['Ожидающих запросов'] = pool._allConnections && pool._freeConnections ? pool._allConnections.length - pool._freeConnections.length : 0;


    view.data.prepared_count = (await db.fetch(`SHOW GLOBAL STATUS LIKE "Prepared_stmt_count"`)).Value
	view.data.connections_count = (await db.fetch(`SHOW STATUS WHERE variable_name = "Threads_connected"`)).Value
	view.data.values = await db.col(`SELECT count(*) FROM sources_values`)
	view.data.sources = await db.col(`SELECT count(*) FROM sources_sources`)
	view.data.entities = await db.col(`SELECT count(*) FROM sources_props pr, sources_sheets sh WHERE sh.entity_id = pr.prop_id`)
	view.data.items = await db.col(`SELECT count(*) FROM sources_items`)
	view.data.rows = await db.col(`SELECT count(*) FROM sources_rows`)
	view.data.cells = await db.col(`
		SELECT 
			count(DISTINCT source_id, sheet_index, row_index, col_index) 
		FROM sources_cells 
	`)


	view.data.date_access = Math.round(Access.getAccessTime() / 1000)
	view.data.date_update = Math.round(Access.getUpdateTime() / 1000)

		
	view.data.tables = await db.estimate(rest_sources.TABLES)
	

	return view.ret()
})

rest.addResponse('main', async view => {
	const isdb = await view.get('isdb')
	const hashs = await view.get('hashs')
	view.data.admin = await Access.isAdmin(view.visitor.client.cookie)
	view.data.isdb = !!isdb
	if (!view.data.admin || !view.data.isdb) return view.err()
	
	const conf = await config('sources')
	view.data.dir = conf.dir

	const db = await view.get('db')
	view.data.comment = await db.col(`select comment from sources_settings`)
	const list = view.data.list = await Sources.getSources(db, hashs)
	
	if (!list.length) return view.err('Источники не найдены')

	const rows = await db.allto('source_id', `
		SELECT source_id, count(*) as count
		FROM sources_rows 
		WHERE source_id in (${list.map(source => source.source_id).join(",")})
		GROUP BY source_id
	`)
	
	const news = await db.allto('source_id', `
		SELECT ro.source_id, count(distinct co.col_title) as count
		FROM 
			sources_rows ro, 
			sources_cols co 
		WHERE ro.source_id = co.source_id and ro.sheet_index = co.sheet_index
		AND co.prop_id is null AND co.represent_col = 1 
		GROUP BY ro.source_id
	`)
	
	const prunings = await db.allto('source_id', `
		SELECT ce.source_id, count(distinct co.prop_id) as count
		FROM sources_cells ce, sources_cols co
		WHERE 
			ce.pruning = 1	
			and co.source_id = ce.source_id and co.sheet_index = ce.sheet_index and co.col_index = ce.col_index
		
		GROUP BY co.source_id
	`)
	
	for (const source of list) {
		source.rows = rows[source.source_id]?.count || 0
		source.news = news[source.source_id]?.count || 0
		source.prunings = prunings[source.source_id]?.count || 0
		source.cls = represent.calcCls(
			1, 
			null,
			source.represent_source
		)
	}
	// for (const source of list) {
		
	// 	// source.rows = await db.col(`
	// 	// 	SELECT count(*) 
	// 	// 	FROM sources_rows 
	// 	// 	WHERE source_id = :source_id
	// 	// `, source)
		
		
	// 	// source.news = await db.col(`
	// 	// 	SELECT count(distinct co.col_title)
	// 	// 	FROM 
	// 	// 		sources_rows ro, 
	// 	// 		sources_cols co 
	// 	// 	WHERE co.source_id = :source_id 
	// 	// 	and ro.source_id = co.source_id and ro.sheet_index = co.sheet_index
	// 	// 	AND co.prop_id is null AND co.represent_col = 1 
	// 	// `, source)
		
	// 	source.prunings = await db.col(`
	// 		SELECT count(DISTINCT co.prop_id)
	// 		FROM sources_cells ce, sources_cols co
	// 		WHERE
	// 		co.source_id = :source_id
	// 		and co.source_id = ce.source_id and co.sheet_index = ce.sheet_index and co.col_index = ce.col_index
	// 		and ce.pruning = 1	
	// 	`, source)
		
	// }
	
	

	// for (const source of list) {
	// 	source.entities = await db.colAll(`
	// 		select e.entity_plural 
	// 		FROM sources_custom_sheets cs, sources_entities e
	// 		WHERE cs.source_id = :source_id 
	// 		and (e.entity_id = :entity_id or e.entity_id = cs.entity_id)
	// 	`, source)
	// }


	
	return view.ret()
})
rest.addResponse('props', ['admin'], async view => {
	const db = await view.get('db')
	const hashs = await view.get('hashs')
	const list = view.data.list = await db.all(`
		SELECT 
			pr.prop_id,
			pr.prop_title,
			pr.type,
			pr.prop_nick,
			pr.known,
			pr.multi + 0 as multi,
			pr.comment,
			pr.represent_prop + 0 as represent_prop
		FROM sources_props pr
		where 
		(${hashs.map(hash => 'pr.prop_nick like "%' + hash.join('%" and pr.prop_nick like "%') + '%"').join(' or ') || '1 = 1'}) 
		ORDER BY rand()
		limit 20
	`)
	//view.data.list = list.slice(0, 1000)
	return view.ret()
})
rest.addResponse('prop', ['admin'], async view => {
	const db = await view.get('db')
	const prop_id = await view.get('prop_id#required')
	const prop = view.data.prop = await Sources.getProp(db, prop_id)
	const hashs = await view.get('hashs')
	view.data.synonyms = await db.all(`
		SELECT col_title, col_nick
		FROM sources_synonyms
		WHERE prop_id = :prop_id
	`, {prop_id})

	let search
	if (prop.type == 'value') {
		search = hashs.map(hash => 'va.value_nick like "%' + hash.join('%" and va.value_nick like "%') + '%"').join(' or ') || 'ce.text != ""'
	} else if (prop.type == 'number') {
		search = hashs.map(hash => 'ce.number like "%' + hash.join('%" and ce.number like "%') + '%"').join(' or ') || 'ce.text != ""'
	} else {
		search = 'ce.text != ""'
	}


	const list = await db.all(`
		SELECT co.prop_id, ce.text, count(ce.text) as count, 
			ce.pruning + 0 as pruning, 
			-- max(ce.represent) + 0 as represent, 
			ce.date, 
			ce.number, ce.value_id, va.value_title, va.value_nick
		FROM sources_cols co, sources_cells ce
			LEFT JOIN sources_values va on va.value_id = ce.value_id
		WHERE co.source_id = ce.source_id 
			and co.sheet_index = ce.sheet_index 
			and co.col_index = ce.col_index
			and co.prop_id = :prop_id
			and (${search}) 
		GROUP BY ce.text
		ORDER BY ce.pruning DESC, count(ce.text) DESC
		LIMIT 100
	`, {prop_id})
	// const custom = await db.allto('value_nick', `
	// 	SELECT cva.value_nick, cva.represent_custom_value + 0 as represent_custom_value
	// 	FROM sources_custom_values cva
	// 	WHERE prop_id = :prop_id
	// `, {prop_id})
	
	// for (const value of list) {
	// 	value.cls = represent.calcCls(
	// 		prop.represent_prop, 
	// 		custom[value.value_nick]?.represent_custom_value, 
	// 		prop.represent_values
	// 	)

	// }
	view.data.count = await db.col(`
		SELECT count(distinct ce.text)
		FROM sources_cols co, sources_cells ce
			LEFT JOIN sources_values va on va.value_id = ce.value_id
		WHERE co.source_id = ce.source_id 
			and co.sheet_index = ce.sheet_index 
			and co.col_index = ce.col_index
			and co.prop_id = :prop_id
			and ce.text != ''
	`, {prop_id})
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

const getTotalSize = Access.wait(async directoryPath => {
	const arrayOfFiles = await getAllFiles(directoryPath)

	let totalSize = 0

	for (const filePath of arrayOfFiles) {
		totalSize += (await fs.stat(filePath)).size
	}

	return convertBytes(totalSize)
})
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
		SELECT 
			distinct 
			so.source_id, so.source_title, 
				en.prop_id as entity_id, 
				en.prop_title as entity_title
		FROM 
			sources_appears ap, 
			sources_props en, 
			sources_sources so
		WHERE ap.source_id = so.source_id and ap.entity_id = en.prop_id
	`), ({ entity_id }) => entity_id)
	
	return view.ret()
})
rest.addResponse('disappear-table', ['admin'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id')
	const entity_id = await view.get('entity_id')
	if (!entity_id) return view.err('Требуется сущность', 200)
	const entity = view.data.entity = await Sources.getEntity(db, entity_id)
	if (source_id) {

		view.data.list = await db.all(`
			SELECT va.value_title, so.source_id, so.source_title, ap.date_disappear, ap.date_appear
			FROM sources_appears ap, sources_values va, sources_sources so
			WHERE ap.entity_id = :entity_id 
				and ap.source_id = :source_id
				and so.source_id = ap.source_id
				and va.value_nick = ap.key_nick
				and ap.date_disappear is not null
			ORDER BY ap.date_disappear DESC
		`, {entity_id, source_id})
	} else {
		view.data.list = await db.all(`
			SELECT va.value_title, so.source_id, so.source_title, ap.date_disappear, ap.date_appear
			FROM sources_appears ap, sources_values va, sources_sources so
			WHERE ap.entity_id = :entity_id 
				and so.source_id = ap.source_id
				and va.value_nick = ap.key_nick
				and ap.date_disappear is not null
		`, {entity_id})
	}
	return view.ret()
})
// rest.addResponse('position', ['admin'], async view => {
// 	const db = await view.get('db')
// 	const entity_id = await view.get('entity_id#required')
// 	const key_id = await view.get('key_id#required')
// 	const entity = view.data.entity = await Sources.getEntity(db, entity_id)
// 	const item = view.data.item = await Sources.getItem(db, entity_id, key_id)
// 	return view.ret()
// })
// rest.addResponse('position-table', ['admin'], async view => {
// 	const db = await view.get('db')
// 	const entity_id = await view.get('entity_id#required')
// 	const key_id = await view.get('key_id#required')
// 	const entity = view.data.entity = await Sources.getEntity(db, entity_id)
	
// 	const item = view.data.item = await Sources.getItem(db, entity_id, key_id)
	

// 	let cells = await db.all(`
// 		SELECT
// 			ce.number, 
// 			ce.date, 
// 			ce.text,
			
// 			ce.sheet_index,
// 			ce.source_id,
// 			ce.row_index,
// 			ce.col_index,
// 			ce.multi_index,

// 			sh.sheet_title,
// 			so.source_title,
// 			va.value_title as value, 
// 			co.prop_id, 
// 			pr.prop_title,
// 			ce.winner + 0 as winner,
// 			ce.represent + 0 as represent,
// 			ce.pruning + 0 as pruning,
// 			ro.key_id
// 		FROM sources_sheets sh, sources_sources so, sources_rows ro, sources_items it, sources_cols co, sources_props pr, sources_cells ce
// 			LEFT JOIN sources_values va on (va.value_id = ce.value_id)
// 		WHERE 
// 			sh.entity_id = :entity_id
// 			and so.source_id = sh.source_id
// 			and ro.source_id = sh.source_id
// 			and ro.sheet_index = sh.sheet_index 
// 			and ro.key_id = :key_id
// 			and it.entity_id = sh.entity_id
// 			and it.key_id = ro.key_id
// 			and co.source_id = sh.source_id
// 			and co.sheet_index = sh.sheet_index

// 			and pr.prop_id = co.prop_id

// 			and ce.source_id = sh.source_id
// 			and ce.sheet_index = sh.sheet_index
// 			and ce.row_index = ro.row_index
// 			and ce.col_index = co.col_index
// 		ORDER BY so.ordain, sh.sheet_index, ro.row_index, pr.ordain, ce.multi_index
// 	`, {entity_id, key_id})
// 	cells = Object.values(Object.groupBy(cells, (cell => cell.prop_id)))
// 	for (const i in cells) {
// 		cells[i] = Object.values(Object.groupBy(cells[i], (cell => [cell.source_id, cell.sheet_index, cell.row_index, cell.cell_index].join(':'))))
// 	}
// 	view.data.cells = cells
// 	return view.ret()
// })
// rest.addResponse('positions', ['admin'], async view => {
// 	const db = await view.get('db')
// 	const entity_id = await view.get('entity_id#required')
// 	const entity = view.data.entity = await Sources.getEntity(db, entity_id)
// 	const search = view.get('search')
// 	return view.ret()
// })
// rest.addResponse('positions-table', ['admin'], async view => {
// 	const db = await view.get('db')
// 	const entity_id = await view.get('entity_id#required')
// 	const entity = view.data.entity = await Sources.getEntity(db, entity_id)
// 	const hashs = await view.get('hashs')

	
// 	const where_search = []
// 	if (!hashs.length) where_search.push('1=1')
// 	for (const hash of hashs) {
// 		const sql = 'it.search like "% ' + hash.join('%" and it.search like "% ') + '%"'
// 		where_search.push(sql)
// 	}

// 	const props = await db.allto('prop_id', `
// 		SELECT
// 			pr.prop_id, pr.prop_title, pr.type
// 		FROM sources_props pr
// 		WHERE pr.entity_id = :entity_id 
// 			and pr.type != "text"
// 		ORDER BY pr.ordain
// 	`, {entity_id})

// 	const list = view.data.list = await db.all(`
// 		SELECT
// 			ce.number, 
// 			ce.date, 
// 			va.value_title as value, 
// 			co.prop_id, 
// 			ro.key_id
// 		FROM sources_sheets sh, sources_sources so, sources_rows ro, sources_items it, sources_cols co, sources_props pr, sources_cells ce
// 			LEFT JOIN sources_values va on (va.value_id = ce.value_id)
// 		WHERE 
// 			sh.entity_id = :entity_id
// 			and so.source_id = sh.source_id
// 			and ro.source_id = sh.source_id
// 			and ro.sheet_index = sh.sheet_index 

// 			and it.entity_id = sh.entity_id
// 			and it.key_id = ro.key_id
// 			and (${where_search.join(' or ')})
// 			and co.source_id = sh.source_id
// 			and co.sheet_index = sh.sheet_index

// 			and pr.prop_id = co.prop_id

// 			and ce.source_id = sh.source_id
// 			and ce.sheet_index = sh.sheet_index
// 			and ce.row_index = ro.row_index
// 			and ce.col_index = co.col_index
// 			and ce.winner = 1
// 			and (ce.number is not null or ce.value_id is not null or ce.date is not null)
// 		ORDER BY so.ordain, sh.sheet_index, ro.row_index, ce.multi_index
// 	`, {entity_id})

// 	const rows = view.data.rows = Object.values(Object.groupBy(list, (row => row.key_id)))

// 	for (const i in rows) {
// 		const row = rows[i]
// 		const byprop = {}
// 		for (const cell of row) {

// 			props[cell.prop_id].finded = true
// 			const type = props[cell.prop_id].type
// 			byprop[cell.prop_id] ??= []
// 			let val = cell[type]
// 			if (type == 'number') val = Number(val)
// 			byprop[cell.prop_id].push(val)
// 		}
// 		rows[i] = [row[0].key_id, byprop]
// 	}
// 	view.data.props = Object.values(props).filter(prop => prop.finded)
// 	return view.ret()
// })
rest.addResponse('sheet', ['admin'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const source = view.data.source = await Sources.getSource(db, source_id)
	
	return view.ret()
})
rest.addResponse('sheet-source', ['admin'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const source = view.data.source = await Sources.getSource(db, source_id)	
	return view.ret()
})

rest.addResponse('sheet-dates', ['admin'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const source = view.data.source = await Sources.getSource(db, source_id)
	const entity = view.data.entity = source.entity_id && await Sources.getEntity(db, source.entity_id)
	const appear = await view.get('appear') //null - последняя дата, 0 - выбрать всё, date - конкретная дата	

	const rdates = await Recalc.getDates(db)
	view.data.publicateneed = !rdates.date_recalc_publicate
	//.issearch = !!await db.col(`select search from sources_rows where source_id = :source_id limit 1`, {source_id})
	const hashs = await view.get('hashs')

	// const where_search = []
	// if (!hashs.length) where_search.push('1=1')
	// for (const hash of hashs) {
	// 	const sql = 'ro.search like "% ' + hash.join('%" and ro.search like "% ') + '%"'
	// 	where_search.push(sql)
	// }
	
	
	view.data.quantity_with_active = await db.col(`
		SELECT count(DISTINCT ro.sheet_index, ro.row_index)
		FROM sources_rows ro, sources_wcells ce
		WHERE
			ro.source_id = :source_id
			and ro.source_id = ce.source_id and ro.sheet_index = ce.sheet_index and ro.row_index = ce.row_index
			and (${hashs.map(hash => 'ro.search like "% ' + hash.join('%" and ro.search like "% ') + '%"').join(' or ') || 'ro.search != ""'}) 
	`, {source_id})
	
	view.data.quantity_with_passive = await db.col(`
		SELECT count(DISTINCT ro.sheet_index, ro.row_index)
		FROM sources_rows ro
			left join sources_wcells ce on (ro.source_id = ce.source_id and ro.sheet_index = ce.sheet_index and ro.row_index = ce.row_index)
		WHERE
			ro.source_id = :source_id
			and ce.col_index is null
			and (${hashs.map(hash => 'ro.search like "% ' + hash.join('%" and ro.search like "% ') + '%"').join(' or ') || 'ro.search != ""'}) 
	`, {source_id})
	
	
	//Колонок с обрезанными значениями
	view.data.quantity_with_pruning = await db.col(`
		SELECT count(DISTINCT co.prop_id)
		FROM sources_cells ce, sources_cols co, sources_rows ro
		WHERE
			ce.source_id = :source_id and ce.pruning = 1
			and co.source_id = ce.source_id and co.sheet_index = ce.sheet_index and co.col_index = ce.col_index
			and ro.source_id = ce.source_id and ro.sheet_index = ce.sheet_index and ro.row_index = ce.row_index
			and (${hashs.map(hash => 'ro.search like "% ' + hash.join('%" and ro.search like "% ') + '%"').join(' or ') || 'ro.search != ""'}) 
			
	`, {source_id})
	
	//Колонок с неопределёнными свойствами
	view.data.quantity_with_unknown = await db.col(`
		SELECT count(distinct co.col_title)
		FROM 
			sources_rows ro, 
			sources_cols co 
		WHERE co.source_id = :source_id 
		and ro.source_id = co.source_id and ro.sheet_index = co.sheet_index

		AND co.prop_id is null AND co.represent_col = 1 
		and (${hashs.map(hash => 'ro.search like "% ' + hash.join('%" and ro.search like "% ') + '%"').join(' or ') || 'ro.search != ""'}) 
	`, {source_id})
	
	//Строк с ключами
	view.data.quantity_of_keys = await db.col(`
		SELECT count(*)
		FROM sources_rows ro, sources_sheets sh
		WHERE sh.source_id = :source_id
		and ro.sheet_index = sh.sheet_index 
		and ro.source_id = sh.source_id
		and ro.key_id is not null
		and (${hashs.map(hash => 'ro.search like "% ' + hash.join('%" and ro.search like "% ') + '%"').join(' or ') || 'ro.search != ""'}) 
	`, {source_id})
	
	view.data.quantity_without_keys = await db.col(`
		SELECT count(*)
		FROM sources_rows ro, sources_sheets sh
		WHERE sh.source_id = :source_id
		and ro.sheet_index = sh.sheet_index 
		and ro.source_id = sh.source_id
		and ro.key_id is null
		and (${hashs.map(hash => 'ro.search like "% ' + hash.join('%" and ro.search like "% ') + '%"').join(' or ') || 'ro.search != ""'}) 
	`, {source_id})
	
	//make dates
	const choice_date = appear || await db.col(`
		SELECT UNIX_TIMESTAMP(max(ap.date_appear)) as date
		FROM sources_appears ap
		WHERE ap.source_id = :source_id and date_disappear is null
	`, {source_id}) || Math.round(Date.now() / 1000)
	const dateup = {
		date: choice_date, 
		count: await db.col(`
			SELECT count(*)
			FROM sources_appears ap, sources_rows ro, sources_sheets sh, sources_values va
			WHERE ap.source_id = :source_id 
			and ap.date_appear = FROM_UNIXTIME(:date) 
			and va.value_nick = ap.key_nick
			and date_disappear is null
			and sh.source_id = ap.source_id and sh.entity_id = ap.entity_id
			and ro.sheet_index = sh.sheet_index 
			and ro.source_id = sh.source_id
			and ro.key_id = va.value_id
			and (${hashs.map(hash => 'ro.search like "% ' + hash.join('%" and ro.search like "% ') + '%"').join(' or ') || 'ro.search != ""'}) 
		`, {date: choice_date, source_id}), 
		active: true
	}

	const alldates = await db.all(`
		SELECT UNIX_TIMESTAMP(ap.date_appear) as date, count(*) as count
		FROM sources_appears ap, sources_rows ro, sources_sheets sh, sources_values va
		WHERE ap.source_id = :source_id
		and date_disappear is null

		
		and sh.source_id = ap.source_id and sh.entity_id = ap.entity_id
		and ro.sheet_index = sh.sheet_index 
		and ro.source_id = sh.source_id
		and va.value_nick = ap.key_nick
		and ro.key_id = va.value_id
		and (${hashs.map(hash => 'ro.search like "% ' + hash.join('%" and ro.search like "% ') + '%"').join(' or ') || 'ro.search != ""'}) 

		GROUP BY ap.date_appear
		ORDER BY ap.date_appear		
	`, {source_id})
	
	const bytime = Object.groupBy(alldates, dateis => {
		if (dateis.date > dateup.date) return 'after'
		if (dateis.date < dateup.date) return 'before'
		return 'dateup'
	})
	bytime.after ??= []
	bytime.before ??= []

	let after_list = []
	let before_list = []
	const MAX = 7
	const SIDE = (MAX - 1) / 2
	if (bytime.before.length < SIDE && bytime.after.length < SIDE) { //Слева и справа не хватает длины
		before_list = bytime.before.splice(0, bytime.before.length - SIDE)
		after_list = bytime.after.splice(SIDE)
	} else if (bytime.before.length < SIDE) {
		const SIZE = SIDE - bytime.before.length + SIDE
		before_list = bytime.before.splice(0, bytime.before.length - SIDE)
		after_list = bytime.after.splice(SIZE)
	} else if (bytime.after.length < SIDE) {
		const SIZE = SIDE - bytime.after.length + SIDE
		before_list = bytime.before.splice(0, bytime.before.length - SIZE)
		after_list = bytime.after.splice(SIDE)

	} else {
		before_list = bytime.before.splice(0, bytime.before.length - SIDE)
		after_list = bytime.after.splice(SIDE)
	}
	view.data.dates = [...bytime.before, dateup, ...bytime.after]

	if (before_list.length) view.data.dates.unshift({
		count: before_list.reduce((ak, item) => ak + item.count, 0), 
		date: before_list.at(-1)?.date, title: 'Раньше'
	})
	if (after_list.length) view.data.dates.push({
		count: after_list.reduce((ak, item) => ak + item.count, 0), 
		date: after_list.at(0)?.date, title: 'Позже'
	})

	
	

	
	return view.ret()
})
// rest.addResponse('sheet-sheets', ['admin'], async view => {
// 	const db = await view.get('db')
// 	const source_id = await view.get('source_id#required')
// 	const source = view.data.source = await Sources.getSource(db, source_id)
// 	//const entity = source.entity_id && await Sources.getEntity(db, source.entity_id)
// 	const keyfilter = await view.get('keyfilter#required')

// 	/*
// 		appear - конкретная дата появления
// 		all - всё как есть
// 		yes - всё с ключами
// 		not - всё без ключей
// 	*/

// 	let sheet_index = await view.get('sheet_index#orNull')
// 	if (!sheet_index) sheet_index = 0
// 	const hashs = await view.get('hashs')

// 	const where_search = []
// 	if (!hashs.length) where_search.push('1=1')
// 	for (const hash of hashs) {
// 		const sql = 'ro.search like "% ' + hash.join('%" and ro.search like "% ') + '%"'
// 		where_search.push(sql)
// 	}
	
	

// 	const appear = await view.get('appear') //null - последняя дата, 0 - выбрать всё, date - конкретная дата

// 	const choice_date = appear || await db.col(`
// 		SELECT UNIX_TIMESTAMP(max(ap.date_appear))
// 		FROM sources_appears ap
// 		WHERE ap.source_id = :source_id and date_disappear is null
// 	`, {source_id}) || Math.round(Date.now() / 1000)
	
// 	//===================
// 	let sheets = []

// 	if (keyfilter == 'appear') {
// 		sheets = view.data.sheets = await db.all(`
// 			SELECT 
// 				sh.sheet_index,
// 				sh.sheet_title,
// 				sh.entity_id,
// 				count(ro.row_index) as count
// 			FROM sources_sheets sh, sources_rows ro, sources_appears ap, sources_values va
// 			WHERE sh.source_id = :source_id
// 				and ro.source_id = sh.source_id 
// 				and va.value_id = ro.key_id
// 				and ro.sheet_index = sh.sheet_index
// 				and (${where_search.join(' or ')})
// 				and ap.key_nick = va.value_nick
// 				and ap.entity_id = sh.entity_id
// 				and ap.date_appear = FROM_UNIXTIME(:choice_date)
// 			GROUP BY sh.sheet_index
// 			ORDER by sh.sheet_index
// 		`, {source_id, choice_date})
// 	} else if (keyfilter == 'all') {
// 		sheets = view.data.sheets = await db.all(`
// 			SELECT 
// 				sh.sheet_index,
// 				sh.sheet_title,
// 				sh.entity_id,
// 				count(ro.row_index) as count
// 			FROM sources_sheets sh, sources_rows ro
// 			WHERE sh.source_id = :source_id
// 				and ro.source_id = sh.source_id 
// 				and ro.sheet_index = sh.sheet_index
// 				and (${where_search.join(' or ')})
// 			GROUP BY sh.sheet_index
// 			ORDER by sh.sheet_index
// 		`, {source_id, choice_date})
// 	} else if (keyfilter == 'yes' || keyfilter == 'not') {
// 		sheets = view.data.sheets = await db.all(`
// 			SELECT 
// 				sh.sheet_index,
// 				sh.sheet_title,
// 				sh.entity_id,
// 				count(ro.row_index) as count
// 			FROM sources_sheets sh, sources_rows ro
// 			WHERE sh.source_id = :source_id
// 				and ro.source_id = sh.source_id 
// 				and ro.sheet_index = sh.sheet_index
// 				and (${where_search.join(' or ')})
// 				and ro.key_id ${keyfilter == 'yes' ? 'is not null' : 'is null'}
// 			GROUP BY sh.sheet_index
// 			ORDER by sh.sheet_index
// 		`, {source_id, choice_date})
// 	} else {
// 		sheets = view.data.sheets = await db.all(`
// 			SELECT 
// 				sh.sheet_index,
// 				sh.sheet_title,
// 				sh.entity_id,
// 				count(ro.row_index) as count
// 			FROM sources_sheets sh, sources_rows ro
// 			WHERE sh.source_id = :source_id
// 				and ro.source_id = sh.source_id 
// 				and ro.sheet_index = sh.sheet_index
// 				and (${where_search.join(' or ')})
// 			GROUP BY sh.sheet_index
// 			ORDER by sh.sheet_index
// 		`, {source_id})
// 	}
// 	let last_index = null
// 	for (const s of sheets) {	
// 		s.entity = s.entity_id && await Sources.getEntity(db, s.entity_id)
// 	}

// 	if (sheet_index === null) sheet_index = sheets[0]?.sheet_index || 0

// 	const sheet = view.data.sheet = await Sources.getSheetByIndex(db, source_id, sheet_index)
// 	if (!sheet) return view.err('Лист не найден')	

// 	for (const s of sheets) {
// 		if (s.sheet_index > sheet.sheet_index) break
// 		last_index = s.sheet_index
// 	}

	

// 	if (sheet.sheet_index != last_index) {
// 		sheet.count = 0
// 		sheet.entity = sheet.entity_id && await Sources.getEntity(db, sheet.entity_id)
// 		sheets.splice(last_index || 0, 0, sheet)
// 	}
	

// 	return view.ret()
// })
rest.addResponse('sheet-table', ['admin'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const source = view.data.source = await Sources.getSource(db, source_id)
	
	const hashs = await view.get('hashs')
	const keyfilter = await view.get('keyfilter#appear')
	const limit = view.data.limit = await view.get('limit') || 100
	/*
		appear - конкретная дата появления
		all - всё как есть
		yes - всё с ключами
		not - всё без ключей
	*/

	

	
	
	
	const where_search = []
	if (!hashs.length) where_search.push('1=1')
	for (const hash of hashs) {
		const sql = 'ro.search like "% ' + hash.join('%" and ro.search like "% ') + '%"'
		where_search.push(sql)
	}

	

	const appear = await view.get('appear') //null - последняя дата, 0 - выбрать всё, date - конкретная дата


	
	const date_appear = appear || await db.col(`
		SELECT UNIX_TIMESTAMP(max(ap.date_appear))
		FROM sources_appears ap
		WHERE ap.source_id = :source_id and date_disappear is null
	`, {source_id}) || Math.round(Date.now() / 1000)
	
	//===================
	let sheets = []
	
	if (keyfilter == 'appear') {
		sheets = view.data.sheets = await db.all(`
			SELECT 
				sh.sheet_index,
				sh.sheet_title,
				sh.entity_id,
				sh.represent_sheet + 0 as represent_sheet,
				count(ro.row_index) as count
			FROM sources_sheets sh, sources_rows ro, sources_appears ap, sources_values va
			WHERE sh.source_id = :source_id
				and ro.source_id = sh.source_id 
				and va.value_id = ro.key_id
				and ro.sheet_index = sh.sheet_index
				and (${where_search.join(' or ')})
				and ap.key_nick = va.value_nick
				and ap.entity_id = sh.entity_id
				and ap.date_appear = FROM_UNIXTIME(:date_appear)
			GROUP BY sh.sheet_index
			ORDER by sh.sheet_index
		`, {source_id, date_appear})
	} else if (keyfilter == 'all') {
		sheets = view.data.sheets = await db.all(`
			SELECT 
				sh.sheet_index,
				sh.sheet_title,
				sh.entity_id,
				sh.represent_sheet + 0 as represent_sheet,
				count(ro.row_index) as count
			FROM sources_sheets sh, sources_rows ro
			WHERE sh.source_id = :source_id
				and ro.source_id = sh.source_id 
				and ro.sheet_index = sh.sheet_index
				and (${where_search.join(' or ')})
			GROUP BY sh.sheet_index
			ORDER by sh.sheet_index
		`, {source_id})
	} else if (keyfilter == 'yes' || keyfilter == 'not') {
		sheets = view.data.sheets = await db.all(`
			SELECT 
				sh.sheet_index,
				sh.sheet_title,
				sh.entity_id,
				sh.represent_sheet + 0 as represent_sheet,
				count(ro.row_index) as count
			FROM sources_sheets sh, sources_rows ro
			WHERE sh.source_id = :source_id
				and ro.source_id = sh.source_id 
				and ro.sheet_index = sh.sheet_index
				and (${where_search.join(' or ')})
				and ro.key_id ${keyfilter == 'yes' ? 'is not null' : 'is null'}
			GROUP BY sh.sheet_index
			ORDER by sh.sheet_index
		`, {source_id})
	} else if (keyfilter == 'pruning') {
		sheets = view.data.sheets = await db.all(`
			SELECT 
				sh.sheet_index,
				sh.sheet_title,
				sh.entity_id,
				sh.represent_sheet + 0 as represent_sheet,
				count(distinct co.prop_id) as count
			FROM sources_sheets sh, sources_cells ce, sources_rows ro, sources_cols co
			WHERE sh.source_id = :source_id
				and ce.source_id = sh.source_id 
				and co.source_id = ce.source_id and co.sheet_index = ce.sheet_index and co.col_index = ce.col_index
				and ce.sheet_index = sh.sheet_index
				and (${where_search.join(' or ')})
				and ce.pruning = 1
				and ro.source_id = ce.source_id
				and ro.sheet_index = ce.sheet_index
				and ro.row_index = ce.row_index
			GROUP BY sh.sheet_index
			ORDER by sh.sheet_index
		`, {source_id})
	} else if (keyfilter == 'active') {
		sheets = view.data.sheets = await db.all(`
			SELECT 
				sh.sheet_index,
				sh.sheet_title,
				sh.entity_id,
				sh.represent_sheet + 0 as represent_sheet,
				count(distinct sh.sheet_index, ro.row_index) as count
			FROM sources_sheets sh, sources_rows ro, sources_wcells ce
			WHERE ce.source_id = :source_id
				and sh.source_id = ce.source_id
				and sh.sheet_index = ce.sheet_index
				and ro.source_id = ce.source_id
				and ro.sheet_index = ce.sheet_index
				and ro.row_index = ce.row_index
				and (${where_search.join(' or ')})
				
			GROUP BY sh.sheet_index
			ORDER by sh.sheet_index
		`, {source_id})
	} else if (keyfilter == 'passive') {
		sheets = view.data.sheets = await db.all(`
			SELECT 
				sh.sheet_index,
				sh.sheet_title,
				sh.entity_id,
				sh.represent_sheet + 0 as represent_sheet,
				count(distinct ro.row_index) as count
			FROM sources_sheets sh, sources_rows ro 
				left join sources_wcells ce on (ce.source_id = ro.source_id and ce.sheet_index = ro.sheet_index and ce.row_index = ro.row_index)
			WHERE sh.source_id = :source_id
				and ro.source_id = sh.source_id and ro.sheet_index = sh.sheet_index
				and (${where_search.join(' or ')})
				and ce.row_index is null
			GROUP BY sh.sheet_index
			ORDER by sh.sheet_index
		`, {source_id})

	} else if (keyfilter == 'unknown') {
		sheets = view.data.sheets = await db.all(`
			SELECT 
				sh.sheet_index,
				sh.sheet_title,
				sh.entity_id,
				sh.represent_sheet + 0 as represent_sheet,
				count(distinct co.col_index) as count
			FROM sources_sheets sh, sources_cols co, sources_rows ro
			WHERE sh.source_id = :source_id
				and co.source_id = sh.source_id 
				and co.sheet_index = sh.sheet_index
				and (${where_search.join(' or ')})
				and co.prop_id is null 
				and co.represent_col = 1
				and ro.source_id = sh.source_id
				and ro.sheet_index = sh.sheet_index
			GROUP BY sh.sheet_index
			ORDER by sh.sheet_index
		`, {source_id})

	} else {
		sheets = view.data.sheets = await db.all(`
			SELECT 
				sh.sheet_index,
				sh.sheet_title,
				sh.entity_id,
				sh.represent_sheet + 0 as represent_sheet,
				count(ro.row_index) as count
			FROM sources_sheets sh, sources_rows ro
			WHERE sh.source_id = :source_id
				and ro.source_id = sh.source_id 
				and ro.sheet_index = sh.sheet_index
				and (${where_search.join(' or ')})
			GROUP BY sh.sheet_index
			ORDER by sh.sheet_index
		`, {source_id})
	}
	
	let last_index = null
	for (const s of sheets) {	
		//s.represent = s.represent_sheet// && source.represent_sheets
		s.entity = s.entity_id && await Sources.getEntity(db, s.entity_id)
	}

	let sheet_index = await view.get('sheet_index#orNull')
	if (sheet_index === null) sheet_index = sheets[0]?.sheet_index || 0


	const sheet = view.data.sheet = await Sources.getSheetByIndex(db, source_id, sheet_index)
	if (!sheet) return view.err('Лист не найден')	

	for (const s of sheets) {
		if (s.sheet_index > sheet.sheet_index) break
		last_index = s.sheet_index
	}

	

	if (sheet.sheet_index != last_index) {
		sheet.count = 0
		sheet.entity = sheet.entity_id && await Sources.getEntity(db, sheet.entity_id)
		sheets.splice(last_index || 0, 0, sheet)
	}












	

	const entity = view.data.entity = source.entity_id && await Sources.getEntity(db, source.entity_id)
	
	// const sheet = view.data.sheet = await db.fetch(`
	// 	SELECT sh.sheet_title, sh.key_index, sh.sheet_index, sh.entity_id,
	// 		sh.represent_sheet + 0 as represent_sheet,
	// 		csh.represent_custom_sheet + 0 as represent_custom_sheet
	// 	FROM sources_sheets sh
	// 		left join sources_custom_sheets csh on (csh.source_id = sh.source_id and csh.sheet_title = sh.sheet_title)
	// 	WHERE sh.source_id = :source_id and sh.sheet_index = :sheet_index
	// `, {source_id, sheet_index})
	// if (!sheet) return view.err('Лист не найден')

	sheet.cls = represent.calcCls(
		source.represent_source, 
		sheet.represent_custom_sheet, 
		source.represent_sheets
	)
	

	const sheet_title = sheet.sheet_title

	let cols = []
	
	if (keyfilter == 'pruning') {
		cols = await db.all(`
			SELECT 
				co.col_index, co.col_nick, pr.prop_nick, 
				pr.multi + 0 as multi, 
				pr.known,
				pr.represent_prop + 0 as represent_prop,
				pr.type,
				co.col_title, pr.prop_id, pr.prop_title, pr.prop_id as entity_id,
				co.represent_col + 0 as represent_col,
				cco.represent_custom_col + 0 as represent_custom_col
			FROM sources_cells ce, sources_rows ro, sources_sheets sh, sources_cols co
				LEFT JOIN sources_custom_cols cco on (cco.source_id = co.source_id and cco.col_title = co.col_title and sheet_title = :sheet_title)
				LEFT JOIN sources_props pr on pr.prop_id = co.prop_id
			WHERE
				co.source_id = :source_id
				and ce.source_id = co.source_id and ce.col_index = co.col_index and co.sheet_index = ce.sheet_index
				and sh.source_id = ce.source_id and sh.sheet_index = ce.sheet_index
				and ro.source_id = ce.source_id and ro.sheet_index = ce.sheet_index and ro.row_index = ce.row_index
				and (${where_search.join(' or ')})
				and (ce.pruning = 1 or ce.col_index = sh.key_index)
				and co.sheet_index = :sheet_index	
			GROUP BY co.col_index
			ORDER BY co.col_index
		`, {source_id, sheet_index, sheet_title})
	// } else if (keyfilter == 'active') {
	// 	cols = await db.all(`
	// 		SELECT 
	// 			co.col_index, co.col_nick, pr.prop_nick, 
	// 			pr.multi + 0 as multi, 
	// 			pr.known,
	// 			pr.represent_prop + 0 as represent_prop,
	// 			pr.type,
	// 			co.col_title, pr.prop_id, pr.prop_title, pr.prop_id as entity_id,
	// 			co.represent_col + 0 as represent_col,
	// 			cco.represent_custom_col + 0 as represent_custom_col
	// 		FROM sources_wcells ce, sources_rows ro, sources_sheets sh, sources_cols co
	// 			LEFT JOIN sources_custom_cols cco on (cco.source_id = co.source_id and cco.col_title = co.col_title and sheet_title = :sheet_title)
	// 			LEFT JOIN sources_props pr on pr.prop_id = co.prop_id
	// 		WHERE
	// 			co.source_id = :source_id
	// 			and ce.source_id = co.source_id and ce.col_index = co.col_index and co.sheet_index = ce.sheet_index
	// 			and sh.source_id = ce.source_id and sh.sheet_index = ce.sheet_index
	// 			and ro.source_id = ce.source_id and ro.sheet_index = ce.sheet_index and ro.row_index = ce.row_index
	// 			and (${where_search.join(' or ')})
	// 			and co.sheet_index = :sheet_index	
	// 		GROUP BY co.col_index
	// 		ORDER BY co.col_index
	// 	`, {source_id, sheet_index, sheet_title})
	} else if (keyfilter == 'unknown') {
		cols = await db.all(`
			SELECT 
				co.col_index, co.col_nick, pr.prop_nick, 
				pr.multi + 0 as multi, 
				pr.known,
				pr.represent_prop + 0 as represent_prop,
				pr.type,
				co.col_title, pr.prop_id, pr.prop_title, pr.prop_id as entity_id,
				co.represent_col + 0 as represent_col,
				cco.represent_custom_col + 0 as represent_custom_col
			FROM sources_cells ce, sources_sheets sh, sources_cols co
				LEFT JOIN sources_custom_cols cco on (cco.source_id = co.source_id and cco.col_title = co.col_title and sheet_title = :sheet_title)
				LEFT JOIN sources_props pr on pr.prop_id = co.prop_id
			WHERE
				co.source_id = :source_id
				and ce.source_id = co.source_id and ce.col_index = co.col_index and co.sheet_index = ce.sheet_index
				and sh.source_id = ce.source_id and sh.sheet_index = ce.sheet_index
				and ((co.prop_id is null and co.represent_col = 1) or co.col_index = sh.key_index)
				and co.sheet_index = :sheet_index	
			GROUP BY co.col_index
			ORDER BY co.col_index
		`, {source_id, sheet_index, sheet_title})
	} else {
		cols = await db.all(`
			SELECT 
				co.col_index, co.col_nick, pr.prop_nick, 
				pr.multi + 0 as multi, 
				pr.known,
				pr.represent_prop + 0 as represent_prop,
				pr.type,
				co.col_title, pr.prop_id, pr.prop_title, pr.prop_id as entity_id,
				co.represent_col + 0 as represent_col,
				cco.represent_custom_col + 0 as represent_custom_col
			FROM sources_cols co
				LEFT JOIN sources_custom_cols cco on (cco.source_id = co.source_id and cco.col_title = co.col_title and sheet_title = :sheet_title)
				LEFT JOIN sources_props pr on pr.prop_id = co.prop_id
			WHERE
				co.source_id = :source_id
				and co.sheet_index = :sheet_index	
			GROUP BY co.col_index
			ORDER BY co.col_index
		`, {source_id, sheet_index, sheet_title}) 
	}
	
	view.data.cols = cols

	for (const col of cols) {
		col.cls = represent.calcCls(
			source.represent_source && sheet.represent_sheet, 
			col.represent_custom_col, 
			source.represent_cols
		)
	}
	const where_and = []
	if (keyfilter == 'not') {
		where_and.push('ro.key_id is null')
	} else if (keyfilter == 'yes') {
		where_and.push('ro.key_id is not null')
	} else if (keyfilter == 'appear') {
		where_and.push('(ap.date_appear = FROM_UNIXTIME(:date_appear))')
	} else {
		where_and.push('1=1')
	}

	let rows = []
	if (keyfilter == 'active') {
		rows = view.ans.rows = await db.all(`
			SELECT 
				ro.row_index,
				ro.key_id,
				ap.date_appear
			FROM sources_rows ro
				LEFT JOIN sources_sheets sh on (sh.source_id = ro.source_id and sh.sheet_index = ro.sheet_index)
				LEFT JOIN sources_values va on (va.value_id = ro.key_id)
				LEFT JOIN sources_appears ap on (ap.source_id = ro.source_id and ap.key_nick = va.value_nick and ap.entity_id = sh.entity_id)
				LEFT JOIN sources_wcells wi on (wi.source_id = ro.source_id and wi.sheet_index = ro.sheet_index and wi.row_index = ro.row_index)
			WHERE ro.source_id = :source_id and ro.sheet_index = :sheet_index
				and wi.source_id is not null
				and (${where_search.join(' or ')})
			GROUP BY wi.row_index
			ORDER BY ro.row_index
			LIMIT ${limit}
		`, {source_id, sheet_index})
	} else if (keyfilter == 'passive') {
		rows = view.ans.rows = await db.all(`
			SELECT 
				ro.row_index
			FROM sources_rows ro
				LEFT JOIN sources_wcells wi on (wi.source_id = ro.source_id and wi.sheet_index = ro.sheet_index and wi.row_index = ro.row_index)
			WHERE 
				ro.source_id = :source_id 
				and ro.sheet_index = :sheet_index
				and wi.source_id is null
				and (${where_search.join(' or ')})
			GROUP BY ro.row_index
			ORDER BY ro.row_index
			LIMIT ${limit}
		`, {source_id, sheet_index})
	} else {
		rows = view.ans.rows = await db.all(`
			SELECT 
				ro.row_index,
				ro.key_id,
				-- ro.represent_row_key + 0 as represent_row_key,
				-- ro.represent_row + 0 as represent_row,
				-- ro.repeat_index,
				ap.date_appear
			FROM sources_rows ro
				LEFT JOIN sources_sheets sh on (sh.source_id = ro.source_id and sh.sheet_index = ro.sheet_index)
				LEFT JOIN sources_values va on (va.value_id = ro.key_id)
				LEFT JOIN sources_appears ap on (ap.source_id = ro.source_id and ap.key_nick = va.value_nick and ap.entity_id = sh.entity_id)
			WHERE ro.source_id = :source_id and ro.sheet_index = :sheet_index
			and (${where_and.join(' and ')})
			and (${where_search.join(' or ')})
			ORDER BY ro.row_index
			LIMIT ${limit}
		`, {source_id, sheet_index, date_appear})
	}
	
	
	let max_row_index = 0
	rows.forEach(row => max_row_index = Math.max(max_row_index, row.row_index))

	// const custom_rows = await db.all(`
	// 	SELECT 
	// 		va.value_id as key_id,
	// 		cro.repeat_index, 
	// 		cro.represent_custom_row + 0 as represent_custom_row
	// 	FROM sources_custom_rows cro, sources_values va
	// 	WHERE cro.source_id = :source_id and cro.sheet_title = :sheet_title
	// 	and va.value_nick = cro.key_nick
	// `, {source_id, sheet_title})
	// const crows = {}
	// for (const {key_id, repeat_index, represent_custom_row} of custom_rows) {
	// 	crows[key_id] ??= {}
	// 	crows[key_id][repeat_index] = represent_custom_row
	// }

	// for (const row of rows) {
	// 	row.cls = represent.calcCls(
	// 		source.represent_source && sheet.represent_sheet, 
	// 		crows[row.key_id]?.[row.repeat_index], 
	// 		source.represent_rows
	// 	)
	// }
	const getCols = () => cols.length ? `and ce.col_index in (${cols.map(col => col.col_index)})` : `and 1 = 0`
	let cells = []
	//if (keyfilter == 'active') {

		cells = await db.all(`
			SELECT 
				ce.row_index, 
				ce.col_index, 
				ce.multi_index,
				ce.text,
				ce.pruning + 0 as pruning,
				nvl(wi.entity_id, 0) as winner,
				it.master + 0 as master
			FROM sources_cells ce
				LEFT JOIN sources_rows ro on (ro.source_id = ce.source_id and ro.sheet_index = ce.sheet_index and ro.row_index = ce.row_index)
				LEFT JOIN sources_sheets sh on (sh.source_id = ce.source_id and sh.sheet_index = ce.sheet_index)
				LEFT JOIN sources_items it on (it.entity_id = sh.entity_id and ro.key_id = it.key_id)
				LEFT JOIN sources_values va on (va.value_id = ro.key_id)
				LEFT JOIN sources_wcells wi on (wi.source_id = ce.source_id and wi.sheet_index = ce.sheet_index and wi.row_index = ce.row_index and wi.col_index = ce.col_index)
				LEFT JOIN sources_appears ap on (ap.key_nick = va.value_nick and ap.source_id = ce.source_id and ap.entity_id = sh.entity_id)
			WHERE ce.source_id = :source_id and ce.sheet_index = :sheet_index
			${~['pruning','unknown'].indexOf(keyfilter) ? getCols() : ''}
			and ro.row_index in (${rows.map(row => row.row_index).join(',') || '(-1)'})
			ORDER BY ce.row_index, ce.col_index

		`, {source_id, sheet_index}) 

	// } else if (keyfilter == 'passive') {
	// 	cells = await db.all(`
	// 		SELECT 
	// 			ce.row_index, 
	// 			ce.col_index, 
	// 			ce.multi_index,
	// 			ce.text,
	// 			ce.pruning + 0 as pruning,
	// 			-- ce.represent_cell + 0 as represent_cell,
	// 			-- ce.represent + 0 as represent,
	// 			0 as winner,
	// 			it.master + 0 as master
	// 		FROM sources_cells ce
	// 			LEFT JOIN sources_rows ro on (ro.source_id = ce.source_id and ro.sheet_index = ce.sheet_index and ro.row_index = ce.row_index)
	// 			LEFT JOIN sources_sheets sh on (sh.source_id = ce.source_id and sh.sheet_index = ce.sheet_index)
	// 			LEFT JOIN sources_items it on (it.entity_id = sh.entity_id and ro.key_id = it.key_id)
	// 			LEFT JOIN sources_values va on (va.value_id = ro.key_id)
	// 			LEFT JOIN sources_appears ap on (ap.key_nick = va.value_nick and ap.source_id = ce.source_id and ap.entity_id = sh.entity_id)
	// 		WHERE ce.source_id = :source_id and ce.sheet_index = :sheet_index
	// 		and (${where_search.join(' or ')})
	// 		and ro.row_index in (${rows.map(row => row.row_index).join(',') || '(-1)'})
	// 		ORDER BY ce.row_index, ce.col_index

	// 	`, {source_id, sheet_index}) 
	// } else {
	// 	cells = await db.all(`
	// 		SELECT 
	// 			ce.row_index, 
	// 			ce.col_index, 
	// 			ce.multi_index,
	// 			ce.text,
	// 			ce.pruning + 0 as pruning,
	// 			-- ce.represent_cell + 0 as represent_cell,
	// 			-- ce.represent + 0 as represent,
	// 			nvl(wi.entity_id, 0) as winner,
	// 			it.master + 0 as master
	// 		FROM sources_cells ce
	// 			LEFT JOIN sources_rows ro on (ro.source_id = ce.source_id and ro.sheet_index = ce.sheet_index and ro.row_index = ce.row_index)
	// 			LEFT JOIN sources_sheets sh on (sh.source_id = ce.source_id and sh.sheet_index = ce.sheet_index)
	// 			LEFT JOIN sources_items it on (it.entity_id = sh.entity_id and ro.key_id = it.key_id)
	// 			LEFT JOIN sources_values va on (va.value_id = ro.key_id)
	// 			-- LEFT JOIN sources_wcells wi on (wi.entity_id = sh.entity_id and wi.key_id = ro.key_id and wi.prop_id = wi.entity_id)
	// 			LEFT JOIN sources_wcells wi on (wi.source_id = ce.source_id and wi.sheet_index = ce.sheet_index and wi.row_index = ce.row_index and wi.col_index = ce.col_index)
	// 			LEFT JOIN sources_appears ap on (ap.key_nick = va.value_nick and ap.source_id = ce.source_id and ap.entity_id = sh.entity_id)
	// 		WHERE ce.source_id = :source_id and ce.sheet_index = :sheet_index
	// 		${~['pruning','unknown'].indexOf(keyfilter) ? getCols() : ''}
	// 		and (${where_search.join(' or ')})
	// 		and (${where_and.join(' and ')})
	// 		and ro.row_index <= ${max_row_index}
	// 		ORDER BY ce.row_index, ce.col_index

	// 	`, {source_id, sheet_index, date_appear}) 
	// }

	// const cells = []
	// console.log({source_id, sheet_index, date_appear}, `
	// 	SELECT 
	// 		ce.row_index, 
	// 		ce.col_index, 
	// 		ce.multi_index,
	// 		ce.text,
	// 		ce.pruning + 0 as pruning,
	// 		ce.represent_cell + 0 as represent_cell,
	// 		ce.represent + 0 as represent,
	// 		nvl(wi.entity_id, 0) as winner,
	// 		it.master + 0 as master
	// 	FROM sources_cells ce
	// 		LEFT JOIN sources_rows ro on (ro.source_id = ce.source_id and ro.sheet_index = ce.sheet_index and ro.row_index = ce.row_index)
	// 		LEFT JOIN sources_sheets sh on (sh.source_id = ce.source_id and sh.sheet_index = ce.sheet_index)
	// 		LEFT JOIN sources_items it on (it.entity_id = sh.entity_id and ro.key_id = it.key_id)
	// 		LEFT JOIN sources_values va on (va.value_id = ro.key_id)
	// 		LEFT JOIN sources_wcells wi on (wi.source_id = ce.source_id and wi.sheet_index = ce.sheet_index and wi.row_index = ce.row_index and wi.col_index = ce.col_index and wi.prop_id = wi.entity_id)
	// 		LEFT JOIN sources_appears ap on (ap.key_nick = va.value_nick and ap.source_id = ce.source_id and ap.entity_id = sh.entity_id)
	// 	WHERE ce.source_id = :source_id and ce.sheet_index = :sheet_index
	// 	and (${where_search.join(' or ')})
	// 	and (${where_and.join(' and ')})
		
	// 	ORDER BY ce.row_index, ce.col_index
	// `)
	
	
	
	
	const texts = view.data.texts = []
	const winners = view.data.winners = []
	const prunings = view.data.prunings = []
	const masters = view.data.masters = []
	let text_index = -1
	let pos_index = -1
	let last_row_index = -1
	
	for (const {row_index, col_index, multi_index, text, winner, pruning, master} of cells) {
		if (last_row_index != row_index) {
			text_index++
			pos_index = -1
		}
		
		if (!multi_index) pos_index++
		last_row_index = row_index

		prunings[text_index] ??= []
		prunings[text_index][col_index] ??= 0
		prunings[text_index][col_index] ||= pruning
		

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
		
		masters[text_index] = master

		winners[text_index] ??= []
		winners[text_index][col_index] ??= []

		winners[text_index][col_index][multi_index] = Number(winner)
	}

	for (const text_index in texts) {
		for (const {col_index} of cols) {
			texts[text_index][col_index] ??= [null]
			prunings[text_index][col_index] ??= 0
			winners[text_index][col_index] ??= [0]
		}
		// for (const pos_index in cols) {
		// 	texts[text_index][pos_index] ??= [null]
		// 	prunings[text_index][pos_index] ??= 0
		// 	winners[text_index][pos_index] ??= [0]
		// }
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
