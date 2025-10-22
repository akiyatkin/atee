import nicked from "/-nicked"
import config from "/-config"
import unique from "/-nicked/unique.js"
import BulkInserter from "./BulkInserter.js"
import Access from "/-controller/Access.js"
import fs from "fs/promises"
import scheduleDailyTask from "/-sources/scheduleDailyTask.js"
import Recalc from "/-sources/Recalc.js"
import Consciousness from "/-sources/Consciousness.js"
import PerformanceMonitor from "./PerformanceMonitor.js"
import represent from "/-sources/represent.js"

const Sources = {}
const conf = await config('sources')

Sources.load = async (db, source, visitor) => {
	if (source.date_start) return false
	console.time('Sources.load ' + source.source_title)
	const timer_rest = Date.now()
	await Sources.setSource(db, `
		date_start = now()
	`, source)

	const res = {}
	source.error = await Sources.execRestFunc(source.file, 'get-load', visitor, res, source)
	source.msg_load = res.data?.msg || ''
	source.duration_rest = Date.now() - timer_rest

	await Sources.setSource(db, `
		error = :error, 
		duration_rest = :duration_rest,
		msg_load = :msg_load
	`, source)

	if (source.error) {
		console.timeEnd('Sources.load ' + source.source_title)
		await Sources.setSource(db, `
			date_start = null
		`, source)
		return false
	}

	const timer_insert = Date.now()
	
	let sheets = []
	try {
		sheets = Sources.cleanSheets(res.data.sheets)
	} catch (e) {
		console.log(e)
		source.error = 'Ошибка при подготовке данных: ' + e.toString()
	}
	
	await Sources.insertSheets(db, source, sheets).catch(e => {
		console.log(e)
		source.error = 'Ошибка при внесении данных: ' + e.toString()
	})

	source.date_content = Math.round(Number(res.data?.date_content || 0) / 1000)
	source.date_mtime = Math.max(source.date_content || 0, source.date_mtime || 0)
	source.date_load = Math.round(Date.now() / 1000)
	source.duration_insert = Date.now() - timer_insert


	await Sources.setSource(db, `
		date_load = FROM_UNIXTIME(:date_load), 
		error = :error,
		date_content = FROM_UNIXTIME(:date_content), 
		date_mtime = FROM_UNIXTIME(:date_mtime),
		duration_insert = :duration_insert,
		date_start = null
	`, source)
	console.timeEnd('Sources.load ' + source.source_title)
	return true
}
// Sources.getDates = async db => {
// 	const dates = await db.fetch(`
// 		SELECT 
// 			UNIX_TIMESTAMP(date_index) as date_index, 
// 			UNIX_TIMESTAMP(date_recalc) as date_recalc 
// 		FROM sources_settings
// 	`)	
// 	dates.publicateneed = dates.date_recalc > dates.date_index
// 	return dates
// }
Sources.getTable = async (db, rows) => {
	const table = {
		head: [],
		rows: rows
	}

	const col_indexes = {}
	let index = 0
	for (const i in rows) {
		for (const col_title in rows[i].cols){
			col_indexes[col_title] ??= index++
		}
	}
	table.head = Object.keys(col_indexes)

	
	
	for (const row of rows) {
		const cells = []
		cells.length = index
		cells.fill('')

		for (const col_title in row.cols){
			cells[col_indexes[col_title]] = row.cols[col_title]
		}
		row.cells = cells
		delete row.cols
	}
	return table
}
Sources.recalcAllChanges = async (db) => {
	await Sources.recalcAllChangesWithoutRowSearch(db)
	await Consciousness.recalcRowSearch(db)
}
Sources.recalcAllChangesWithoutRowSearch = async (db) => {
	await Consciousness.recalcEntitiesPropId(db)
	await Consciousness.recalcMulti(db)
	await Consciousness.recalcTexts(db)
	await Consciousness.recalcKeyIndex(db)
	await Consciousness.insertItems(db)

	await Consciousness.recalcRepresentSheet(db)
	await Consciousness.recalcRepresentCol(db)
	await Consciousness.recalcMaster(db)
}
Sources.recalcWinnerAppearSearch = async db => {
	
	//const monitor = new PerformanceMonitor()
	
	//monitor.start('recalcWinner')
	await Consciousness.recalcWinner(db) //Есть truncate и данные на сайте исчезнут. Потом выгрузка в транзакции, покажется когда всё выгрузится (10 секунд для 10 000 примерно). 

	//monitor.start('recalcAppear')
	await Consciousness.recalcAppear(db) // 456.06ms
	// monitor.start('recalcRowSearch')
	//await Consciousness.recalcRowSearch(db) //делается явно только в set-source-load, set-source-renovate, set-sources-load, set-sources-renovate, set-reset-values, set-source-clear
	//monitor.start('recalcItemSearch')
	await Consciousness.recalcItemSearch(db)

	//monitor.stop()
	//console.log(monitor.getReport())
	
}


Sources.scheduleDailyRenovate = (time = '01:09') => {	
	console.log('Sources.scheduleDailyRenovate', time)
	scheduleDailyTask(time, async () => {
		const rest_sources = await import("/-sources/rest.js").then(r => r.default)
		const data = await rest_sources.data('set-sources-renovate')
		console.log('/-sources/set-sources-renovate', data.result)
		return data.result
	})
}

// Sources.recalcAll = async (db, func) => {
// 	await Recalc.recalc(async (db) => {
// 		await func()

// 		await Sources.recalcAllChangesWithoutRowSearch(db)
// 		// return
		
		
// 		// await Consciousness.recalcWinner(db)

// 		// await Consciousness.recalcAppear(db)
// 		// await Consciousness.recalcRowSearch(db)
// 		// await Consciousness.recalcItemSearch(db)
// 	})
// }
// Sources.recalc = async (db, func, reindex) => {

