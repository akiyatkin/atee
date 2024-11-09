import nicked from "/-nicked"
import config from "/-config"
import unique from "/-nicked/unique.js"
import fs from "fs/promises"
const Sources = {}


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
Sources.setStart = async (db, source_id) => {
	await db.exec(`
		UPDATE sources_sources SET date_start = now() WHERE source_id = :source_id
	`, {source_id})
}
// Sources.setEnd = async (db, source_id) => {
// 	await db.exec(`
// 		UPDATE sources_sources SET date_start = null WHERE source_id = :source_id
// 	`, {source_id})
// }
Sources.renovate = async (db, source, visitor) => {
	await Sources.check(db, source, visitor)
	if (source.need) await Sources.load(db, source, visitor)
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
	const res = {}
	const timer_rest = Date.now()
	await Sources.setStart(db, source.source_id)

	source.error = await Sources.execRestFunc(source.file, 'get-load', visitor, res)
	
	const timer_insert = Date.now()
	source.msg_load = res.data?.msg || ''
	source.duration_rest = Date.now() - timer_rest
	await db.exec(`
		UPDATE sources_sources
		SET 
			error = :error, 
			duration_rest = :duration_rest,
			msg_load = :msg_load
		WHERE source_id = :source_id
	`, source)
	if (source.error) return false
	
	
	source.date_content = Math.round(Number(res.data?.date_content || 0) / 1000)
	source.date_mtime = Math.max(source.date_content || 0, source.date_mtime || 0)


	const sheets = Sources.cleanSheets(res.data.sheets)
	await Sources.insertSheets(db, source, sheets).catch(e => {
		console.log(e)
		source.error = 'Ошибка при внесении данных: ' + e.toString()
	})
	await Sources.recalcEntities(db, source, sheets).catch(e => { //entity_id, prop_id
		console.log(e)
		source.error = 'Ошибка определения сущностей и свойств: ' + e.toString()
	}) 
	await Sources.recalcTexts(db, source, sheets).catch(e => {  //number, date, value_id, 
		console.log(e)
		source.error = 'Ошибка приведения типов: ' + e.toString()
	})
	await Sources.recalcSheets(db, source).catch(e => {//key_id, represent, winner
		console.log(e)
		source.error = 'Ошибка при пересчёте данных: ' + e.toString()
	})

	source.duration_insert = Date.now() - timer_insert
	
	await db.exec(`
		UPDATE sources_sources
		SET date_load = now(), 
			duration_insert = :duration_insert,
			error = :error,
			date_content = FROM_UNIXTIME(:date_content), 
			date_mtime = FROM_UNIXTIME(:date_mtime),
			date_start = null
		WHERE source_id = :source_id
	`, source)
	

	
	return res.data
}
Sources.recalcSheets = async (db, source) => { //Уже есть sheets, cols, cells, rows
	
	await Sources.recalcKeyIndex(db) //sheets key_index
	await Sources.recalcRows(db, source) //rows key_id
	
	await Sources.recalcRepresentSheetBySource(db, source)
	await Sources.recalcRepresentColBySource(db, source)
	await Sources.recalcRepresentRowBySource(db, source)
	await Sources.recalcRepresentCellBySource(db, source)

	await Sources.recalcRepresentKeyBySource(db, source)
	const entities = await db.colAll(`
		SELECT distinct entity_id FROM sources_sheets
		WHERE source_id = :source_id
	`, source)
	for (const entity_id of entities) {
		const entity = await Sources.getEntity(db, entity_id)
		await Sources.recalcItemsByEntity(db, entity) //insert items
		await Sources.recalcRepresentPropByEntity(db, entity)
		await Sources.recalcRepresentValueByEntity(db, entity)
		await Sources.recalcRepresentItemByEntity(db, entity)
		await Sources.recalcRepresentInstanceByEntity(db, entity)
	}
	await Sources.recalcRepresent(db)
	await Sources.recalcWinner(db)
	await Sources.recalcSearchBySourceId(db, source.source_id)
	
	
	/*
		represent_sheet (represent_custom_sheet, represent_sheets)
		represent_col (represent_custom_col, represent_cols)
		represent_row (represent_custom_row, represent_rows)
		represent_cell (represent_custom_cell, represent_cels)

		represent_prop (represent_custom_prop, represent_props)
		represent_value pos(represent_custom_value, represent_values)
		represent_item pos(represent_custom_item, represent_items)
		
		represent_key (represent_source, represent_sheet, represent_col, represent_row, represent_cell)

		represent_instance (represent_entity, represent_prop, represent_item, represent_value)
		
		represent (
			represent_instance
			represent_key,

			represent_prop,

			represent_sheet, 
			represent_col, 
			represent_row, 
			represent_cell,
			
		)
		winner (represent)
	*/
	
}
Sources.recalcKeyIndex = async (db) => { //Определить key_index, по имеющимся entity_id
	await db.exec(`
		UPDATE sources_sheets sh
		SET sh.key_index = null
	`)
	await db.exec(`
		UPDATE sources_sheets sh, sources_entities en, sources_cols co
		SET sh.key_index = co.col_index
		WHERE en.entity_id = sh.entity_id
		and co.source_id = sh.source_id and co.sheet_index = sh.sheet_index
		and co.prop_id = en.prop_id
		ORDER BY co.col_index
	`)
}
Sources.recalcEntities = async (db, source, sheets) => { //Определить entity_id, prop_id
	const {source_id} = source
	//source.entity_id дефолтная сущность
	//source.prop_id ключ дефолтной сущности
	
	const custom_sheets = await db.allto('sheet_title', `
		SELECT 
			csh.source_id, 
			csh.sheet_title, 
			csh.entity_id,
			se.prop_id
		FROM sources_custom_sheets csh, sources_entities se
		WHERE 
			csh.source_id = :source_id 
			and se.entity_id = csh.entity_id
	`, source)

	for (const sheet_index in sheets) {
		const {title, head} = sheets[sheet_index]
		const entity_id = custom_sheets[title]?.entity_id || source.entity_id || null
		if (!entity_id) continue
		
		const custom_cols = await db.allto('col_title', `
			SELECT prop_id
			FROM sources_custom_cols
			WHERE source_id = :source_id and sheet_title = :title and prop_id is not null
		`, {source_id, title})

		const prop_key_id = custom_sheets[title] ? custom_sheets[title].prop_id : source.prop_id
		let key_index = null
		for (const col_index in head) {
			const col_title = head[col_index]
			const col_nick = nicked(col_title)
			const prop_id = custom_cols[col_title]?.prop_id || await db.insertId(`
				INSERT INTO sources_props (entity_id, prop_title, prop_nick, type)
		   		VALUES (:entity_id, :col_title, :col_nick, 'text')
		   		ON DUPLICATE KEY UPDATE prop_id = LAST_INSERT_ID(prop_id)
			`, {entity_id, col_title, col_nick})
			if (prop_id == prop_key_id) key_index = col_index

			await db.exec(`
				UPDATE sources_cols
				SET prop_id = :prop_id
				WHERE source_id = :source_id and sheet_index = :sheet_index and col_index = :col_index
			`, {source_id, prop_id, sheet_index, col_index})
		}
		await db.exec(`
			UPDATE sources_sheets
			SET entity_id = :entity_id, key_index = :key_index
			WHERE source_id = :source_id and sheet_index = :sheet_index
		`, {source_id, entity_id, sheet_index, key_index})

		await Sources.reorderProps(db, entity_id)
	}
}
Sources.recalcTexts = async (db, source, sheets) => {
	const {source_id} = source
	for (const sheet_index in sheets) {
		const {title, head, rows} = sheets[sheet_index]
		const entity = await db.fetch(`
			SELECT sh.entity_id, en.prop_id
			FROM sources_sheets sh
			LEFT JOIN sources_entities en on en.entity_id = sh.entity_id
			WHERE source_id = :source_id and sheet_index = :sheet_index
		`, {source_id, sheet_index})
		if (!entity) continue
		
		const props = await db.all(`
			SELECT co.prop_id, pr.type, pr.multi + 1 as multi
			FROM sources_cols co
				LEFT JOIN sources_props pr on (pr.prop_id = co.prop_id)
			WHERE co.source_id = :source_id and co.sheet_index = :sheet_index
			ORDER BY co.col_index
		`, {source_id, sheet_index})
		
		for (const row_index in rows) {
			for (const col_index in rows[row_index]) {
				const prop = props[col_index]
				if (!prop) continue
				if (prop.type == 'text') continue
				const text = rows[row_index][col_index]
				if (!text) continue

				let pruning = 0
				let number = null
				let value_id = null
				let date = null
				
				if (prop.type == 'number') {
					number = text.replace(/\s/g,'')
					number = parseFloat(number)
					if (isNaN(number)) {
						number = null
						pruning = true
					}
					number = Math.round(number * 100) / 100
					const len = String(Math.round(number)).length
					if (len > 8) {
						number = null
						pruning = true
					}
				} else if (prop.type == 'date') {
					date = new Date(text)
					if (isNaN(date)) {
						date = null
						pruning = true
					}
				} else if (prop.type == 'value') {
					const value_title = text.slice(-63)
					if (value_title != text) pruning = true
					const value_nick = nicked(nicked(text).slice(-63))
					if (!value_nick) pruning = true
					if (value_nick) {
						value_id = await db.insertId(`
							INSERT INTO sources_values (value_title, value_nick)
					   		VALUES (:value_title, :value_nick)
					   		ON DUPLICATE KEY UPDATE value_id = LAST_INSERT_ID(value_id)
						`, {value_title, value_nick})
					}
				}
				await db.exec(`
					UPDATE sources_cells
					SET 
						value_id = :value_id,
						number = :number,
						date = :date,
						pruning = :pruning
					WHERE source_id = :source_id 
						and sheet_index = :sheet_index 
						and row_index = :row_index 
						and col_index = :col_index
				`, {source_id, sheet_index, row_index, col_index, value_id, number, date, pruning})
			}
		}
	}
}
Sources.recalcRows = async (db, source) => {
	await db.exec(`
		UPDATE sources_rows ro, sources_cells ce, sources_sheets sh
		SET ro.key_id = ce.value_id
		WHERE ro.source_id = :source_id 
		and sh.source_id = ro.source_id
		and sh.sheet_index = ro.sheet_index
		and ce.source_id = ro.source_id
		and ce.row_index = ro.row_index
		and ce.sheet_index = ro.sheet_index
		and ce.col_index = sh.key_index
	`, source)
}
Sources.recalcItemsByEntity = async (db, entity) => {
	await db.exec(`
		DELETE FROM sources_items 
		WHERE entity_id = :entity_id
	`, entity)

	const prop_id = entity.prop_id
	if (!prop_id) return
		
	const keyids = await db.colAll(`
		SELECT distinct ro.key_id
		FROM sources_rows ro, sources_sheets sh
		WHERE ro.key_id is not null
		and ro.source_id = sh.source_id
		and ro.sheet_index = sh.sheet_index
		and sh.entity_id = :entity_id
	`, entity)
	
	for (const key_id of keyids) {
		await db.exec(`
			INSERT INTO sources_items (entity_id, key_id)
			VALUES (:entity_id, :key_id)
		`, {entity_id: entity.entity_id, key_id})
	}
}

