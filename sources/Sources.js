import nicked from "/-nicked"
import config from "/-config"
import unique from "/-nicked/unique.js"
import fs from "fs/promises"
const Sources = {}
import Consequences from "/-sources/Consequences.js"
import represent from "/-sources/represent.js"

Sources.execRestFunc = async (file, fnname, visitor, res, req = {}) => {
	const stat = await fs.stat(file).catch(r => console.log('Ошибка execRestFunc','<==========>', r,'</==========>'))
	if (!stat) return 'Не найден файл'
	res.modified = new Date(stat.mtime).getTime()
	const rest = await import('/' + file).then(r => r.default).catch(r => console.log(r))
	if (!rest || !rest.get) return `Исключение в коде ` + file
	const reans = await rest.get(fnname, req, visitor).catch(r => console.log(r))
	if (!reans || !reans.data) return `Исключение в ${fnname}`
	const data = reans.data
	if (!data.result) {		
		if (data.msg) return `${fnname} ${data.msg}`
		else return `Нет результата ${fnname}`
	}
	res.data = data
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


Sources.load = async (db, source, visitor) => {
	if (source.date_start) return false
	
	const timer_rest = Date.now()
	await Sources.setSource(db, `
		date_start = now()
	`, source)

	const res = {}
	source.error = await Sources.execRestFunc(source.file, 'get-load', visitor, res, {source_id: source.source_id})
	source.msg_load = res.data?.msg || ''
	source.duration_rest = Date.now() - timer_rest

	await Sources.setSource(db, `
		error = :error, 
		duration_rest = :duration_rest,
		msg_load = :msg_load
	`, source)

	if (source.error) {
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

	//Если пересчёт не надо сохранять, то не надо вызывать endrecalc. Метка пересчёта Sources.recalc.start не связана с сохраннением
	const timer_recalc = Date.now()
	const endrecalc = async () => {
		source.duration_recalc = Date.now() - timer_recalc
		await Sources.setSource(db, `
			duration_recalc = :duration_recalc
		`, source)
	}
	endrecalc.source = source
	return endrecalc
}

Sources.recalc = async (db, func) => {
	if (Sources.recalc.start) {
		Sources.recalc.all = true //Повторный запуск
		return
	} else {
		Sources.recalc.start = new Date() //Первый запуск
	}
	
	console.log('recalc', 'func', 'start')
	await func(db)
	console.log('recalc', 'func', 'end')
	
	while (Sources.recalc.all) {
		Sources.recalc.all = false
		console.log('recalc', 'all', 'start')
		await Consequences.all(db)
		console.log('recalc', 'all', 'end')
	}
	Sources.recalc.last = new Date()
	Sources.recalc.start = false	
}
Sources.recalc.last = false
Sources.recalc.all = false
Sources.recalc.start = false



















Sources.cleanSheets = (sheets) => {
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
			if (name[0] == '.') name = ''
			else if (!nicked(name)) name = ''
			return name
		})

		for (const row_index in rows) {
			if (!Array.isArray(rows[row_index])) rows[row_index] = []
			rows[row_index] = rows[row_index].map((row, col_index) => sheet.head[col_index] ? row : null)
			for (const col_index in rows[row_index]) {
				if (rows[row_index][col_index] === null) continue
				rows[row_index][col_index] = String(rows[row_index][col_index]).trim()
			}
			
		}
		sheet.rows = sheet.rows.filter(row => row.some(val => val))
		sheet.head = sheet.head.filter(val => val)
		for (const row_index in rows) {
			for (const col_index in sheet.head) {
				//rows[row_index][col_index] ??= ''
			}
		}
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
	
	
	for (const sheet_index in sheets) {
		const {title: sheet_title, rows, head} = sheets[sheet_index]
		

		await db.exec(`
			INSERT INTO sources_sheets (source_id, sheet_index, sheet_title)
			VALUES (:source_id, :sheet_index, :sheet_title)
		`, {source_id, sheet_index, sheet_title})
		
		for (const col_index in head) {

			const col_title = head[col_index].slice(-Sources.COL_LENGTH).trim()
			let col_nick = nicked(col_title)
			if (col_nick.length > Sources.COL_LENGTH) col_nick = nicked(col_nick.slice(-Sources.COL_LENGTH))

			await db.exec(`
				INSERT INTO sources_cols (source_id, sheet_index, col_index, col_nick, col_title)
				VALUES (:source_id, :sheet_index, :col_index, :col_nick, :col_title)
			`, {source_id, sheet_index, col_index, col_nick, col_title})
		}

		for (const row_index in rows) {

			await db.exec(`
				INSERT INTO sources_rows (source_id, sheet_index, row_index)
				VALUES (:source_id, :sheet_index, :row_index)
			`, {source_id, sheet_index, row_index})
			for (const col_index in rows[row_index]) {
				const text = rows[row_index][col_index]
				if (text === null) continue
				await db.exec(`
					INSERT INTO sources_cells (source_id, sheet_index, row_index, col_index, text)
					VALUES (:source_id, :sheet_index, :row_index, :col_index, :text)
				`, {source_id, sheet_index, row_index, col_index, text})
			}
		}
	}
	return sheets
}
Sources.check = async (db, source, visitor) => {
	if (source.date_start) return
	const res = {}
	const timer = Date.now()
	source.error = await Sources.execRestFunc(source.file, 'get-check', visitor, res, {source_id: source.source_id})
	//date_content может быть больше чем date_mtime из обработки
	source.date_mtime = Math.round(Math.max(source.date_content || 0, Number(res.data?.date_mtime || 0) || 0, res.modified || 0) / 1000)
	source.msg_check = res.data?.msg || ''
	Sources.calcSource(source)
	source.duration_check = Date.now() - timer
	await db.exec(`
		UPDATE sources_sources
		SET 
			date_mtime = FROM_UNIXTIME(:date_mtime), 
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
	pr.prop_nick,
	pr.multi + 0 as multi,
	pr.comment,
	pr.represent_prop + 0 as represent_prop
`
const SELECT_ENTITY = `
	pr.prop_id as entity_id, 
	pr.prop_id, 
	pr.prop_title as entity_title,
	pr.prop_nick as entity_nick,
	pr.prop_plural as entity_plural,
	pr.prop_2,
	pr.prop_5,
	pr.comment,
	pr.represent_prop + 0 as represent_entity,
	pr.represent_prop + 0 as represent_prop,
	pr.represent_values + 0 as represent_values,
	pr.prop_title,
	pr.type,
	pr.prop_nick
`
const SELECT_SOURCE = `
	so.source_id, 
	so.source_title,
	UNIX_TIMESTAMP(so.date_check) as date_check, 
	UNIX_TIMESTAMP(so.date_content) as date_content, 
	UNIX_TIMESTAMP(so.date_load) as date_load, 
	UNIX_TIMESTAMP(so.date_exam) as date_exam,
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
	so.represent_rows + 0 as represent_rows,
	so.represent_cols + 0 as represent_cols,
	so.represent_cells + 0 as represent_cells,
	so.renovate + 0 as renovate,
	so.entity_id,
	pr.prop_id, 
	pr.prop_title as entity_title,
	pr.prop_nick as entity_nick,
	pr.prop_2 as entity_2,
	pr.prop_5 as entity_5,
	pr.represent_prop + 0 as represent_entity,
	pr.represent_prop + 0 as represent_prop,
	pr.prop_title
`
Sources.getPropByTitle = async (db, prop_title) => {
	const prop_nick = nicked(prop_title)
	const prop = await db.fetch(`
		SELECT 
			pr.prop_title as entity_title,
			pr.prop_plural as entity_plural,
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
			pr.prop_plural as entity_plural,
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
			pr.prop_plural as entity_plural,
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
			pr.prop_plural as entity_plural,
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
		sheet.cls = represent.calcCls(source.represent_source, sheet.custom?.represent_custom_sheet, source.represent_sheets)
	}
	return list.filter(sheet => sheet.loaded)
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
			ce.represent_cell + 0 as represent_cell,
			ce.represent + 0 as represent,
			ce.pruning + 0 as pruning,
			nvl(wi.entity_id, 0) as winner,
			ce.value_id,
			ce.text,
			ce.date,
			ce.number,
			va.value_title,
			sh.sheet_title,
			co.col_title,
			ro.key_id,
			vak.value_nick as key_nick,
			ro.repeat_index,
			cce.represent_custom_cell + 0 as represent_custom_cell,
			ce.represent_cell_summary + 0 as represent_cell_summary,
			ce.represent_text_summary + 0 as represent_text_summary,
			it.master + 0 as master
		FROM sources_cells ce
			LEFT JOIN sources_values va on (va.value_id = ce.value_id)
			LEFT JOIN sources_cols co on (co.source_id = ce.source_id and co.sheet_index = ce.sheet_index and co.col_index = ce.col_index)
			LEFT JOIN sources_rows ro on (ro.source_id = ce.source_id and ro.sheet_index = ce.sheet_index and ro.row_index = ce.row_index)
			LEFT JOIN sources_values vak on (vak.value_id = ro.key_id)
			LEFT JOIN sources_sheets sh on (sh.source_id = ce.source_id and sh.sheet_index = ce.sheet_index)
			LEFT JOIN sources_items it on (it.entity_id = sh.entity_id and ro.key_id = it.key_id)
			LEFT JOIN sources_winners wi on (wi.prop_id = co.prop_id and wi.entity_id = sh.entity_id and wi.key_id = ro.key_id and wi.prop_id = wi.entity_id)
			LEFT JOIN sources_custom_cells cce on (
				cce.source_id = ce.source_id and cce.sheet_title = sh.sheet_title 
				and cce.col_title = co.col_title
				and cce.repeat_index = ro.repeat_index
				and cce.key_nick = vak.value_nick
			)
		WHERE ce.source_id = :source_id 
			and ce.sheet_index = :sheet_index
			and ce.row_index = :row_index
			and ce.col_index = :col_index
			and ce.multi_index = :multi_index
	`, {source_id, sheet_index, col_index, row_index, multi_index})
	if (!cell) return
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
	// 		ce.represent_text_summary + 0 as represent_text_summary,
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
			ro.repeat_index,
			ro.represent_row + 0 as represent_row,
			ro.represent_row_key + 0 as represent_row_key,
			cro.represent_custom_row + 0 as represent_custom_row,
			ro.key_id,
			sh.key_index,
			va.value_title,
			va.value_nick as key_nick
		FROM sources_rows ro
			LEFT JOIN sources_values va on (va.value_id = ro.key_id)
			LEFT JOIN sources_sheets sh on (sh.source_id = ro.source_id and sh.sheet_index = ro.sheet_index)
			LEFT JOIN sources_custom_rows cro on (cro.source_id = ro.source_id and cro.sheet_title = sh.sheet_title and cro.key_nick = va.value_nick and cro.repeat_index = ro.repeat_index)
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
			ro.repeat_index,
			ro.represent_row + 0 as represent_row,
			ro.represent_row_key + 0 as represent_row_key,
			cro.represent_custom_row + 0 as represent_custom_row,
			ro.key_id,
			sh.key_index,
			va.value_title,
			va.value_nick as key_nick
		FROM sources_rows ro
			LEFT JOIN sources_values va on (va.value_id = ro.key_id)
			LEFT JOIN sources_sheets sh on (sh.source_id = ro.source_id and sh.sheet_index = ro.sheet_index)
			LEFT JOIN sources_custom_rows cro on (cro.source_id = ro.source_id and cro.sheet_title = sh.sheet_title and cro.key_nick = va.value_nick and cro.repeat_index = ro.repeat_index)
		WHERE ro.source_id = :source_id 
			and sh.sheet_title = :sheet_title
			and ro.sheet_index = sh.sheet_index
			and ro.key_id = :key_id
			and ro.repeat_index = :repeat_index
	`, {source_id, sheet_title, key_id, repeat_index})
	return row
}
Sources.getValue = async (db, prop_id, value_id) => {
	const value = await db.fetch(`
		SELECT 
			va.value_id,
			va.value_nick,
			va.value_title,
			cva.represent_custom_value
		FROM sources_values va
			LEFT JOIN sources_custom_values cva on (cva.value_nick = va.value_nick and cva.prop_id = :prop_id)
		WHERE va.value_id = :value_id
	`, {value_id, prop_id})
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
			it.entity_id,
			it.represent_value + 0 as represent_value,
			cva.represent_custom_value + 0 as represent_custom_value
		FROM sources_items it
			left join sources_values va on (va.value_id = it.key_id)
			left join sources_custom_values cva on (cva.prop_id = :prop_id and cva.value_nick = va.value_nick)
		WHERE va.value_id = :key_id and va.value_id = it.key_id and it.entity_id = :entity_id
	`, {key_id, entity_id, prop_id})
	return item
}
Sources.getProps = async (db) => {
	const list = await db.all(`
		SELECT 
		${SELECT_PROP}
		FROM sources_props pr
		ORDER BY pr.ordain
	`)
	return list
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
	
	const list = entity_id ? await db.all(`
		SELECT 
		${SELECT_SOURCE}
		FROM sources_sources so
			LEFT JOIN sources_props pr on pr.prop_id = so.entity_id
		WHERE so.source_id in (
			SELECT distinct source_id 
			FROM sources_sheets 
			WHERE entity_id = :entity_id
		)
		ORDER BY so.master DESC, so.ordain
	`, {entity_id}) : await db.all(`
		SELECT 
		${SELECT_SOURCE}
		FROM sources_sources so
			LEFT JOIN sources_props pr on pr.prop_id = so.entity_id
		ORDER BY so.master DESC, so.ordain
	`)
	for (const source of list) {
		Sources.calcSource(source)
	}
	return list
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
	//const ordain = await db.col('SELECT max(ordain) FROM sources_props') + 1

	prop_title = prop_title.slice(-Sources.PROP_LENGTH).trim()
	let prop_nick = nicked(prop_title)
	if (prop_nick.length > Sources.PROP_LENGTH) prop_nick = nicked(prop_nick.slice(-Sources.PROP_LENGTH))

	const ordain = 0
	const {name, unit} = Sources.getNameUnit(prop_title)
	const prop_id = await db.insertId(`
		INSERT INTO sources_props (prop_title, prop_nick, type, ordain, name, unit, prop_2, prop_5, prop_plural)
   		VALUES (:prop_title, :prop_nick, :type, :ordain, :name, :unit, :name, :name, :name)
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





const conf = await config('sources')
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
	return 'ok'
}
Sources.calcStatus = (source) => { //Будет загрузка или нет
	if (source.date_start) return 'Идёт загрузка'
	if (source.error) return 'Есть ошибка'
	if (!source.date_mtime) return 'Нужно выполнить проверку'
	if (!source.date_load) return 'Не загружался'
	if (source.date_load < source.date_mtime && source.renovate) return 'Есть изменения'
	if (source.date_load < source.date_mtime && !source.renovate) return 'Есть изменения, актуализация запрещена'
	return 'Текущие данные из источника актуальны'
}

export default Sources