// 	//if (!re) return false
// 	//if (!reindex) await db.exec(`UPDATE sources_settings SET date_recalc = now()`)

// 	if (Sources.recalc.start) {
// 		//Sources.recalc.all = true //Повторный запуск
// 		//return
// 	} else {
// 		Sources.recalc.start = new Date() //Первый запуск
// 	}
	
// 	console.time('Sources.recalc')
// 	const promise = func(db)
// 	const timeout = new Promise(resolve => setTimeout(resolve, 1000));
// 	await Promise.all([promise, timeout])
// 	console.timeEnd('Sources.recalc')
	

// 	// while (Sources.recalc.all) {
// 	// 	Sources.recalc.all = false
// 	// 	console.time('Sources.recalcAll')
// 	// 	await Consciousness.recalcEntitiesPropId(db)
// 	// 	await Consciousness.recalcMulti(db)
// 	// 	await Consciousness.recalcTexts(db)
// 	// 	await Consciousness.recalcKeyIndex(db)
// 	// 	await Consciousness.insertItems(db)
		
// 	// 	await Consciousness.recalcRepresentSheet(db)
// 	// 	await Consciousness.recalcRepresentCol(db)
// 	// 	await Consciousness.recalcMaster(db)
// 	// 	console.timeEnd('Sources.recalcAll')

// 	// 	// await Consciousness.recalcWinner(db)
		
// 	// 	// await Consciousness.recalcAppear(db)
// 	// 	// await Consciousness.recalcRowSearch(db)
// 	// 	// await Consciousness.recalcItemSearch(db)
		
// 	// }
// 	Sources.recalc.lastend = new Date()
// 	Sources.recalc.laststart = Sources.recalc.start
// 	Sources.recalc.start = false


// 	if (!reindex) {
// 		await db.exec(`UPDATE sources_settings SET date_recalc = now()`)
// 		Sources.deferredPublicate(db)
// 	}
// }
// Sources.recalc.lastend = false
// Sources.recalc.laststart = false
// //Sources.recalc.all = false
// Sources.recalc.start = false









Sources.execRestFunc = async (file, fnname, visitor, res, source) => {
	let params
	try {
		params = source.params ? JSON.parse(source.params) : {}
	} catch (e) {
		params = {}
		console.log('Ошибка в params', file, fnname, e)
	}

	const req = {
		params, 
		source_id: source.source_id
	}
	//, (view, params) => params ? JSON.parse(params) : {}

	const stat = await fs.stat(file).catch(r => console.log('Ошибка execRestFunc','<==========>', r,'</==========>'))
	if (!stat) return 'Не найден файл'
	res.date_mtime = new Date(stat.mtime)
	const rest = await import('/' + file).then(r => r.default).catch(r => console.log(r))
	if (!rest || !rest.get) return `Исключение в коде ` + file
	const reans = await rest.get(fnname, req, visitor).catch(r => console.log(r))
	if (!reans || !reans.data) return `Исключение в ${fnname}`
	const data = reans.data
	res.data = data
	if (!data.result) {		
		if (data.msg) return `${fnname} ${data.msg}`
		else return `Нет результата ${fnname}`
	}
	
	return ''
}
Sources.setSource = async (db, set, source) => {
	await db.exec(`
		UPDATE sources_sources
		SET ${set}
		WHERE source_id = :source_id
	`, source)
}
// Sources.setStart = async (db, source_id) => {
// 	await db.exec(`
// 		UPDATE sources_sources SET date_start = now() WHERE source_id = :source_id
// 	`, {source_id})
// }
// Sources.setEnd = async (db, source_id) => {
// 	await db.exec(`
// 		UPDATE sources_sources SET date_start = null WHERE source_id = :source_id
// 	`, {source_id})
// }
Sources.renovate = async (db, source, visitor) => {
	await Sources.check(db, source, visitor)
	if (source.need) {
		const end = await Sources.load(db, source, visitor)
		return end
	} else {
		return false
	}
}
// Sources.setDuration = async (db, source_id, name, timer) => {
// 	await db.exec(`
// 		UPDATE sources_sources
// 		SET ${name} = :duration
// 		WHERE source_id = :source_id
// 	`, {source_id, duration: Date.now() - timer})
// }













Sources.cleanSheets = (sheets = []) => {
	const titles = {}
	sheets = sheets.filter(sheet => {
		sheet.title = (sheet.title || '').trim()
		if (!sheet.title) return false //Пустой
		if (sheet.title[0] == '.') return false //Скрытый
		if (titles[sheet.title]) return false //Дубль
		titles[sheet.title] = sheet
		if (!Array.isArray(sheet.head) || !sheet.head.length) return false
		if (!Array.isArray(sheet.rows) || !sheet.rows.length) return false
		return true
	})
	for (const sheet of sheets) {
		const rows = sheet.rows

		sheet.head = sheet.head.map(name => {
			name = String(name).trim()
			//if (name[0] == '.') name = ''
			//else if (!nicked(name)) name = ''
			return name
		})

		for (const row_index in rows) {
			if (!Array.isArray(rows[row_index])) rows[row_index] = []
			rows[row_index] = rows[row_index].map((col, col_index) => sheet.head[col_index] ? col : null)
			for (const col_index in rows[row_index]) {
				if (rows[row_index][col_index] === null) continue
				rows[row_index][col_index] = String(rows[row_index][col_index]).trim()
			}
			
		}
		//sheet.rows = sheet.rows.filter(row => row.some(val => val)) //В строке есть хотя бы одно значение
		//sheet.head = sheet.head.filter(val => val)
		// for (const row_index in rows) {
		// 	for (const col_index in sheet.head) {
		// 		//rows[row_index][col_index] ??= ''
		// 	}
		// }
	}
	return sheets
}
Sources.VALUE_LENGTH = 127
Sources.PROP_LENGTH = 63
Sources.COL_LENGTH = 63