Sources.recalcWinner = async (db) => {
	await db.exec(`
		UPDATE sources_cells
		SET winner = 0
	`)
	await db.exec(`
		UPDATE sources_cells c, 
			(
				SELECT t.* 
				FROM (

					SELECT sh.entity_id, ro.key_id, co.prop_id, ce.source_id, so.ordain, ce.sheet_index, ce.row_index, ce.col_index
					FROM sources_cells ce, sources_cols co, sources_sources so, sources_sheets sh, sources_rows ro
					WHERE ce.sheet_index = co.sheet_index and ce.col_index = co.col_index and ce.source_id = co.source_id and co.prop_id is not null
						and sh.source_id = ce.source_id and sh.sheet_index = ce.sheet_index
						and so.source_id = ce.source_id
						and ro.source_id = ce.source_id and ro.sheet_index = ce.sheet_index and ro.row_index = ce.row_index

				) t
				LEFT JOIN (

					SELECT sh.entity_id, ro.key_id, co.prop_id, ce.source_id, so.ordain, ce.sheet_index, ce.row_index, ce.col_index
					FROM sources_cells ce, sources_cols co, sources_sources so, sources_sheets sh, sources_rows ro
					WHERE ce.sheet_index = co.sheet_index and ce.col_index = co.col_index and ce.source_id = co.source_id and co.prop_id is not null
						and sh.source_id = ce.source_id and sh.sheet_index = ce.sheet_index
						and so.source_id = ce.source_id
						and ro.source_id = ce.source_id and ro.sheet_index = ce.sheet_index and ro.row_index = ce.row_index

				) t2 on (
					t2.entity_id = t.entity_id and t2.key_id = t.key_id and t2.prop_id = t.prop_id 
					and (t2.ordain > t.ordain or t2.sheet_index > t.sheet_index or t2.row_index > t.row_index or t2.col_index > t.col_index)
				)
				WHERE t2.entity_id is null
			) t
		SET 
			c.winner = 1
		WHERE c.source_id = t.source_id 
			and c.sheet_index = t.sheet_index 
			and c.row_index = t.row_index 
			and c.col_index = t.col_index
	`)
}
Sources.recalcRepresentCellBySource = async (db, source) => {
	const { source_id } = source
	
	await db.exec(`
		UPDATE sources_cells
		SET represent_cell = :represent_cells
		WHERE source_id = :source_id 
	`, source)

	const custom_cells = await db.all(`
		SELECT 
			sh.sheet_index,
			cce.repeat_index,
			cce.key_id,
			co.col_index,
			cce.represent_custom_cell + 0 as represent_custom_cell
		FROM sources_sheets sh, sources_custom_cells cce, sources_cols co
		WHERE cce.source_id = :source_id
		and sh.source_id = cce.source_id 
		and sh.sheet_title = cce.sheet_title 
		and cce.represent_custom_cell is not null
		and co.source_id = sh.source_id
		and co.sheet_index = sh.sheet_index
		and co.col_title = cce.col_title
	`, {source_id})

	for (const {sheet_index, repeat_index, key_id, col_index, represent_custom_cell} of custom_cells) {
		const row_index = await db.col(`
			SELECT row_index 
			FROM sources_rows
			WHERE source_id = :source_id
				and sheet_index = :sheet_index
				and key_id = :key_id
				LIMIT :repeat_index, 1
		`,{source_id, sheet_index, key_id, repeat_index})
		if (!row_index && row_index != 0) continue
		await db.exec(`
			UPDATE sources_cells
			SET represent_cell = :represent_custom_cell
			WHERE source_id = :source_id 
			and sheet_index = :sheet_index
			and row_index = :row_index
			and col_index = :col_index
		`, {source_id, col_index, row_index, sheet_index, represent_custom_cell})
	}
	
}
Sources.recalcRepresent = async (db, source) => {
	/*
	represent (
			
			represent_key,

			represent_prop,

			represent_sheet, 
			represent_col, 
			represent_row, 
			represent_cell,
			
			represent_instance
		)
	*/
	await db.exec(`
		UPDATE 
			sources_cells ce, 
			sources_rows ro,
			sources_sheets sh, 
			sources_cols co, 
			sources_props pr,
			sources_items it
		SET ce.represent = ce.represent_cell
			and ro.represent_key 
			and sh.represent_sheet 
			and ro.represent_row 
			and co.represent_col 
			and pr.represent_prop 
			and it.represent_instance
		WHERE 
		sh.source_id = ce.source_id and sh.sheet_index = ce.sheet_index
		and co.source_id = ce.source_id and co.sheet_index = ce.sheet_index and co.col_index = ce.col_index
		and ro.source_id = ce.source_id and ro.sheet_index = ce.sheet_index and ro.row_index = ce.row_index
		and pr.prop_id = co.prop_id
		and it.key_id = ro.key_id and it.entity_id = sh.entity_id
	`)
}
// Sources.recalcRepresentItemBySourceId = async (db, source_id) => {
// 	const entities = await db.colAll(`
// 		SELECT distinct entity_id FROM sources_sheets
// 		WHERE source_id = :source_id
// 	`, {source_id})
// 	for (const entity_id of entities) {
// 		await Sources.recalcRepresentItemByEntityId(db, entity_id)
// 	}
// }
Sources.recalcRepresentKeyBySource = async (db, source) => {
	await db.exec(`
		UPDATE 
			sources_rows ro, 
			sources_sources so, 
			sources_sheets sh,
			sources_cols co, 
			sources_cells ce
		SET ro.represent_key = so.represent_source 
			and sh.represent_sheet 
			and ro.represent_row 
			and co.represent_col 
			and ce.represent_cell
		WHERE ro.source_id = :source_id
		and so.source_id = ro.source_id
		and sh.source_id = ro.source_id
		and sh.sheet_index = ro.sheet_index
		and co.source_id = ro.source_id
		and co.sheet_index = ro.sheet_index
		and co.col_index = sh.key_index
		and ce.source_id = ro.source_id
		and ce.row_index = ro.row_index
		and ce.col_index = co.col_index
		and ce.sheet_index = ro.sheet_index
	`, source)
}
Sources.recalcRepresentInstanceByEntity = async (db, entity) => {
	await db.exec(`
		UPDATE sources_items it, sources_entities en, sources_props pr
		SET it.represent_instance = it.represent_item and it.represent_value and pr.represent_prop and en.represent_entity
		WHERE it.entity_id = :entity_id
		and en.entity_id = it.entity_id 
		and pr.prop_id = en.prop_id
	`, entity)
}
Sources.recalcRepresentItemByEntity = async (db, entity) => {
	await db.exec(`
		UPDATE sources_items
		SET represent_item = :represent_items
		WHERE entity_id = :entity_id
	`, entity)

	await db.exec(`
		UPDATE sources_items it, sources_custom_items cit 
		SET it.represent_item = cit.represent_custom_item
		WHERE cit.entity_id = it.entity_id 
		and cit.key_id = it.key_id 
		and cit.represent_custom_item is not null
	`, entity)
}
Sources.recalcRepresentSheetBySource = async (db, source) => {
	await db.exec(`
		UPDATE sources_sheets
		SET represent_sheet = :represent_sheets
		WHERE source_id = :source_id 
	`, source)

	await db.exec(`
		UPDATE sources_sheets sh, sources_custom_sheets csh 
		SET sh.represent_sheet = csh.represent_custom_sheet
		WHERE csh.source_id = :source_id
		and csh.source_id = sh.source_id 
		and csh.sheet_title = sh.sheet_title 
		and csh.represent_custom_sheet is not null
	`, source)
}
Sources.recalcRepresentRowBySource = async (db, source) => {
	const {source_id} = source
	await db.exec(`
		UPDATE sources_rows
		SET represent_row = :represent_rows
		WHERE source_id = :source_id 
	`, source)

	const custom_rows = await db.all(`
		SELECT 
			sh.sheet_index,
			cro.repeat_index,
			cro.key_id,
			cro.represent_custom_row + 0 as represent_custom_row
		FROM sources_sheets sh, sources_custom_rows cro
		WHERE cro.source_id = :source_id
		and sh.source_id = cro.source_id and sh.sheet_title = cro.sheet_title and cro.represent_custom_row is not null
	`, source)

	for (const {sheet_index, repeat_index, key_id, represent_custom_row} of custom_rows) {
		const row_index = await db.col(`
			SELECT row_index 
			FROM sources_rows
			WHERE source_id = :source_id
				and sheet_index = :sheet_index
				and key_id = :key_id
				LIMIT :repeat_index, 1
		`,{source_id, sheet_index, key_id, repeat_index})
		if (!row_index && row_index != 0) continue
		await db.exec(`
			UPDATE sources_rows
			SET represent_row = :represent_custom_row
			WHERE source_id = :source_id 
			and sheet_index = :sheet_index
			and row_index = :row_index
		`, {source_id, row_index, sheet_index, represent_custom_row})
	}

}
Sources.recalcRepresentColBySource = async (db, source) => {
	await db.exec(`
		UPDATE sources_cols
		SET represent_col = :represent_cols
		WHERE source_id = :source_id 
	`, source)
	await db.exec(`
		UPDATE sources_cols co, sources_custom_cols cco
		SET co.represent_col = cco.represent_custom_col
		WHERE co.source_id = :source_id
			and cco.source_id = co.source_id 
			and cco.col_title = co.col_title
			and cco.represent_custom_col is not null
	`, source)
}
Sources.recalcRepresentPropByEntity = async (db, entity) => {
	await db.exec(`
		UPDATE sources_props
		SET represent_prop = nvl(represent_custom_prop, :represent_props)
		WHERE entity_id = :entity_id
	`, entity)
}
Sources.recalcRepresentValueByEntity = async (db, entity) => {
	await db.exec(`
		UPDATE sources_items
		SET represent_value = :represent_values
		WHERE entity_id = :entity_id
	`, entity)
	const {entity_id} = entity
	const custom_values = await db.all(`
		SELECT 
			cva.prop_id,
			cva.value_id,
			cva.represent_custom_value + 0 as represent_custom_value
		FROM sources_custom_values cva, sources_props pr
		WHERE pr.prop_id = cva.prop_id 
		and pr.entity_id = :entity_id
		and cva.represent_custom_value is not null
	`, entity)
	for (const {value_id, prop_id, represent_custom_value} of custom_values) {
		const key_id = await db.col(`
			SELECT distinct ro.key_id
			FROM sources_rows ro, sources_cells ce, sources_cols co
			WHERE co.prop_id = :prop_id 
			and ce.value_id = :value_id
			and ro.row_index = ce.row_index
			and ro.sheet_index = ce.sheet_index
			and co.col_index = ce.col_index
			and co.sheet_index = ce.sheet_index
			and co.source_id = ce.source_id
			and ce.source_id = ro.source_id
		`, {value_id, prop_id})
		await db.exec(`
			UPDATE sources_items it
			SET it.represent_value = :represent_custom_value
			WHERE it.entity_id = :entity_id
			and it.key_id = :key_id
		`, {entity_id, key_id, represent_custom_value})
	}
	
}

