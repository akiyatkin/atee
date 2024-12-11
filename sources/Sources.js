import nicked from "/-nicked"
import config from "/-config"
import unique from "/-nicked/unique.js"
import fs from "fs/promises"
const Sources = {}
import Consequences from "/-sources/Consequences.js"


Sources.execRestFunc = async (file, fnname, visitor, res, req = {}) => {
	const stat = await fs.stat(file).catch(r => false)
	if (!stat) return 'Не найден файл'
	res.modified = new Date(stat.mtime).getTime()
	const rest = await import('/' + file).then(r => r.default).catch(r => false)
	if (!rest || !rest.get) return `Исключение в коде ` + file
	const reans = await rest.get(fnname, req, visitor).catch(r => false)
	if (!reans || !reans.data) return `Исключение в ${fnname}`
	const data = reans.data
	if (!data.result) return `Нет результата ${fnname} ${data.msg || ''}`
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
		await Sources.load(db, source, visitor)
		return source
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
	if (source.date_start) return
	
	const timer_rest = Date.now()

	await Sources.setSource(db, `
		date_start = now()
	`, source)

	const res = {}
	source.error = await Sources.execRestFunc(source.file, 'get-load', visitor, res)
	source.msg_load = res.data?.msg || ''
	source.duration_rest = Date.now() - timer_rest

	await Sources.setSource(db, `
		error = :error, 
		duration_rest = :duration_rest,
		msg_load = :msg_load
	`, source)

	if (source.error) return false

	const timer_insert = Date.now()
	
	const sheets = Sources.cleanSheets(res.data.sheets)
	await Sources.insertSheets(db, source, sheets).catch(e => {
		console.log(e)
		source.error = 'Ошибка при внесении данных: ' + e.toString()
	})

	source.duration_insert = Date.now() - timer_insert
	source.date_content = Math.round(Number(res.data?.date_content || 0) / 1000)
	source.date_mtime = Math.max(source.date_content || 0, source.date_mtime || 0)
	
	await Sources.setSource(db, `
		date_load = now(), 
		duration_insert = :duration_insert,
		error = :error,
		date_content = FROM_UNIXTIME(:date_content), 
		date_mtime = FROM_UNIXTIME(:date_mtime),
		date_start = null
	`, source)
}





