Sources.insertSheets = async (db, source, sheets) => {
	const {source_id} = source
	
	await db.exec(`DELETE FROM sources_sheets WHERE source_id = :source_id`, source)
	await db.exec(`DELETE FROM sources_cols WHERE source_id = :source_id`, source)
	await db.exec(`DELETE FROM sources_rows WHERE source_id = :source_id`, source)
	await db.exec(`DELETE FROM sources_cells WHERE source_id = :source_id`, source)
	
	const sources_sheets = new BulkInserter(db, 'sources_sheets', ['source_id', 'sheet_index', 'sheet_title']);
	for (const sheet_index in sheets) {
		const {title: sheet_title, rows, head} = sheets[sheet_index]
		await sources_sheets.insert([source_id, sheet_index, sheet_title])
		// await db.exec(`
		// 	INSERT INTO sources_sheets (source_id, sheet_index, sheet_title)
		// 	VALUES (:source_id, :sheet_index, :sheet_title)
		// `, {source_id, sheet_index, sheet_title})
	}
	await sources_sheets.flush()

	const sources_cols = new BulkInserter(db, 'sources_cols', ['source_id', 'sheet_index', 'col_index', 'col_nick', 'col_title']);
	for (const sheet_index in sheets) {
		const {title: sheet_title, rows, head} = sheets[sheet_index]
		const colsunique = {}
		for (const col_index in head) {

			let col_title = head[col_index].slice(-Sources.COL_LENGTH).trim()
			let col_nick = nicked(col_title)
			if (col_nick.length > Sources.COL_LENGTH) col_nick = nicked(col_nick.slice(-Sources.COL_LENGTH))
			if (colsunique[col_nick]) {
				colsunique[col_nick]++
				col_title = (col_title + ' ' + colsunique[col_nick]).slice(-Sources.COL_LENGTH).trim()
				col_nick = nicked(col_title)
				if (col_nick.length > Sources.COL_LENGTH) col_nick = nicked(col_nick.slice(-Sources.COL_LENGTH))
			} else {
				colsunique[col_nick] = 1
			}

			await sources_cols.insert([source_id, sheet_index, col_index, col_nick, col_title])
			// await db.exec(`
			// 	INSERT INTO sources_cols (source_id, sheet_index, col_index, col_nick, col_title)
			// 	VALUES (:source_id, :sheet_index, :col_index, :col_nick, :col_title)
			// `, {source_id, sheet_index, col_index, col_nick, col_title})
		}
	}
	await sources_cols.flush()

	const sources_rows = new BulkInserter(db, 'sources_rows', ['source_id', 'sheet_index', 'row_index']);
	for (const sheet_index in sheets) {
		const {title: sheet_title, rows, head} = sheets[sheet_index]
		for (const row_index in rows) {
			await sources_rows.insert([source_id, sheet_index, row_index])
			// await db.exec(`
			// 	INSERT INTO sources_rows (source_id, sheet_index, row_index)
			// 	VALUES (:source_id, :sheet_index, :row_index)
			// `, {source_id, sheet_index, row_index})
		}
	}
	await sources_rows.flush()

	const sources_cells = new BulkInserter(db, 'sources_cells', ['source_id', 'sheet_index', 'row_index', 'col_index', 'text']);
	
	for (const sheet_index in sheets) {
		const {title: sheet_title, rows, head} = sheets[sheet_index]
		for (const row_index in rows) {
			for (const col_index in rows[row_index]) {
				const text = rows[row_index][col_index]
				if (text === null) continue
				await sources_cells.insert([source_id, sheet_index, row_index, col_index, text])
				// await db.exec(`
				// 	INSERT INTO sources_cells (source_id, sheet_index, row_index, col_index, text)
				// 	VALUES (:source_id, :sheet_index, :row_index, :col_index, :text)
				// `, {source_id, sheet_index, row_index, col_index, text})
			}
		}
	}
	await sources_cells.flush()
	return sheets
}
Sources.check = async (db, source, visitor) => {
	if (source.date_start) return
	const res = {}
	const timer = Date.now()
	source.error = await Sources.execRestFunc(source.file, 'get-check', visitor, res, source)
	//date_content может быть больше чем date_mtime из предыдущей обработки

	source.date_mrest = (res.date_mtime || 0) / 1000
	source.date_msource = (res.data?.date_msource || 0) / 1000

	source.date_mtime = Math.round(Math.max(source.date_msource, source.date_mrest, 0))
	source.msg_check = res.data?.msg || ''
	Sources.calcSource(source)
	source.duration_check = Date.now() - timer
	await db.exec(`
		UPDATE sources_sources
		SET 
			date_mtime = FROM_UNIXTIME(:date_mtime), 
			date_mrest = FROM_UNIXTIME(:date_mrest), 
			date_msource = FROM_UNIXTIME(:date_msource), 
			msg_check = :msg_check,
			error = :error, 
			duration_check = :duration_check,
			date_check = now()
		WHERE source_id = :source_id
	`, source)

	return res.data
}


Sources.reorderProps = async (db) => {
	const list = await db.colAll(`
		SELECT prop_id
		FROM sources_props
		ORDER BY ordain
	`)
	let ordain = 0
	const promises = []
	for (const prop_id of list) {
		ordain = ordain + 2
		const r = db.exec(`
			UPDATE sources_props
			SET ordain = :ordain
			WHERE prop_id = :prop_id
		`, {ordain, prop_id})
		promises.push(r)
	}
	return Promise.all(promises)
}

Sources.reorderSources = async (db) => {
	const list = await db.colAll(`
		SELECT source_id
		FROM sources_sources
		ORDER BY ordain
	`)
	let ordain = 0
	const promises = []
	for (const source_id of list) {
		ordain = ordain + 2
		const r = db.exec(`
			UPDATE sources_sources
			SET ordain = :ordain
			WHERE source_id = :source_id
		`, {ordain, source_id})
		promises.push(r)
	}
	return Promise.all(promises)
}