Sources.recalcSearchByEntityId = async (db, entity_id) => {
	const sources = await db.colAll(`
		SELECT distinct source_id FROM sources_sheets
		WHERE entity_id = :entity_id
	`, {entity_id})
	for (const source_id of sources) {
		await Sources.recalcSearchByEntityIdAndSourceId(db, entity_id, source_id)
	}
}
Sources.recalcSearchBySourceId = async (db, source_id) => {
	const entities = await db.colAll(`
		SELECT distinct entity_id FROM sources_sheets
		WHERE source_id = :source_id
	`, {source_id})
	for (const entity_id of entities) {
		await Sources.recalcSearchByEntityIdAndSourceId(db, entity_id, source_id)
	}
}
Sources.recalcSearchByEntityIdAndSourceId = async (db, entity_id, source_id) => {

	const losers = await db.colAll(`
		SELECT distinct d.key_id
		FROM sources_data d
			LEFT JOIN sources_values v on v.value_id = d.value_id
		WHERE d.key_id in (
			SELECT ro.key_id
			FROM sources_rows ro, sources_sheets sh, sources_cells ce
			WHERE sh.entity_id = :entity_id and sh.source_id = :source_id
				and ro.source_id = sh.source_id and ro.sheet_index = sh.sheet_index and ro.key_id is not null
				and ce.source_id = sh.source_id and ce.sheet_index = sh.sheet_index and ce.value_id = ro.key_id and (ce.winner = 0 or ce.represent = 0)
		)
	`, {source_id, entity_id})
	for (const key_id of losers) {
		await db.exec(`
			UPDATE sources_items
			SET search = ''
			WHERE entity_id = :entity_id and key_id = :key_id
		`, {entity_id, key_id})
	}

	const texts = await db.all(`
		SELECT d.key_id, 
			GROUP_CONCAT(d.text SEPARATOR ' ') as text, 
			GROUP_CONCAT(d.number SEPARATOR '-') as number, 
			GROUP_CONCAT(d.date SEPARATOR ' ') as date, 
			GROUP_CONCAT(v.value_nick SEPARATOR '-') as value_nick
		FROM sources_data d
			LEFT JOIN sources_values v on v.value_id = d.value_id
		WHERE d.key_id in (
			SELECT ro.key_id
			FROM sources_rows ro, sources_sheets sh, sources_cells ce
			WHERE sh.entity_id = :entity_id and sh.source_id = :source_id
				and ro.source_id = sh.source_id and ro.sheet_index = sh.sheet_index and ro.key_id is not null
				and ce.source_id = sh.source_id and ce.sheet_index = sh.sheet_index and ce.value_id = ro.key_id and ce.winner = 1 and ce.represent = 1
		)
		GROUP BY d.key_id
	`, {source_id, entity_id})
	for (const {key_id, text, number, date, value_nick} of texts) {
		let search = [nicked(text), number, nicked(date), value_nick]
		search = search.join('-')
		search = search.split('-')
		search = unique(search)
		search.sort()
		search = ' ' + search.join(' ') //Поиск выполняется по началу ключа с пробелом '% key%'
		await db.exec(`
			UPDATE sources_items
			SET search = :search
			WHERE entity_id = :entity_id and key_id = :key_id
		`, {entity_id, key_id, search})
	}
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
	pr.represent_prop + 0 as represent_prop
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
	
	Sources.calcSource(source)


	return source
}

Sources.getSources = async (db) => {
	const list = await db.all(`
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
		WHERE entity_id = :entity_id and represent_item = 1 and represent_value = 1
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