Sources.cleanSheets = (sheets) => {
	const titles = {}
	sheets = sheets.filter(sheet => {
		sheet.title = sheet.title.trim()
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
			rows[row_index] = rows[row_index].filter((row, col_index) => sheet.head[col_index])
			for (const col_index in rows[row_index]) {
				rows[row_index][col_index] = String(rows[row_index][col_index]).trim()
			}
			
		}
		sheet.rows = sheet.rows.filter(row => row.some(val => val))
		sheet.head = sheet.head.filter(val => val)
		for (const row_index in rows) {
			for (const col_index in sheet.head) {
				rows[row_index][col_index] ??= ''
			}
		}
	}
	return sheets
}
Sources.insertSheets = async (db, source, sheets) => {
	const {source_id} = source
	await db.exec(`
		DELETE sh, co, ro, ce
		FROM sources_sources so
			LEFT JOIN sources_sheets sh on sh.source_id = so.source_id
			LEFT JOIN sources_cols co on co.source_id = so.source_id
			LEFT JOIN sources_rows ro on ro.source_id = so.source_id
			LEFT JOIN sources_cells ce on ce.source_id = so.source_id
   		WHERE so.source_id = :source_id
	`, source)

	
	
	for (const sheet_index in sheets) {
		const {title: sheet_title, rows, head} = sheets[sheet_index]
		await db.exec(`
			INSERT INTO sources_sheets (source_id, sheet_index, sheet_title)
			VALUES (:source_id, :sheet_index, :sheet_title)
		`, {source_id, sheet_index, sheet_title})
		
		for (const col_index in head) {
			const col_title = head[col_index]
			const col_nick = nicked(col_title)
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
	source.error = await Sources.execRestFunc(source.file, 'get-check', visitor, res)
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


Sources.reorderProps = async (db, entity_id) => {
	const list = await db.colAll(`
		SELECT prop_id
		FROM sources_props
		WHERE entity_id = :entity_id
		ORDER BY ordain
	`, {entity_id})
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
Sources.reorderEntities = async (db) => {
	const list = await db.colAll(`
		SELECT entity_id
		FROM sources_entities
		ORDER BY ordain
	`)
	let ordain = 0
	const promises = []
	for (const entity_id of list) {
		ordain = ordain + 2
		const r = db.exec(`
			UPDATE sources_entities
			SET ordain = :ordain
			WHERE entity_id = :entity_id
		`, {ordain, entity_id})
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
	pr.entity_id,
	pr.prop_id,
	pr.prop_title,
	pr.type,
	pr.unit,
	pr.prop_nick,
	pr.known + 0 as known,
	pr.multi + 0 as multi,
	pr.comment,
	pr.represent_prop + 0 as represent_prop,
	pr.represent_custom_prop + 0 as represent_custom_prop
`
const SELECT_ENTITY = `
	en.entity_id, 
	en.prop_id, 
	en.entity_title,
	en.entity_nick,
	en.entity_plural,
	en.comment,
	en.represent_entity + 0 as represent_entity,
	en.represent_items + 0 as represent_items,
	en.represent_props + 0 as represent_props,
	en.represent_values + 0 as represent_values,
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
	so.dependent + 0 as dependent,
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
	en.prop_id, 
	en.entity_title,
	en.entity_nick,
	en.entity_plural,
	en.represent_entity + 0 as represent_entity,
	pr.prop_title
`
Sources.getProp = async (db, prop_id) => {
	const prop = await db.fetch(`
		SELECT 
			en.entity_title,
			en.entity_plural,
			${SELECT_PROP}
		FROM sources_props pr
			LEFT JOIN sources_entities en on en.entity_id = pr.entity_id
		WHERE pr.prop_id = :prop_id
	`, {prop_id})
	return prop
}
Sources.getSheet = async (db, source_id, sheet_index) => {
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
Sources.getCol = async (db, source_id, sheet_index, col_index) => {
	const col = await db.fetch(`
		SELECT 
			co.col_title,
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
		WHERE co.source_id = :source_id and co.sheet_index = :sheet_index and co.col_index = :col_index
	`, {source_id, sheet_index, col_index})
	return col
}
Sources.getCell = async (db, source_id, sheet_index, row_index, col_index, multi_index) => {
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
			ce.winner + 0 as winner,
			ce.value_id,
			ce.text,
			ce.date,
			ce.number,
			va.value_title,
			sh.sheet_title,
			co.col_title,
			ro.key_id,
			ro.repeat_index,
			cce.represent_custom_cell + 0 as represent_custom_cell,
			ce.represent_cell_summary + 0 as represent_cell_summary,
			ce.represent_text_summary + 0 as represent_text_summary
		FROM sources_cells ce
			LEFT JOIN sources_values va on (va.value_id = ce.value_id)
			LEFT JOIN sources_cols co on (co.source_id = ce.source_id and co.sheet_index = ce.sheet_index and co.col_index = ce.col_index)
			LEFT JOIN sources_rows ro on (ro.source_id = ce.source_id and ro.sheet_index = ce.sheet_index and ro.row_index = ce.row_index)
			LEFT JOIN sources_sheets sh on (sh.source_id = ce.source_id and sh.sheet_index = ce.sheet_index)
			LEFT JOIN sources_custom_cells cce on (cce.source_id = ce.source_id and cce.sheet_title = sh.sheet_title and cce.col_title = co.col_title)
		WHERE ce.source_id = :source_id 
			and ce.sheet_index = :sheet_index
			and ce.row_index = :row_index
			and ce.col_index = :col_index
			and ce.multi_index = :multi_index
	`, {source_id, sheet_index, row_index, col_index, multi_index})
	cell.full_text = await db.col(`
		SELECT
			GROUP_CONCAT(text ORDER BY multi_index SEPARATOR ', ')
		FROM sources_cells ce 
		WHERE ce.source_id = :source_id 
			and ce.sheet_index = :sheet_index
			and ce.row_index = :row_index
			and ce.col_index = :col_index
		GROUP BY col_index
	`, {source_id, sheet_index, row_index, col_index})
	return cell
}
Sources.getRow = async (db, source_id, sheet_index, row_index) => {
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
			va.value_nick
		FROM sources_rows ro
			LEFT JOIN sources_values va on (va.value_id = ro.key_id)
			LEFT JOIN sources_sheets sh on (sh.source_id = ro.source_id and sh.sheet_index = ro.sheet_index)
			LEFT JOIN sources_custom_rows cro on (cro.source_id = ro.source_id and cro.sheet_title = sh.sheet_title and cro.key_id = ro.key_id and cro.repeat_index = ro.repeat_index)
		WHERE ro.source_id = :source_id 
			and ro.sheet_index = :sheet_index
			and ro.row_index = :row_index
	`, {source_id, sheet_index, row_index})
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
			LEFT JOIN sources_custom_values cva on (cva.value_id = va.value_id and cva.prop_id = :prop_id)
		WHERE va.value_id = :value_id
	`, {value_id, prop_id})
	return value
}
Sources.getItem = async (db, entity_id, value_id) => {
	const entity = await Sources.getEntity(db, entity_id)
	const prop_id = entity.prop_id
	const item = await db.fetch(`
		SELECT 
			va.value_id,
			va.value_nick,
			va.value_title,
			it.key_id,
			it.entity_id,
			it.represent_item + 0 as represent_item,
			it.represent_item_key + 0 as represent_item_key,
			cit.represent_custom_item + 0 as represent_custom_item,
			cva.represent_custom_value + 0 as represent_custom_value
		FROM sources_values va, sources_items it
			left join sources_custom_items cit on (cit.entity_id = it.entity_id and cit.key_id = it.key_id)
			left join sources_custom_values cva on (cva.prop_id = :prop_id and cva.value_id = it.key_id)
		WHERE va.value_id = :value_id and va.value_id = it.key_id and it.entity_id = :entity_id
	`, {value_id, entity_id, prop_id})
	return item
}
Sources.getProps = async (db, entity_id) => {
	const list = await db.all(`
		SELECT 
		${SELECT_PROP}
		FROM sources_props pr
		WHERE pr.entity_id = :entity_id
		ORDER BY pr.ordain
	`, {entity_id})
	return list
}
Sources.getSource = async (db, source_id) => {
	const source = await db.fetch(`
		SELECT 
		${SELECT_SOURCE}
		FROM sources_sources so
			LEFT JOIN sources_entities en on en.entity_id = so.entity_id
			LEFT JOIN sources_props pr on pr.prop_id = en.prop_id
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
			LEFT JOIN sources_entities en on en.entity_id = so.entity_id
			LEFT JOIN sources_props pr on pr.prop_id = en.prop_id
		WHERE so.source_id in (
			SELECT distinct source_id 
			FROM sources_sheets 
			WHERE entity_id = :entity_id
		)
		ORDER BY so.ordain
	`, {entity_id}) : await db.all(`
		SELECT 
		${SELECT_SOURCE}
		FROM sources_sources so
			LEFT JOIN sources_entities en on en.entity_id = so.entity_id
			LEFT JOIN sources_props pr on pr.prop_id = en.prop_id
		ORDER BY so.ordain
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
		WHERE entity_id = :entity_id and represent_item = 1 and represent_item_key = 1
	`, entity)
	return {sources, count_items, count_represent}
}




Sources.getEntity = async (db, entity_id) => {
	const entity = await db.fetch(`
		SELECT 
		${SELECT_ENTITY}
		FROM sources_entities en
			LEFT JOIN sources_props pr on pr.prop_id = en.prop_id
		WHERE en.entity_id = :entity_id
	`, {entity_id})
	return entity
}
Sources.getEntities = async (db) => {
	const list = await db.all(`
		SELECT 
		${SELECT_ENTITY}
		FROM sources_entities en
			LEFT JOIN sources_props pr on pr.prop_id = en.prop_id
		GROUP BY en.entity_id
		ORDER BY en.ordain
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