const SELECT_PROP = `
	pr.prop_id,
	pr.name,
	pr.prop_title,
	pr.type,	
	pr.unit,
	pr.lettercase,
	pr.scale,
	pr.prop_nick,
	pr.known,
	pr.multi + 0 as multi,
	pr.comment,
	pr.represent_prop + 0 as represent_prop
`

//depricated
const SELECT_ENTITY = `
	pr.prop_id as entity_id, 
	pr.prop_id, 
	pr.prop_title as entity_title,
	pr.prop_nick as entity_nick,
	pr.comment,
	pr.represent_prop + 0 as represent_entity,
	pr.represent_prop + 0 as represent_prop,
	pr.prop_title,
	pr.type,
	pr.prop_nick
`
const SELECT_SOURCE = `
	so.source_id, 
	so.ordain, 
	so.source_title,
	so.params,
	UNIX_TIMESTAMP(so.date_check) as date_check, 
	UNIX_TIMESTAMP(so.date_content) as date_content, 
	UNIX_TIMESTAMP(so.date_load) as date_load, 
	UNIX_TIMESTAMP(so.date_exam) as date_exam,
	UNIX_TIMESTAMP(so.date_msource) as date_msource,
	UNIX_TIMESTAMP(so.date_mrest) as date_mrest,
	UNIX_TIMESTAMP(so.date_mtime) as date_mtime,
	UNIX_TIMESTAMP(so.date_start) as date_start,
	so.duration_rest,
	so.duration_check,
	so.duration_insert,
	so.duration_recalc,
	so.master + 0 as master,
	so.comment,
	so.error,
	so.msg_check,
	so.msg_load,
	so.represent_source + 0 as represent_source,
	so.represent_sheets + 0 as represent_sheets,
	so.represent_cols + 0 as represent_cols,
	so.renovate + 0 as renovate,
	so.entity_id,
	pr.prop_id, 
	pr.prop_title as entity_title,
	pr.known,
	pr.prop_nick as entity_nick,
	pr.represent_prop + 0 as represent_entity,
	pr.represent_prop + 0 as represent_prop,
	pr.prop_title
`
Sources.getPropByTitle = async (db, prop_title) => {
	const prop_nick = nicked(prop_title)
	const prop = await db.fetch(`
		SELECT 
			pr.prop_title as entity_title,
			${SELECT_PROP}
		FROM sources_props pr
		WHERE pr.prop_nick = :prop_nick
	`, {prop_nick})
	return prop
}
Sources.getProp = async (db, prop_id) => {
	const prop = await db.fetch(`
		SELECT 
			pr.prop_title as entity_title,
			${SELECT_PROP}
		FROM sources_props pr
		WHERE pr.prop_id = :prop_id
	`, {prop_id})
	return prop
}


Sources.getSheets = async (db, source_id) => {
	const source = await Sources.getSource(db, source_id)
	const custom_sheets =await db.all(`
		SELECT 
			csh.source_id,
			csh.sheet_title,

			cast(csh.represent_custom_sheet as SIGNED) as represent_custom_sheet,
			
			csh.entity_id,
			pr.prop_title as entity_title,
			pr.prop_title

		FROM sources_custom_sheets csh
			LEFT JOIN sources_sources so on so.source_id = csh.source_id
			LEFT JOIN sources_props pr on pr.prop_id = nvl(csh.entity_id, so.entity_id)
		WHERE csh.source_id = :source_id
		ORDER by csh.sheet_title
	`, {source_id})
	
	const loaded_sheets = await db.all(`
		SELECT 
			sh.source_id,
			sh.sheet_index,
			sh.sheet_title,
			sh.entity_id,
			cast(sh.represent_sheet as SIGNED) as represent_sheet,
			pr.prop_title as entity_title,
			pr.prop_title
		FROM sources_sheets sh
		LEFT JOIN sources_props pr on pr.prop_id = sh.entity_id
		WHERE sh.source_id = :source_id
		ORDER by sh.sheet_index
	`, {source_id})

	// const stat = view.data.stat ??= {}
	// stat.sheets = loaded_sheets.length
	// stat.rows = await db.col(`
	// 	SELECT count(*)
	// 	FROM sources_rows ro
	// 	WHERE ro.source_id = :source_id
	// `, {source_id})


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
		
		sheet.remove ||= descr.custom
		sheet[descr.loaded ? 'loaded' : 'custom'] = descr
	}
	for (const sheet_title in sheets) {
		const sheet = sheets[sheet_title]
		sheet.entity_title = sheet.custom?.entity_title || sheet.loaded?.entity_title
		sheet.entity_id = sheet.custom?.entity_id || sheet.loaded?.entity_id
		sheet.entity_plural = sheet.custom?.entity_plural || sheet.loaded?.entity_plural
		sheet.prop_title = sheet.custom?.prop_title || sheet.loaded?.prop_title
		
	}

	const list = Object.values(sheets)
	for (const sheet of list) {
		sheet.remove ||= await db.col(`
			SELECT 1 FROM sources_custom_cols
			WHERE source_id = :source_id and sheet_title = :sheet_title
			LIMIT 1
		`, sheet)
		// sheet.remove ||= await db.col(`
		// 	SELECT 1 FROM sources_custom_rows
		// 	WHERE source_id = :source_id and sheet_title = :sheet_title
		// 	LIMIT 1
		// `, sheet)
		// sheet.remove ||= await db.col(`
		// 	SELECT 1 FROM sources_custom_cells
		// 	WHERE source_id = :source_id and sheet_title = :sheet_title
		// 	LIMIT 1
		// `, sheet)
		sheet.cls = represent.calcCls(source.represent_source, sheet.custom?.represent_custom_sheet, source.represent_sheets)
	}
	return list.filter(sheet => sheet.loaded)
}
Sources.getSheetByTitle = async (db, source_id, sheet_title) => {
	const sheet = await db.fetch(`
		SELECT 
			sh.sheet_title,
			sh.sheet_index,
			sh.key_index,
			sh.entity_id,
			sh.source_id,
			sh.represent_sheet + 0 as represent_sheet,
			csh.represent_custom_sheet + 0 as represent_custom_sheet
		FROM sources_sheets sh
			left join sources_custom_sheets csh on (csh.source_id = sh.source_id and csh.sheet_title = sh.sheet_title)
		WHERE sh.source_id = :source_id and sh.sheet_title = :sheet_title
	`, {source_id, sheet_title})
	return sheet
}
Sources.getSheetByIndex = async (db, source_id, sheet_index) => {
	const sheet = await db.fetch(`
		SELECT 
			sh.sheet_title,
			sh.sheet_index,
			sh.key_index,
			sh.entity_id,
			sh.source_id,
			sh.represent_sheet + 0 as represent_sheet,
			csh.represent_custom_sheet + 0 as represent_custom_sheet
		FROM sources_sheets sh
			left join sources_custom_sheets csh on (csh.source_id = sh.source_id and csh.sheet_title = sh.sheet_title)
		WHERE sh.source_id = :source_id and sh.sheet_index = :sheet_index
	`, {source_id, sheet_index})
	return sheet
}
Sources.getSheet = async (db, source_id, sheet_title) => {
	const sheet_index = await db.col(`
		SELECT 
			sh.sheet_index
		FROM sources_sheets sh
		WHERE sh.source_id = :source_id and sh.sheet_title = :sheet_title
	`, {source_id, sheet_title})
	return Sources.getSheetByIndex(db, source_id, sheet_index)
}
Sources.getColByIndex = async (db, source_id, sheet_title, col_index) => {
	const col_title = await db.col(`
		SELECT co.col_title
		FROM sources_cols co, sources_sheets sh
		WHERE co.source_id = :source_id
			and co.sheet_index = sh.sheet_index
			and co.col_index = :col_index
			and sh.source_id = co.source_id
			and sh.sheet_title = :sheet_title
	`, {source_id, sheet_title, col_index})
	return Sources.getCol(db, source_id, sheet_title, col_title)
}
Sources.getCol = async (db, source_id, sheet_title, col_title) => {
	const col = await db.fetch(`
		SELECT 
			co.col_title,
			co.col_nick,
			co.prop_id,
			sh.sheet_title,
			co.sheet_index,
			co.col_index,
			co.source_id,
			co.represent_col + 0 as represent_col,
			cco.represent_custom_col + 0 as represent_custom_col
		FROM sources_cols co
			LEFT JOIN sources_sheets sh on (sh.source_id = co.source_id and sh.sheet_index = co.sheet_index)
			LEFT JOIN sources_custom_cols cco on (cco.source_id = co.source_id and cco.sheet_title = sh.sheet_title and cco.col_title = co.col_title)
		WHERE co.source_id = :source_id 
			and sh.sheet_title = :sheet_title
			and co.sheet_index = sh.sheet_index
			and co.col_title = :col_title
	`, {source_id, sheet_title, col_title})
	return col
}
Sources.cell = async (db, {source_id, sheet_title, key_id, repeat_index, col_title, multi_index = 0, sheet_index, row_index, col_index}) => {
	if (row_index == null) {
		const ind = await db.fetch(`
			SELECT ro.sheet_index, ro.row_index, co.col_index
			FROM sources_sheets sh, sources_rows ro, sources_cols co
			WHERE
				sh.source_id = :source_id
				and sh.sheet_title = :sheet_title

				and ro.source_id = sh.source_id
				and ro.sheet_index = sh.sheet_index
				and ro.key_id = :key_id 
				and ro.repeat_index = :repeat_index
				
				and co.source_id = sh.source_id
				and co.sheet_index = sh.sheet_index
				and co.col_title = :col_title
		`, {source_id, sheet_title, key_id, repeat_index, col_title})
		sheet_index = ind.sheet_index
		row_index = ind.row_index
		col_index = ind.col_index
	}
	//if (row_index != null) 
	return Sources.getCellByIndex(db, source_id, sheet_index, row_index, col_index, multi_index)
	//return Sources.getCell(db, source_id, sheet_title, key_id, repeat_index, col_title, multi_index)
}

Sources.getCellByIndex = async (db, source_id, sheet_index, row_index, col_index, multi_index = 0) => {
	const cell = await db.fetch(`
		SELECT 
			ce.source_id,
			ce.sheet_index,
			ce.row_index,
			ce.col_index,
			ce.multi_index,
			ce.pruning + 0 as pruning,
			nvl(wi.entity_id, 0) as winner,
			ce.value_id,
			ce.text,
			ce.date,
			ce.number,
			va.value_title,
			sh.sheet_title,
			co.col_title,
			co.prop_id,
			ro.key_id,
			vak.value_nick as key_nick,
			it.master + 0 as master
		FROM sources_cells ce
			LEFT JOIN sources_values va on (va.value_id = ce.value_id)
			LEFT JOIN sources_cols co on (co.source_id = ce.source_id and co.sheet_index = ce.sheet_index and co.col_index = ce.col_index)
			LEFT JOIN sources_rows ro on (ro.source_id = ce.source_id and ro.sheet_index = ce.sheet_index and ro.row_index = ce.row_index)
			LEFT JOIN sources_values vak on (vak.value_id = ro.key_id)
			LEFT JOIN sources_sheets sh on (sh.source_id = ce.source_id and sh.sheet_index = ce.sheet_index)
			LEFT JOIN sources_items it on (it.entity_id = sh.entity_id and ro.key_id = it.key_id)
			LEFT JOIN sources_wcells wi on (wi.source_id = ce.source_id and wi.sheet_index = ce.sheet_index and wi.col_index = ce.col_index and wi.row_index = ce.row_index)
		WHERE ce.source_id = :source_id 
			and ce.sheet_index = :sheet_index
			and ce.row_index = :row_index
			and ce.col_index = :col_index
			and ce.multi_index = :multi_index
	`, {source_id, sheet_index, col_index, row_index, multi_index})
	if (!cell) return
	cell.winner = Number(cell.winner)
	cell.full_text = await db.col(`
		SELECT
			GROUP_CONCAT(text ORDER BY multi_index SEPARATOR ', ')
		FROM sources_cells ce 
		WHERE ce.source_id = :source_id 
			and ce.sheet_index = :sheet_index
			and ce.row_index = :row_index
			and ce.col_index = :col_index
		GROUP BY col_index
	`, cell)
	return cell
}

Sources.getCell = async (db, source_id, sheet_title, key_id, repeat_index, col_title, multi_index = 0) => {
	return Sources.cell(db, {source_id, sheet_title, key_id, repeat_index, col_title, multi_index})
	// const cell = await db.fetch(`
	// 	SELECT 
	// 		ce.source_id,
	// 		ce.sheet_index,
	// 		ce.row_index,
	// 		ce.col_index,
	// 		ce.multi_index,
	// 		ce.represent_cell + 0 as represent_cell,
	// 		ce.represent + 0 as represent,
	// 		ce.pruning + 0 as pruning,
	// 		ce.winner + 0 as winner,
	// 		ce.value_id,
	// 		ce.text,
	// 		ce.date,
	// 		ce.number,
	// 		va.value_title,
	// 		sh.sheet_title,
	// 		co.col_title,
	// 		ro.key_id,
	// 		vak.value_nick as key_nick,
	// 		ro.repeat_index,
	// 		cce.represent_custom_cell + 0 as represent_custom_cell,
	// 		ce.represent_cell_summary + 0 as represent_cell_summary,
	// 		ce.represent_item_summary + 0 as represent_item_summary,
	// 		it.master + 0 as master
	// 	FROM sources_cells ce
	// 		LEFT JOIN sources_values va on (va.value_id = ce.value_id)
	// 		LEFT JOIN sources_cols co on (co.source_id = ce.source_id and co.sheet_index = ce.sheet_index and co.col_index = ce.col_index)
	// 		LEFT JOIN sources_rows ro on (ro.source_id = ce.source_id and ro.sheet_index = ce.sheet_index and ro.row_index = ce.row_index)
	// 		LEFT JOIN sources_values vak on (vak.value_id = ro.key_id)
	// 		LEFT JOIN sources_sheets sh on (sh.source_id = ce.source_id and sh.sheet_index = ce.sheet_index)
	// 		LEFT JOIN sources_items it on (it.entity_id = sh.entity_id and ro.key_id = it.key_id)
	// 		LEFT JOIN sources_custom_cells cce on (
	// 				cce.source_id = ce.source_id 
	// 				and cce.sheet_title = sh.sheet_title 
	// 				and cce.col_title = co.col_title
	// 				and cce.repeat_index = ro.repeat_index
	// 				and cce.key_id = ro.key_id

	// 				)
	// 	WHERE ce.source_id = :source_id 
	// 		and sh.sheet_title = :sheet_title
	// 		and ce.sheet_index = sh.sheet_index
	// 		and ro.key_id = :key_id
	// 		and ro.repeat_index = :repeat_index
	// 		and ce.row_index = ro.row_index
	// 		and co.col_title = :col_title
	// 		and ce.col_index = co.col_index
	// 		and ce.multi_index = :multi_index
	// `, {source_id, sheet_title, key_id, repeat_index, col_title, multi_index})
	// if (!cell) return
	
	// cell.full_text = await db.col(`
	// 	SELECT
	// 		GROUP_CONCAT(text ORDER BY multi_index SEPARATOR ', ')
	// 	FROM sources_cells ce 
	// 	WHERE ce.source_id = :source_id 
	// 		and ce.sheet_index = :sheet_index
	// 		and ce.row_index = :row_index
	// 		and ce.col_index = :col_index
	// 	GROUP BY col_index
	// `, cell)
	// return cell
}
Sources.row = async (db, {source_id, sheet_title, key_id, repeat_index, sheet_index, row_index}) => {
	if (row_index != null) return Sources.getRowByIndex(db, source_id, sheet_index, row_index)
	return Sources.getRow(db, source_id, sheet_title, key_id, repeat_index)
}
Sources.getRowByIndex = async (db, source_id, sheet_index, row_index) => {
	const row = await db.fetch(`
		SELECT 
			ro.source_id,
			ro.sheet_index,
			sh.sheet_title,
			ro.row_index,
			-- ro.repeat_index,
			-- ro.represent_row + 0 as represent_row,
			-- ro.represent_row_key + 0 as represent_row_key,
			-- cro.represent_custom_row + 0 as represent_custom_row,
			ro.key_id,
			sh.key_index,
			va.value_title,
			va.value_nick as key_nick
		FROM sources_rows ro
			LEFT JOIN sources_values va on (va.value_id = ro.key_id)
			LEFT JOIN sources_sheets sh on (sh.source_id = ro.source_id and sh.sheet_index = ro.sheet_index)
			-- LEFT JOIN sources_custom_rows cro on (cro.source_id = ro.source_id and cro.sheet_title = sh.sheet_title and cro.key_nick = va.value_nick and cro.repeat_index = ro.repeat_index)
		WHERE ro.source_id = :source_id 
			and ro.sheet_index = :sheet_index
			and ro.row_index = :row_index
	`, {source_id, sheet_index, row_index})
	return row
}
Sources.getRow = async (db, source_id, sheet_title, key_id, repeat_index) => {
	const row = await db.fetch(`
		SELECT 
			ro.source_id,
			ro.sheet_index,
			sh.sheet_title,
			ro.row_index,
			-- ro.repeat_index,
			-- ro.represent_row + 0 as represent_row,
			-- ro.represent_row_key + 0 as represent_row_key,
			-- cro.represent_custom_row + 0 as represent_custom_row,
			ro.key_id,
			sh.key_index,
			va.value_title,
			va.value_nick as key_nick
		FROM sources_rows ro
			LEFT JOIN sources_values va on (va.value_id = ro.key_id)
			LEFT JOIN sources_sheets sh on (sh.source_id = ro.source_id and sh.sheet_index = ro.sheet_index)
			-- LEFT JOIN sources_custom_rows cro on (cro.source_id = ro.source_id and cro.sheet_title = sh.sheet_title and cro.key_nick = va.value_nick and cro.repeat_index = ro.repeat_index)
		WHERE ro.source_id = :source_id 
			and sh.sheet_title = :sheet_title
			and ro.sheet_index = sh.sheet_index
			and ro.key_id = :key_id
			and ro.repeat_index = :repeat_index
	`, {source_id, sheet_title, key_id, repeat_index})
	return row
}
Sources.getValueById = async (db, value_id) => {
	const value = await db.fetch(`
		SELECT 
			va.value_id,
			va.value_nick,
			va.value_title			
		FROM sources_values va
		WHERE va.value_id = :value_id
	`, {value_id})
	return value
}
Sources.getItem = async (db, entity_id, key_id) => {
	const entity = await Sources.getEntity(db, entity_id)
	const prop_id = entity.prop_id
	const item = await db.fetch(`
		SELECT 
			va.value_nick as key_nick,
			va.value_title,
			it.key_id,
			it.entity_id
			-- it.represent_value + 0 as represent_value
			-- cva.represent_custom_value + 0 as represent_custom_value
		FROM sources_items it
			left join sources_values va on (va.value_id = it.key_id)
			-- left join sources_custom_values cva on (cva.prop_id = :prop_id and cva.value_nick = va.value_nick)
		WHERE va.value_id = :key_id and va.value_id = it.key_id and it.entity_id = :entity_id
	`, {key_id, entity_id, prop_id})
	return item
}

Sources.getSource = async (db, source_id) => {
	const source = await db.fetch(`
		SELECT 
		${SELECT_SOURCE}
		FROM sources_sources so
			LEFT JOIN sources_props pr on pr.prop_id = so.entity_id
		where source_id = :source_id
	`, {source_id})
	if (!source) return false
	Sources.calcSource(source)


	return source
}

Sources.getSources = async (db, entity_id) => {
	
	const list = await db.all(`
		SELECT 
			${SELECT_SOURCE}
		FROM sources_sources so
			LEFT JOIN sources_props pr on pr.prop_id = so.entity_id
		ORDER BY so.ordain
	`)

	for (const source of list) {
		
		Sources.calcSource(source)
	}
	return list
}
Sources.calcSource = source => {
	
	source.file = conf.dir + source.source_title + '.js'
	source.status = Sources.calcStatus(source)
	source.need = Sources.calcNeed(source)
	source.class = Sources.calcClass(source)
}
Sources.calcNeed = (source) => { 
	if (!source.renovate) return false
	if (source.date_start) return false
	if (source.error) return false
	if (!source.date_mtime) return true
	if (!source.date_load) return true
	if (source.date_load < source.date_mtime) return true
	return false
}
Sources.calcClass = (source) => {
	if (source.error) return 'error'
	if (source.date_start) return 'load'
	if (source.need && source.date_load < source.date_mtime) return 'need'
	if (source.news) return 'news'
	return 'ok'
}
Sources.calcStatus = (source) => { //Будет загрузка или нет
	if (source.date_start) return 'Идёт загрузка'
	if (source.error) return 'Есть ошибка'
	
	//if (!source.date_mtime) return 'Нужно выполнить проверку'
	if (!source.date_mtime) return 'Не было проверки'

	if (!source.date_load && source.renovate) return 'Не загружался'
	if (!source.date_load && !source.renovate) return 'Не загружался, актуализация запрещена'
	if (source.date_load < source.date_mtime && source.renovate) return 'Есть изменения'
	if (source.date_load < source.date_mtime && !source.renovate) return 'Есть изменения, актуализация запрещена'
	
	//return 'Текущие данные из источника актуальны'
	if (source.news) return `Новые колонки`
	return 'ОК'
}

Sources.getEntityStat = async (db, entity) => {
	const sources_by_sources = await db.all(`
		SELECT source_id, source_title
		FROM sources_sources
		WHERE entity_id = :entity_id
	`, entity)
	const sources_by_sheets = await db.all(`
		SELECT distinct sh.source_id, so.source_title
		FROM sources_sheets sh, sources_sources so
		WHERE sh.entity_id = :entity_id and so.source_id = sh.source_id
	`, entity)
	const sources = unique.bykey([...sources_by_sources, ...sources_by_sheets], 'source_id')
	const count_items = await db.col(`
		SELECT count(*) 
		FROM sources_items
		WHERE entity_id = :entity_id
	`, entity)
	const count_represent = await db.col(`
		SELECT count(*) 
		FROM sources_items
		WHERE entity_id = :entity_id and represent_value = 1
	`, entity)
	return {sources, count_items, count_represent}
}

Sources.getNameUnit = (title) => {
	let name = title
	let unit = ''
	const r = title.split(', ')
	if (r.length > 1) {
		unit = r.pop() || ''
		name = r.join(', ')
	}
	return {name, unit}
}
Sources.createProp = async (db, prop_title, type = 'text') => {
	

	prop_title = prop_title.slice(-Sources.PROP_LENGTH).trim()
	let prop_nick = nicked(prop_title)
	if (prop_nick.length > Sources.PROP_LENGTH) prop_nick = nicked(prop_nick.slice(-Sources.PROP_LENGTH))

	
	const ordain = await db.col('SELECT max(ordain) FROM sources_props') + 1
	const {name, unit} = Sources.getNameUnit(prop_title)
	if (unit.lenght > 10) return false
	const prop_id = await db.insertId(`
		INSERT INTO sources_props (prop_title, prop_nick, type, ordain, name, unit)
		VALUES (:prop_title, :prop_nick, :type, :ordain, :name, :unit)
		ON DUPLICATE KEY UPDATE prop_title = VALUES(prop_title), prop_id = LAST_INSERT_ID(prop_id)
	`, {prop_title, prop_nick, ordain, name, unit, type})
	await Sources.reorderProps(db)
	return prop_id
}
Sources.getSourceTitleByPropId = async (db, prop_id) => {
	const source_title = await db.col(`
		SELECT so.source_title
		FROM sources_sources so
		WHERE so.entity_id = :prop_id
		LIMIT 1
	`, {prop_id})
	if (source_title) return source_title

	const col_source_title = await db.col(`
		SELECT so.source_title
		FROM sources_cols co, sources_sources so
		WHERE co.prop_id = :prop_id 
			and co.source_id = so.source_id
		LIMIT 1
	`, {prop_id})
	if (col_source_title) return col_source_title

	const sheet_source_title = await db.col(`
		SELECT so.source_title
		FROM sources_sheets sh, sources_sources so
		WHERE sh.entity_id = :prop_id 
			and sh.source_id = so.source_id
		LIMIT 1
	`, {prop_id})
	if (sheet_source_title) return sheet_source_title

	return false
}
Sources.getSourceTitleByKeyId = async (db, prop_id) => {
	const source_title = await db.col(`
		SELECT so.source_title
		FROM sources_sources so
		WHERE so.entity_id = :prop_id
		LIMIT 1
	`, {prop_id})
	if (source_title) return source_title


	const sheet_source_title = await db.col(`
		SELECT so.source_title
		FROM sources_sheets sh, sources_sources so
		WHERE sh.entity_id = :prop_id 
			and sh.source_id = so.source_id
		LIMIT 1
	`, {prop_id})
	if (sheet_source_title) return sheet_source_title

	return false
}

//depricated
Sources.getEntity = async (db, entity_id) => {
	const entity = await db.fetch(`
		SELECT 
		${SELECT_ENTITY}
		FROM sources_props pr
		WHERE pr.prop_id = :entity_id
	`, {entity_id})
	return entity
}
Sources.getEntities = async (db) => {
	const list = await db.all(`
		SELECT 
		${SELECT_ENTITY}
		FROM sources_props pr
		GROUP BY pr.prop_id
		ORDER BY pr.ordain
	`)
	for (const entity of list) {
		entity.stat = await Sources.getEntityStat(db, entity)
	}
	return list
}






Sources.sheet = {}
Sources.sheet.getCostWithZero = (text) => {
	if (typeof text != 'string') return text
	let textnumber = text.replace(/\s/g, '')
	textnumber = textnumber.replace(',','.')
	textnumber = textnumber.replace('&comma;','.')
	return Math.round(Number(textnumber))
}
Sources.sheet.getCostDiscountWithZero = (text, dis) => {
	if (text == null) return null
	const cena = Sources.sheet.getCostWithZero(text)
	const discount = (100 - (dis || 0)) / 100
	const cost = Math.round(cena * discount)
	if (!cost && cena) return 1
	return cost
}
Sources.sheet.getCost = (text) => {
	const cost = Sources.sheet.getCostWithZero(text)
	if (!cost) return null
	return cost
}
Sources.sheet.getCostDiscount = (text, dis) => {
	const cost = Sources.sheet.getCostDiscountWithZero(text, dis)
	if (!cost) return null
	return cost
}

Sources.resetStarts = async (db) => {
	await db.exec(`UPDATE sources_settings SET date_recalc_start = now(),  date_recalc_finish = now()`)
	await db.exec(`UPDATE sources_sources SET date_start = null`)
}
Sources.sheet.delСol = (sheet, title) => {
	const rows = sheet.rows
	const index = sheet.head.indexOf(title)
	if (!~index) return
	sheet.head.splice(index, 1)
	for (const row of rows) {
		row.splice(index, 1)
	}
}
Sources.sheet.addСol = (sheet, index = null, title, fnget) => {
	const rows = sheet.rows
	const nick = nicked(title)
	if (index === null) index = sheet.head.length
	

	
	// const indexes = Object.fromEntries(sheet.head.map((name, i) => [nicked(name), i]))
	// const names = Object.fromEntries(sheet.head.map((name, i) => [i, nicked(name)]))

	// const names = {}
	// for (const i in sheet.head) {
	// 	const nick = nicked(sheet.head[i])
	// 	indexes[nick] = i
	// 	names[i] = nick
	// }
	for (const row of rows) {
		//row.splice(index, 0, '')
		const rowobj = {}
		for (const i in row) rowobj[sheet.head[i]] = row[i]
		//for (const i in row) obj[names[i]] = row[i]

		const text = fnget(rowobj)
		row.splice(index, 0, text === null ? null : String(text))
	}
	sheet.head.splice(index, 0, title)
}


Sources.sheet.createRow = (sheet) => {
	const row = Array(sheet.head.length).fill(null)
	const row_index = sheet.rows.push(row) - 1	
	return row_index
}

Sources.sheet.addCell = (sheet, row_index, col_title, value) => {
	let col_index = sheet.head.indexOf(col_title)
	if (col_index === -1) {
		col_index = sheet.head.push(col_title) - 1
		sheet.rows.forEach(row => row.push(null))
	}
	sheet.rows[row_index][col_index] = value
}

export default Sources