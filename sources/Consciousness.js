import Sources from "/-sources/Sources.js"
import nicked from "/-nicked"
import unique from "/-nicked/unique.js"
const Consciousness = {}
export default Consciousness

Consciousness.recalcAppear = async (db) => {
	await db.exec(`
		INSERT INTO sources_appears (source_id, entity_id, key_nick, date_appear)
		SELECT sh.source_id, sh.entity_id, va.value_nick, so.date_content
		FROM 
			sources_sheets sh, 
			sources_cells ce, 
			sources_values va,
			sources_sources so
		WHERE ce.source_id = sh.source_id
		and so.source_id = sh.source_id
		and ce.sheet_index = sh.sheet_index
		and ce.col_index = sh.key_index
		and va.value_id = ce.value_id
		and sh.entity_id is not null
		ON DUPLICATE KEY UPDATE date_disappear = null
	`)
	
	await db.exec(`
		UPDATE sources_appears ap
		LEFT JOIN (
			SELECT sh.source_id, sh.entity_id, va.value_nick 
			FROM
			sources_sheets sh, 
			sources_cells ce,
			sources_values va
			WHERE
			ce.source_id = sh.source_id
			AND va.value_id = ce.value_id
			and ce.sheet_index = sh.sheet_index
			and ce.col_index = sh.key_index
		) t on (
			t.source_id = ap.source_id
			and t.entity_id = ap.entity_id
			AND t.value_nick = ap.key_nick
		)
		SET ap.date_disappear = now()
		WHERE t.value_nick IS null
		and ap.date_disappear is null
	`)
}
Consciousness.recalcAppear_bySheet = async (db, source_id, sheet_index) => {
	return Consciousness.recalcAppear_bySource(db, source_id)
}
Consciousness.recalcAppear_bySource = async (db, source_id) => {
	await db.exec(`
		INSERT INTO sources_appears (source_id, entity_id, key_nick, date_appear)
		SELECT sh.source_id, sh.entity_id, va.value_nick, so.date_content
		FROM 
			sources_sheets sh, 
			sources_cells ce, 
			sources_values va,
			sources_sources so
		WHERE 
			sh.source_id = :source_id
			and ce.source_id = sh.source_id
			and so.source_id = sh.source_id
			and ce.sheet_index = sh.sheet_index
			and ce.col_index = sh.key_index
			and va.value_id = ce.value_id
			and sh.entity_id is not null
		ON DUPLICATE KEY UPDATE date_disappear = null
	`, {source_id})
	
	await db.exec(`
		UPDATE sources_appears ap
		LEFT JOIN (
			SELECT sh.source_id, sh.entity_id, va.value_nick 
			FROM
			sources_sheets sh, 
			sources_cells ce,
			sources_values va
			WHERE
				ce.source_id = :source_id
				and ce.source_id = sh.source_id
				AND va.value_id = ce.value_id
				and ce.sheet_index = sh.sheet_index
				and ce.col_index = sh.key_index
		) t on (
			t.source_id = ap.source_id
			and t.entity_id = ap.entity_id
			AND t.value_nick = ap.key_nick
		)
		SET ap.date_disappear = now()
		WHERE 
			ap.source_id = :source_id
			and t.value_nick IS null
			and ap.date_disappear is null
	`, {source_id})
}

Consciousness.recalcKeyIndex = async (db) => { //Определить key_index, по имеющимся entity_id
	await db.exec(`
		UPDATE sources_sheets sh
		SET sh.key_index = null
	`)
	await db.exec(`
		UPDATE sources_sheets sh, sources_cols co
		SET sh.key_index = co.col_index
		WHERE 
			co.source_id = sh.source_id 
			and co.sheet_index = sh.sheet_index
			and co.prop_id = sh.entity_id
	`)
}
Consciousness.recalcKeyIndex_bySource = async (db, source_id) => { //Определить key_index, по имеющимся entity_id
	await db.exec(`
		UPDATE sources_sheets sh
		SET sh.key_index = null
		WHERE
			sh.source_id = :source_id
	`, {source_id})

	await db.exec(`
		UPDATE sources_sheets sh, sources_cols co
		SET sh.key_index = co.col_index
		WHERE 
			sh.source_id = :source_id
			and co.source_id = sh.source_id 
			and co.sheet_index = sh.sheet_index
			and co.prop_id = sh.entity_id
	`, {source_id})
}
Consciousness.recalcKeyIndex_bySheet = async (db, source_id, sheet_index) => { //Определить key_index, по имеющимся entity_id
	await db.exec(`
		UPDATE sources_sheets sh
		SET sh.key_index = null
		WHERE
			sh.source_id = :source_id and sh.sheet_index = :sheet_index
	`, {source_id, sheet_index})

	await db.exec(`
		UPDATE sources_sheets sh, sources_cols co
		SET sh.key_index = co.col_index
		WHERE 
			sh.source_id = :source_id and sh.sheet_index = :sheet_index
			and co.source_id = sh.source_id 
			and co.sheet_index = sh.sheet_index
			and co.prop_id = sh.entity_id
	`, {source_id, sheet_index})
}
Consciousness.recalcEntitiesPropId = async (db) => { //Определить entity_id, prop_id, key_index
	
	await db.exec(`
		UPDATE sources_sources so, sources_sheets sh
			LEFT JOIN sources_custom_sheets csh on (csh.source_id = sh.source_id and csh.sheet_title = sh.sheet_title)
		SET sh.entity_id = nvl(csh.entity_id, so.entity_id)
		WHERE so.source_id = sh.source_id
	`)

	await db.exec(`
 		UPDATE sources_cols
 		SET prop_id = null
 	`)
	//У каждой колонки должен стоять свой prop_id 
	//+1) по entity_id, col_title в custom_cols, где совпадёт
	await db.exec(`
		UPDATE 
			sources_sheets sh, 
			sources_cols co, 
			sources_custom_cols sco
		SET co.prop_id = sco.prop_id
		WHERE co.source_id = sh.source_id
		and co.sheet_index = sh.sheet_index
		and sco.source_id = sh.source_id
		and sco.sheet_title = sh.sheet_title
		and sco.col_title = co.col_title
	`)
	//У каждой колонки должен стоять свой prop_id 
	//2) по entity_id, col_nick из props вставить, где null
	await db.exec(`
		UPDATE 
			sources_sheets sh, 
			sources_cols co, 
			sources_props pr
		SET co.prop_id = pr.prop_id
		WHERE co.source_id = sh.source_id
		and co.sheet_index = sh.sheet_index
		and co.prop_id is null
		and pr.prop_nick = co.col_nick
	`)

	//3) по entity_id, col_nick из synonyms вставить, где null
	await db.exec(`
		UPDATE 
			sources_sheets sh, 
			sources_cols co, 
			sources_synonyms sy
		SET co.prop_id = sy.prop_id
		WHERE co.source_id = sh.source_id
		and co.sheet_index = sh.sheet_index
		and co.prop_id is null
		and sy.col_nick = co.col_nick
	`)

	//noprop надо сбросить
	await db.exec(`
		UPDATE 
			sources_sheets sh, 
			sources_cols co, 
			sources_custom_cols sco
		SET co.prop_id = null
		WHERE co.source_id = sh.source_id
		and co.sheet_index = sh.sheet_index
		and sco.noprop = b'1'
		and sco.source_id = sh.source_id
		and sco.sheet_title = sh.sheet_title
		and sco.col_title = co.col_title
	`)
}
Consciousness.recalcEntitiesPropId_bySheet = async (db, source_id, sheet_index) => { //Определить entity_id, prop_id, key_index
	
	await db.exec(`
		UPDATE sources_sources so, sources_sheets sh
			LEFT JOIN sources_custom_sheets csh on (csh.source_id = sh.source_id and csh.sheet_title = sh.sheet_title)
		SET sh.entity_id = nvl(csh.entity_id, so.entity_id)
		WHERE 
			sh.source_id = :source_id and sh.sheet_index = :sheet_index
			and so.source_id = sh.source_id
	`, {source_id, sheet_index})

	await db.exec(`
 		UPDATE sources_cols
 		SET prop_id = null
 		WHERE 
 			source_id = :source_id and sheet_index = :sheet_index
 	`, {source_id, sheet_index})
	//У каждой колонки должен стоять свой prop_id 
	//+1) по entity_id, col_title в custom_cols, где совпадёт
	await db.exec(`
		UPDATE 
			sources_sheets sh, 
			sources_cols co, 
			sources_custom_cols sco
		SET co.prop_id = sco.prop_id
		WHERE 
			sh.source_id = :source_id and sh.sheet_index = :sheet_index
			and co.source_id = sh.source_id
			and co.sheet_index = sh.sheet_index
			and sco.source_id = sh.source_id
			and sco.sheet_title = sh.sheet_title
			and sco.col_title = co.col_title
	`, {source_id, sheet_index})
	//У каждой колонки должен стоять свой prop_id 
	//2) по entity_id, col_nick из props вставить, где null
	await db.exec(`
		UPDATE 
			sources_sheets sh, 
			sources_cols co, 
			sources_props pr
		SET co.prop_id = pr.prop_id
		WHERE 
			sh.source_id = :source_id and sh.sheet_index = :sheet_index
			and co.source_id = sh.source_id
			and co.sheet_index = sh.sheet_index
			and co.prop_id is null
			and pr.prop_nick = co.col_nick
	`, {source_id, sheet_index})

	//3) по entity_id, col_nick из synonyms вставить, где null
	await db.exec(`
		UPDATE 
			sources_sheets sh, 
			sources_cols co, 
			sources_synonyms sy
		SET co.prop_id = sy.prop_id
		WHERE 
			sh.source_id = :source_id and sh.sheet_index = :sheet_index
			and co.source_id = sh.source_id
			and co.sheet_index = sh.sheet_index
			and co.prop_id is null
			and sy.col_nick = co.col_nick
	`, {source_id, sheet_index})

	//noprop надо сбросить
	await db.exec(`
		UPDATE 
			sources_sheets sh, 
			sources_cols co, 
			sources_custom_cols sco
		SET co.prop_id = null
		WHERE 
			sh.source_id = :source_id and sh.sheet_index = :sheet_index
			and co.source_id = sh.source_id
			and co.sheet_index = sh.sheet_index
			and sco.noprop = b'1'
			and sco.source_id = sh.source_id
			and sco.sheet_title = sh.sheet_title
			and sco.col_title = co.col_title
	`, {source_id, sheet_index})
}
Consciousness.recalcEntitiesPropId_bySource = async (db, source_id) => { //Определить entity_id, prop_id, key_index
	

	await db.exec(`
		UPDATE sources_sources so, sources_sheets sh
			LEFT JOIN sources_custom_sheets csh on (csh.source_id = sh.source_id and csh.sheet_title = sh.sheet_title)
		SET sh.entity_id = nvl(csh.entity_id, so.entity_id)
		WHERE 
			sh.source_id = :source_id
			and so.source_id = sh.source_id
	`, {source_id})

	await db.exec(`
 		UPDATE sources_cols
 		SET prop_id = null
 		WHERE source_id = :source_id
 	`, {source_id})
	//У каждой колонки должен стоять свой prop_id 
	//+1) по entity_id, col_title в custom_cols, где совпадёт
	await db.exec(`
		UPDATE 
			sources_sheets sh, 
			sources_cols co, 
			sources_custom_cols sco
		SET co.prop_id = sco.prop_id
		WHERE sh.source_id = :source_id
		and co.source_id = sh.source_id
		and co.sheet_index = sh.sheet_index
		and sco.source_id = sh.source_id
		and sco.sheet_title = sh.sheet_title
		and sco.col_title = co.col_title
	`, {source_id})
	//У каждой колонки должен стоять свой prop_id 
	//2) по entity_id, col_nick из props вставить, где null
	await db.exec(`
		UPDATE 
			sources_sheets sh, 
			sources_cols co, 
			sources_props pr
		SET co.prop_id = pr.prop_id
		WHERE sh.source_id = :source_id
		and co.source_id = sh.source_id
		and co.sheet_index = sh.sheet_index
		and co.prop_id is null
		and pr.prop_nick = co.col_nick
	`, {source_id})

	//3) по entity_id, col_nick из synonyms вставить, где null
	await db.exec(`
		UPDATE 
			sources_sheets sh, 
			sources_cols co, 
			sources_synonyms sy
		SET co.prop_id = sy.prop_id
		WHERE sh.source_id = :source_id
		and co.source_id = sh.source_id
		and co.sheet_index = sh.sheet_index
		and co.prop_id is null
		and sy.col_nick = co.col_nick
	`, {source_id})

	//noprop надо сбросить
	await db.exec(`
		UPDATE 
			sources_sheets sh, 
			sources_cols co, 
			sources_custom_cols sco
		SET co.prop_id = null
		WHERE sh.source_id = :source_id
		and co.source_id = sh.source_id
		and co.sheet_index = sh.sheet_index
		and sco.noprop = b'1'
		and sco.source_id = sh.source_id
		and sco.sheet_title = sh.sheet_title
		and sco.col_title = co.col_title
	`, {source_id})
}
Consciousness.recalcRowsKeyIdRepeatIndex = async (db) => {
	await db.exec(`
		UPDATE sources_rows ro
		SET ro.key_id = null, ro.repeat_index = null
	`)
	await db.exec(`
		UPDATE sources_rows ro, sources_cells ce, sources_sheets sh
		SET ro.key_id = ce.value_id
		WHERE sh.source_id = ro.source_id
		and sh.sheet_index = ro.sheet_index
		and ce.source_id = ro.source_id
		and ce.row_index = ro.row_index
		and ce.sheet_index = ro.sheet_index
		and ce.col_index = sh.key_index
	`)
	await db.exec(`
		UPDATE sources_rows ro, (
			SELECT 
				source_id, sheet_index, row_index,
				ROW_NUMBER() OVER (PARTITION BY source_id, sheet_index, key_id ORDER BY row_index) - 1 AS repeat_index
			FROM sources_rows
		) cte
		SET ro.repeat_index = cte.repeat_index
		WHERE cte.source_id = ro.source_id
		and ro.sheet_index = cte.sheet_index 
		AND ro.row_index = cte.row_index
	`)
}
Consciousness.recalcRowsKeyIdRepeatIndex_bySheet = async (db, source_id, sheet_index) => {
	await db.exec(`
		UPDATE sources_rows ro
		SET ro.key_id = null, ro.repeat_index = null
		WHERE 
			ro.source_id = :source_id and ro.sheet_index = :sheet_index
	`, {source_id, sheet_index})
	await db.exec(`
		UPDATE sources_rows ro, sources_cells ce, sources_sheets sh
		SET ro.key_id = ce.value_id
		WHERE 
			ro.source_id = :source_id and ro.sheet_index = :sheet_index
			and sh.source_id = ro.source_id
			and sh.sheet_index = ro.sheet_index
			-- and ce.value_id is not null
			and ce.source_id = ro.source_id
			and ce.row_index = ro.row_index
			and ce.sheet_index = ro.sheet_index
			and ce.col_index = sh.key_index
	`, {source_id, sheet_index})
	await db.exec(`
		UPDATE sources_rows ro, (
			SELECT 
				source_id, sheet_index, row_index,
				ROW_NUMBER() OVER (PARTITION BY source_id, sheet_index, key_id ORDER BY row_index) - 1 AS repeat_index
			FROM sources_rows
		) cte
		SET ro.repeat_index = cte.repeat_index
		WHERE 
			ro.source_id = :source_id and ro.sheet_index = :sheet_index
			and cte.source_id = ro.source_id
			and ro.sheet_index = cte.sheet_index 
			AND ro.row_index = cte.row_index
	`, {source_id, sheet_index})
}
Consciousness.recalcRowsKeyIdRepeatIndex_bySource = async (db, source_id) => {
	await db.exec(`
		UPDATE sources_rows ro
		SET ro.key_id = null, ro.repeat_index = null
		WHERE 
			ro.source_id = :source_id
	`, {source_id})
	await db.exec(`
		UPDATE sources_rows ro, sources_cells ce, sources_sheets sh
		SET ro.key_id = ce.value_id
		WHERE 
			ro.source_id = :source_id 
			and sh.source_id = ro.source_id
			and sh.sheet_index = ro.sheet_index
			-- and ce.value_id is not null
			and ce.source_id = ro.source_id
			and ce.row_index = ro.row_index
			and ce.sheet_index = ro.sheet_index
			and ce.col_index = sh.key_index
	`, {source_id})
	await db.exec(`
		UPDATE sources_rows ro, (
			SELECT 
				source_id, sheet_index, row_index,
				ROW_NUMBER() OVER (PARTITION BY source_id, sheet_index, key_id ORDER BY row_index) - 1 AS repeat_index
			FROM sources_rows
		) cte
		SET ro.repeat_index = cte.repeat_index
		WHERE 
			ro.source_id = :source_id
			and cte.source_id = ro.source_id
			and ro.sheet_index = cte.sheet_index 
			AND ro.row_index = cte.row_index
	`, {source_id})
}
Consciousness.setCellType = async (db, cell) => {
	const type = cell.type
	const multi = cell.multi
	let pruning = 0
	let number = null
	let value_id = null
	let date = null
	const text = cell.text
	if (text) {
		if (type == 'number') {
			let textnumber = text.replace(/\s/g, '')
			//if (!multi) textnumber = textnumber.replace(',','.')
			if (!multi) textnumber = textnumber.replace('&comma;','.')

			number = parseFloat(textnumber)
			if (isNaN(number)) {
				number = null
				pruning = true
			}
			if (number != textnumber) {
				number = null //Любое обрезанное числов становится null
				//if (!number) number = null //Обрезанный 0 это null
				pruning = true
			}
			if (number != null) {
				number = Math.round(number * 100) / 100
				if (!number) number = 0.01
				const len = String(Math.round(number)).length
				if (len > 8) {
					number = null
					pruning = true
				}
			}
		} else if (type == 'date') {
			date = new Date(text)
			if (isNaN(date)) {
				date = null
				pruning = true
			} else if (date.getFullYear() > 2037) {
				date = null
				pruning = true
			}
		} else if (type == 'value') {
			
			const value_title = text.slice(-Sources.VALUE_LENGTH).trim()
			if (value_title != text) pruning = true
			let value_nick = nicked(text)
			if (value_nick.length > Sources.VALUE_LENGTH) value_nick = nicked(value_nick.slice(-Sources.VALUE_LENGTH))
			

			if (!value_nick) pruning = true
			//if (value_nick) {
				value_id = await db.col(`select value_id from sources_values where value_nick = :value_nick`, {value_nick})
				if (!value_id) value_id = await db.insertId(`
					INSERT INTO sources_values (value_title, value_nick)
			   		VALUES (:value_title, :value_nick)
				`, {value_title: value_nick ? value_title : '', value_nick})
			//}
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
			and multi_index = :multi_index
	`, {...cell, value_id, number, date, pruning})
}
Consciousness.recalcMulti = async (db) => { //prop_id может не быть, тогда multi считаем false

	const list = await db.all(`
		SELECT 
			co.source_id,
			co.sheet_index, 
			co.col_index, 
			ce.row_index,
			GROUP_CONCAT(ce.text SEPARATOR ", ") AS text, 
			COUNT(*) AS cnt,
			pr.multi + 0 as multi
		FROM sources_cells ce, sources_cols co
			LEFT JOIN sources_props pr on (pr.prop_id = co.prop_id)
		WHERE ce.source_id = co.source_id
			AND ce.col_index = co.col_index
			AND ce.sheet_index = co.sheet_index
		GROUP BY ce.source_id, ce.sheet_index, ce.row_index, ce.col_index
		HAVING (multi AND cnt = 1 AND INSTR(text, ', ')) OR (!multi AND cnt > 1)
	`)
	for (const {source_id, sheet_index, row_index, col_index, text, cnt, multi} of list) {		

		await db.exec(`
			DELETE FROM sources_cells
			WHERE source_id = :source_id 
				and row_index = :row_index
				and sheet_index = :sheet_index 
				and col_index = :col_index
		`, {source_id, sheet_index, row_index, col_index})
		if (multi) {
			const texts = text.split(', ')
			for (const multi_index in texts) {
				const text = texts[multi_index]
				await db.exec(`
					INSERT INTO sources_cells (source_id, sheet_index, row_index, col_index, multi_index, text)
					VALUES (:source_id, :sheet_index, :row_index, :col_index, :multi_index, :text)
				`, {source_id, sheet_index, row_index, col_index, multi_index, text})
			}
		} else { //multi нет, дубли мёрджим
			await db.exec(`
				INSERT INTO sources_cells (source_id, sheet_index, row_index, col_index, text)
				VALUES (:source_id, :sheet_index, :row_index, :col_index, :text)
			`, {source_id, sheet_index, row_index, col_index, text})
		}
	}
}
Consciousness.recalcMulti_byProp = async (db, prop_id) => {

	const list = await db.all(`
		SELECT 
			co.source_id,
			co.sheet_index, 
			co.col_index, 
			ce.row_index,
			GROUP_CONCAT(ce.text SEPARATOR ", ") AS text, 
			COUNT(*) AS cnt,
			pr.multi + 0 as multi
		FROM sources_cells ce, sources_cols co
			LEFT JOIN sources_props pr on (pr.prop_id = co.prop_id)
		WHERE 
			pr.prop_id = :prop_id
			and ce.source_id = co.source_id
			AND ce.col_index = co.col_index
			AND ce.sheet_index = co.sheet_index
		GROUP BY ce.source_id, ce.sheet_index, ce.row_index, ce.col_index
		HAVING (multi AND cnt = 1 AND INSTR(text, ', ')) OR (!multi AND cnt > 1)
	`, {prop_id})
	for (const {source_id, sheet_index, row_index, col_index, text, cnt, multi} of list) {		

		await db.exec(`
			DELETE FROM sources_cells
			WHERE source_id = :source_id 
				and row_index = :row_index
				and sheet_index = :sheet_index 
				and col_index = :col_index
		`, {source_id, sheet_index, row_index, col_index})
		if (multi) {
			const texts = text.split(', ')
			for (const multi_index in texts) {
				const text = texts[multi_index]
				await db.exec(`
					INSERT INTO sources_cells (source_id, sheet_index, row_index, col_index, multi_index, text)
					VALUES (:source_id, :sheet_index, :row_index, :col_index, :multi_index, :text)
				`, {source_id, sheet_index, row_index, col_index, multi_index, text})
			}
		} else { //multi нет, дубли мёрджим
			await db.exec(`
				INSERT INTO sources_cells (source_id, sheet_index, row_index, col_index, text)
				VALUES (:source_id, :sheet_index, :row_index, :col_index, :text)
			`, {source_id, sheet_index, row_index, col_index, text})
		}
	}
}

Consciousness.recalcMulti_bySource = async (db, source_id) => {
	const list = await db.all(`
		SELECT 
			co.source_id,
			co.sheet_index, 
			co.col_index, 
			ce.row_index,
			GROUP_CONCAT(ce.text SEPARATOR ", ") AS text, 
			COUNT(*) AS cnt,
			pr.multi + 0 as multi
		FROM sources_cells ce, sources_cols co
			LEFT JOIN sources_props pr on (pr.prop_id = co.prop_id)
		WHERE co.source_id = :source_id
			AND ce.source_id = co.source_id
			AND ce.col_index = co.col_index
			AND ce.sheet_index = co.sheet_index
		GROUP BY co.source_id, ce.sheet_index, ce.row_index, ce.col_index
		HAVING (multi AND cnt = 1 AND INSTR(text, ', ')) OR (!multi AND cnt > 1)
	`, {source_id})

	for (const {source_id, sheet_index, row_index, col_index, text, cnt, multi} of list) {		
		await db.exec(`
			DELETE FROM sources_cells
			WHERE source_id = :source_id 
				and row_index = :row_index
				and sheet_index = :sheet_index 
				and col_index = :col_index
		`, {source_id, sheet_index, row_index, col_index})
		if (multi) {
			const texts = text.split(', ')
			for (const multi_index in texts) {
				const text = texts[multi_index]
				await db.exec(`
					INSERT INTO sources_cells (source_id, sheet_index, row_index, col_index, multi_index, text)
					VALUES (:source_id, :sheet_index, :row_index, :col_index, :multi_index, :text)
				`, {source_id, sheet_index, row_index, col_index, multi_index, text})
			}
		} else { //multi нет, дубли мёрджим
			await db.exec(`
				INSERT INTO sources_cells (source_id, sheet_index, row_index, col_index, text)
				VALUES (:source_id, :sheet_index, :row_index, :col_index, :text)
			`, {source_id, sheet_index, row_index, col_index, text})
		}
	}
}
Consciousness.recalcMulti_bySheet = async (db, source_id, sheet_index) => {
	const list = await db.all(`
		SELECT 
			co.source_id,
			co.sheet_index, 
			co.col_index, 
			ce.row_index,
			GROUP_CONCAT(ce.text SEPARATOR ", ") AS text, 
			COUNT(*) AS cnt,
			pr.multi + 0 as multi
		FROM sources_cells ce, sources_cols co
			LEFT JOIN sources_props pr on (pr.prop_id = co.prop_id)
		WHERE 
			co.source_id = :source_id and co.sheet_index = :sheet_index
			AND ce.source_id = co.source_id
			AND ce.col_index = co.col_index
			AND ce.sheet_index = co.sheet_index
		GROUP BY co.source_id, ce.sheet_index, ce.row_index, ce.col_index
		HAVING (multi AND cnt = 1 AND INSTR(text, ', ')) OR (!multi AND cnt > 1)
	`, {source_id, sheet_index})

	for (const {source_id, sheet_index, row_index, col_index, text, cnt, multi} of list) {		
		await db.exec(`
			DELETE FROM sources_cells
			WHERE source_id = :source_id 
				and row_index = :row_index
				and sheet_index = :sheet_index 
				and col_index = :col_index
		`, {source_id, sheet_index, row_index, col_index})
		if (multi) {
			const texts = text.split(', ')
			for (const multi_index in texts) {
				const text = texts[multi_index]
				await db.exec(`
					INSERT INTO sources_cells (source_id, sheet_index, row_index, col_index, multi_index, text)
					VALUES (:source_id, :sheet_index, :row_index, :col_index, :multi_index, :text)
				`, {source_id, sheet_index, row_index, col_index, multi_index, text})
			}
		} else { //multi нет, дубли мёрджим
			await db.exec(`
				INSERT INTO sources_cells (source_id, sheet_index, row_index, col_index, text)
				VALUES (:source_id, :sheet_index, :row_index, :col_index, :text)
			`, {source_id, sheet_index, row_index, col_index, text})
		}
	}
}

Consciousness.recalcTexts_byProp = async (db, prop_id) => {
	await db.exec(`
		UPDATE sources_cells ce, sources_cols co
			LEFT JOIN sources_props pr on (pr.prop_id = co.prop_id)
		SET 
			ce.value_id = null, 
			ce.number = null, 
			ce.date = null, 
			ce.pruning = 0
		WHERE co.prop_id = :prop_id
			AND ce.source_id = co.source_id
			AND ce.col_index = co.col_index
			AND ce.sheet_index = co.sheet_index
			AND 
				(
					((pr.type = 'text' OR !pr.type)
						-- AND (
						-- 	ce.value_id IS NOT NULL 
						-- 	OR ce.number IS NOT NULL 
						-- 	OR ce.date IS NOT NULL 
						-- )
					)
				)
	`, {prop_id})
	const list = await db.all(`
		SELECT 
			co.source_id,
			co.sheet_index, 
			co.col_index, 
			ce.row_index,
			ce.multi_index,
			ce.text, 
			pr.type,
			pr.multi + 0 as multi,
			pr.prop_title
		FROM sources_cells ce, sources_cols co
			LEFT JOIN sources_props pr on (pr.prop_id = co.prop_id)
		WHERE co.prop_id = :prop_id
			AND ce.source_id = co.source_id
			AND ce.col_index = co.col_index
			AND ce.sheet_index = co.sheet_index
			AND 
				(
					(pr.type = 'value' 
						AND (
							ce.value_id IS NULL 
						)
					)
				
				OR
					(pr.type = 'number' 
						AND (
							ce.number IS NULL 
						)
					)
				OR
					(pr.type = 'date' 
						AND (
							ce.date IS NULL 
						)
					)
					
				)
	`, {prop_id})	
	for (const cell of list) {
		await Consciousness.setCellType(db, cell)
	}
}
Consciousness.recalcTexts_bySource = async (db, source_id) => {
	await db.exec(`
		UPDATE sources_cells ce, sources_cols co
			LEFT JOIN sources_props pr on (pr.prop_id = co.prop_id)
		SET 
			ce.value_id = null, 
			ce.number = null, 
			ce.date = null, 
			ce.pruning = 0
		WHERE co.source_id = :source_id
			AND ce.source_id = co.source_id
			AND ce.col_index = co.col_index
			AND ce.sheet_index = co.sheet_index
			AND 
				(
					((pr.type = 'text' OR !pr.type)
						AND (
							ce.value_id IS NOT NULL 
							OR ce.number IS NOT NULL 
							OR ce.date IS NOT NULL 
						)
					)
				)
	`, {source_id})
	const list = await db.all(`
		SELECT 
			co.sheet_index, 
			co.col_index, 
			ce.row_index,
			ce.multi_index,
			ce.text, 
			pr.type,
			pr.multi + 0 as multi,
			pr.prop_title
		FROM sources_cells ce, sources_cols co
			LEFT JOIN sources_props pr on (pr.prop_id = co.prop_id)
		WHERE co.source_id = :source_id
			AND ce.source_id = co.source_id
			AND ce.col_index = co.col_index
			AND ce.sheet_index = co.sheet_index
			AND 
				(
					(pr.type = 'value' 
						AND (
							ce.value_id IS NULL 
						)
					)
				
				OR
					(pr.type = 'number' 
						AND (
							ce.number IS NULL 
						)
					)
				OR
					(pr.type = 'date' 
						AND (
							ce.date IS NULL 
						)
					)
					
				)
	`, {source_id})	
	
	for (const cell of list) {
		cell.source_id = source_id
		await Consciousness.setCellType(db, cell)
	}
	
}
Consciousness.recalcTexts_bySheet = async (db, source_id, sheet_index) => {
	await db.exec(`
		UPDATE sources_cells ce, sources_cols co
			LEFT JOIN sources_props pr on (pr.prop_id = co.prop_id)
		SET 
			ce.value_id = null, 
			ce.number = null, 
			ce.date = null, 
			ce.pruning = 0
		WHERE 
			co.source_id = :source_id and co.sheet_index = :sheet_index
			AND ce.source_id = co.source_id
			AND ce.col_index = co.col_index
			AND ce.sheet_index = co.sheet_index
			AND 
				(
					((pr.type = 'text' OR !pr.type)
						AND (
							ce.value_id IS NOT NULL 
							OR ce.number IS NOT NULL 
							OR ce.date IS NOT NULL 
						)
					)
				)
	`, {source_id, sheet_index})
	const list = await db.all(`
		SELECT 
			co.col_index, 
			ce.row_index,
			ce.multi_index,
			ce.text, 
			pr.type,
			pr.multi + 0 as multi,
			pr.prop_title
		FROM sources_cells ce, sources_cols co
			LEFT JOIN sources_props pr on (pr.prop_id = co.prop_id)
		WHERE 
			co.source_id = :source_id and co.sheet_index = :sheet_index
			AND ce.source_id = co.source_id
			AND ce.col_index = co.col_index
			AND ce.sheet_index = co.sheet_index
			AND 
				(
					(pr.type = 'value' 
						AND (
							ce.value_id IS NULL 
						)
					)
				
				OR
					(pr.type = 'number' 
						AND (
							ce.number IS NULL 
						)
					)
				OR
					(pr.type = 'date' 
						AND (
							ce.date IS NULL 
						)
					)
					
				)
	`, {source_id, sheet_index})	
	
	for (const cell of list) {
		cell.source_id = source_id
		cell.sheet_index = sheet_index
		await Consciousness.setCellType(db, cell)
	}
	
}
Consciousness.recalcTexts = async (db) => {
	await db.exec(`
		UPDATE sources_cells ce, sources_cols co
			LEFT JOIN sources_props pr on (pr.prop_id = co.prop_id)
		SET 
			ce.value_id = null, 
			ce.number = null, 
			ce.date = null, 
			ce.pruning = 0
		WHERE ce.source_id = co.source_id
			AND ce.col_index = co.col_index
			AND ce.sheet_index = co.sheet_index
			AND (pr.type = 'text' OR pr.type is null)
	`)
	const list = await db.all(`
		SELECT 
			co.source_id,
			co.sheet_index, 
			co.col_index, 
			ce.row_index,
			ce.multi_index,
			ce.text, 
			pr.type,
			pr.multi + 0 as multi,
			pr.prop_title
		FROM sources_cells ce, sources_cols co
			LEFT JOIN sources_props pr on (pr.prop_id = co.prop_id)
		WHERE ce.source_id = co.source_id
			AND ce.col_index = co.col_index
			AND ce.sheet_index = co.sheet_index
			AND (
				(pr.type = 'value' AND ce.value_id IS NULL)
				OR
				(pr.type = 'number' AND ce.number IS NULL)
				OR
				(pr.type = 'date' AND ce.date IS NULL)
			)
	`)
	for (const cell of list) {
		await Consciousness.setCellType(db, cell)
	}	
}
// Consciousness.recalcTextsDirect = async (db, source) => { //depricated use recalcTexts
// 	const {source_id} = source
// 	const sheets = await db.colAll(`
// 		SELECT sheet_index
// 		FROM sources_sheets
// 		WHERE source_id = :source_id
// 	`, {source_id})
// 	for (const sheet_index of sheets) {
// 		const props = await db.allto('col_index', `
// 			SELECT co.col_index, co.prop_id, pr.type, pr.multi + 0 as multi
// 			FROM sources_cols co
// 				LEFT JOIN sources_props pr on (pr.prop_id = co.prop_id)
// 			WHERE co.source_id = :source_id and co.sheet_index = :sheet_index
// 		`, {source_id, sheet_index})
		
// 		const cells = await db.all(`
// 			SELECT ce.source_id, ce.sheet_index, ce.row_index, ce.col_index, ce.multi_index, ce.text
// 			FROM sources_cells ce
// 			WHERE ce.source_id = :source_id
// 				and ce.sheet_index = :sheet_index
// 		`, {source_id, sheet_index})
// 		for (const cell of cells) {
// 			const prop = props[cell.col_index]
// 			Object.assign(cell, prop)
// 			await Consciousness.setCellType(db, cell)
// 		}
// 	}
// }
// Consciousness.recalcPropByProp = async (db, prop) => {
// 	if (prop.type == 'text') {
// 		await db.exec(`
// 			UPDATE sources_cells ce, sources_cols co
// 			SET ce.value_id = null,
// 			ce.number = null,
// 			ce.date = null
// 			WHERE ce.source_id = co.source_id 
// 			and ce.sheet_index = co.sheet_index 
// 			and ce.col_index = co.col_index 
// 			and co.prop_id = :prop_id
// 		`, prop)
// 		return
// 	}
// 	const cells = await db.all(`
// 		SELECT ce.source_id, ce.sheet_index, ce.row_index, ce.col_index, ce.text
// 		FROM sources_cells ce, sources_cols co
// 		WHERE ce.source_id = co.source_id 
// 		and ce.sheet_index = co.sheet_index 
// 		and ce.col_index = co.col_index 
// 		and co.prop_id = :prop_id
// 	`, prop)
// 	for (const cell of cells) {
// 		await Consciousness.setCellType(db, cell, prop.type)
// 	}
// }
Consciousness.insertItems = async (db, entity) => {
	await db.exec(`
		TRUNCATE TABLE sources_items 
	`)

	await db.exec(`
		INSERT INTO sources_items (entity_id, key_id)
		SELECT distinct sh.entity_id, ro.key_id
		FROM sources_rows ro, sources_sheets sh
		WHERE ro.key_id is not null
		and ro.source_id = sh.source_id
		and ro.sheet_index = sh.sheet_index
	`)
}
Consciousness.insertItems_byEntity = async (db, entity_id) => {
	await db.exec(`
		DELETE FROM sources_items 
		WHERE entity_id = :entity_id
	`, {entity_id})

	const prop_id = entity.prop_id
	if (!prop_id) return

	await db.exec(`
		INSERT INTO sources_items (entity_id, key_id)
		SELECT distinct :entity_id, ro.key_id
		FROM sources_rows ro, sources_sheets sh
		WHERE ro.key_id is not null
		and ro.source_id = sh.source_id
		and ro.sheet_index = sh.sheet_index
		and sh.entity_id = :entity_id
	`, {entity_id})

}
Consciousness.insertItems_bySource = async (db, source_id) => {
	await db.exec(`
		DELETE it FROM sources_items it, sources_rows ro, sources_sheets sh
		WHERE 
			sh.source_id = :source_id
			and ro.source_id = sh.source_id and ro.sheet_index = sh.sheet_index
			and it.entity_id = sh.entity_id and it.key_id = ro.key_id
	`, {source_id})

	await db.exec(`
		INSERT INTO sources_items (entity_id, key_id)
		SELECT distinct sh.entity_id, ro.key_id
		FROM sources_rows ro, sources_sheets sh
		WHERE 
		sh.source_id = :source_id
		and ro.key_id is not null
		and ro.source_id = sh.source_id
		and ro.sheet_index = sh.sheet_index
	`, {source_id})

}
Consciousness.insertItems_bySheet = async (db, source_id, sheet_index) => {
	await db.exec(`
		DELETE it FROM sources_items it, sources_rows ro, sources_sheets sh
		WHERE 
			sh.source_id = :source_id and sh.sheet_index = :sheet_index
			and ro.source_id = sh.source_id and ro.sheet_index = sh.sheet_index
			and it.entity_id = sh.entity_id and it.key_id = ro.key_id
	`, {source_id, sheet_index})

	await db.exec(`
		INSERT INTO sources_items (entity_id, key_id)
		SELECT distinct sh.entity_id, ro.key_id
		FROM sources_rows ro, sources_sheets sh
		WHERE 
		sh.source_id = :source_id and sh.sheet_index = :sheet_index
		and ro.key_id is not null
		and ro.source_id = sh.source_id
		and ro.sheet_index = sh.sheet_index
	`, {source_id, sheet_index})

}
Consciousness.recalcRepresent_bySheet = async (db, source_id, sheet_index) => {
	await db.exec(`
		UPDATE sources_cells ce
		SET ce.represent = ce.represent_cell_summary and ce.represent_item_summary
		WHERE 
			ce.source_id = :source_id and ce.sheet_index = :sheet_index
	`, {source_id, sheet_index})
	await db.exec(`
		UPDATE sources_cols co, sources_cells ce, sources_values va, sources_custom_values cva
		SET ce.represent = ce.represent_cell_summary and ce.represent_item_summary and cva.represent_custom_value
		WHERE 
			ce.source_id = :source_id and ce.sheet_index = :sheet_index
			and va.value_id = ce.value_id
			and co.source_id = ce.source_id and co.sheet_index = ce.sheet_index and co.col_index = ce.col_index
			and cva.represent_custom_value is not null and cva.prop_id = co.prop_id and cva.value_nick = va.value_nick
			
	`, {source_id, sheet_index})
}
Consciousness.recalcRepresent_bySource = async (db, source_id) => {
	await db.exec(`
		UPDATE sources_cells ce
		SET ce.represent = ce.represent_cell_summary and ce.represent_item_summary
		WHERE ce.source_id = :source_id
	`, {source_id})
	await db.exec(`
		UPDATE sources_cols co, sources_cells ce, sources_values va, sources_custom_values cva
		SET ce.represent = ce.represent_cell_summary and ce.represent_item_summary and cva.represent_custom_value
		WHERE 
			ce.source_id = :source_id
			and va.value_id = ce.value_id
			and co.source_id = ce.source_id and co.sheet_index = ce.sheet_index and co.col_index = ce.col_index
			and cva.represent_custom_value is not null and cva.prop_id = co.prop_id and cva.value_nick = va.value_nick
			
	`, {source_id})
}
Consciousness.recalcRepresent = async (db) => {
	
	/*
		represent_source
		represent_sheet (represent_custom_sheet, represent_sheets)
		represent_col (represent_custom_col, represent_cols)
		represent_row (represent_custom_row, represent_rows)
		represent_cell (represent_custom_cell, represent_cels)
		represent_row_key (represent_cell, represent_col)
		represent_cell_summary (represent_row_key, represent_source, represent_sheet, represent_col, represent_row, represent_cell)
		

		
		represent_prop
		represent_value (represent_custom_value, represent_values)
		represent_item_key (represent_value, represent_prop)
		represent_item_summary (represent_item_key, represent_entity, represent_prop, represent_value)

		//Видимость prop для всех item которые его используют 
		и represent_props становится глобальной настройкой
		
		
		represent (represent_cell_summary, represent_item_summary)
		winner (represent)
	*/
	await db.exec(`
		UPDATE sources_cells ce
		SET ce.represent = ce.represent_cell_summary and ce.represent_item_summary
	`)
	await db.exec(`
		UPDATE sources_cols co, sources_cells ce, sources_values va, sources_custom_values cva
		SET ce.represent = ce.represent_cell_summary and ce.represent_item_summary and cva.represent_custom_value
		WHERE 
			va.value_id = ce.value_id
			and co.source_id = ce.source_id and co.sheet_index = ce.sheet_index and co.col_index = ce.col_index
			and cva.represent_custom_value is not null and cva.prop_id = co.prop_id and cva.value_nick = va.value_nick
			
	`)
}
Consciousness.recalcRepresentItemValue_bySheet = async (db, source_id, sheet_index) => {
	await db.exec(`
		UPDATE sources_items it, sources_props pr, sources_sheets sh, sources_rows ro
		SET it.represent_value = pr.represent_values
		WHERE 
			sh.source_id = :source_id and sh.sheet_index = :sheet_index
			and ro.source_id = sh.source_id and ro.sheet_index = sh.sheet_index
			and sh.entity_id = it.entity_id and ro.key_id = it.key_id
			and it.entity_id = pr.prop_id
	`, {source_id, sheet_index})
	await db.exec(`
		UPDATE 
			sources_items it, 
			sources_values va,
			sources_props pr, 
			sources_custom_values cva,
			sources_rows ro,
			sources_sheets sh
		SET it.represent_value = cva.represent_custom_value
		WHERE 
			sh.source_id = :source_id and sh.sheet_index = :sheet_index
			and ro.source_id = sh.source_id and ro.sheet_index = sh.sheet_index
			and sh.entity_id = it.entity_id and ro.key_id = it.key_id
			and it.key_id = va.value_id
			and it.entity_id = pr.prop_id
			and va.value_nick = cva.value_nick
			and cva.prop_id = pr.prop_id
			and cva.represent_custom_value is not null
	`, {source_id, sheet_index})
}
Consciousness.recalcRepresentItemValue_bySource = async (db, source_id) => {
	await db.exec(`
		UPDATE sources_items it, sources_props pr, sources_sheets sh, sources_rows ro
		SET it.represent_value = pr.represent_values
		WHERE 
			sh.source_id = :source_id
			and ro.source_id = sh.source_id and ro.sheet_index = sh.sheet_index
			and sh.entity_id = it.entity_id and ro.key_id = it.key_id
			and it.entity_id = pr.prop_id
	`, {source_id})
	await db.exec(`
		UPDATE 
			sources_items it, 
			sources_values va,
			sources_props pr, 
			sources_custom_values cva,
			sources_rows ro,
			sources_sheets sh
		SET it.represent_value = cva.represent_custom_value
		WHERE 
			sh.source_id = :source_id
			and ro.source_id = sh.source_id and ro.sheet_index = sh.sheet_index
			and sh.entity_id = it.entity_id and ro.key_id = it.key_id
			and it.key_id = va.value_id
			and it.entity_id = pr.prop_id
			and va.value_nick = cva.value_nick
			and cva.prop_id = pr.prop_id
			and cva.represent_custom_value is not null
	`, {source_id})
}
Consciousness.recalcRepresentItemValue = async (db) => {
	await db.exec(`
		UPDATE sources_items it, sources_props pr
		SET it.represent_value = pr.represent_values
		WHERE it.entity_id = pr.prop_id
	`)
	await db.exec(`
		UPDATE 
			sources_items it, 
			sources_values va,
			sources_props pr, 
			sources_custom_values cva
		SET it.represent_value = cva.represent_custom_value
		WHERE 
			it.key_id = va.value_id
			and it.entity_id = pr.prop_id
			and va.value_nick = cva.value_nick
			and cva.prop_id = pr.prop_id
			and cva.represent_custom_value is not null
	`)
}
// Consciousness.recalcRepresentValueByEntity = async (db, entity) => {
// 	await db.exec(`
// 		UPDATE sources_items
// 		SET represent_item_key = :represent_values
// 		WHERE entity_id = :entity_id
// 	`, entity)
// 	const {entity_id} = entity
// 	const custom_values = await db.all(`
// 		SELECT 
// 			cva.prop_id,
// 			cva.value_id,
// 			cva.represent_custom_value + 0 as represent_custom_value
// 		FROM sources_custom_values cva, sources_props pr
// 		WHERE pr.prop_id = cva.prop_id 
// 		and pr.entity_id = :entity_id
// 		and cva.represent_custom_value is not null
// 	`, entity)
// 	for (const {value_id, prop_id, represent_custom_value} of custom_values) {
// 		const key_id = await db.col(`
// 			SELECT distinct ro.key_id
// 			FROM sources_rows ro, sources_cells ce, sources_cols co
// 			WHERE co.prop_id = :prop_id 
// 			and ce.value_id = :value_id
// 			and ro.row_index = ce.row_index
// 			and ro.sheet_index = ce.sheet_index
// 			and co.col_index = ce.col_index
// 			and co.sheet_index = ce.sheet_index
// 			and co.source_id = ce.source_id
// 			and ce.source_id = ro.source_id
// 		`, {value_id, prop_id})
// 		await db.exec(`
// 			UPDATE sources_items it
// 			SET it.represent_item_key = :represent_custom_value
// 			WHERE it.entity_id = :entity_id
// 			and it.key_id = :key_id
// 		`, {entity_id, key_id, represent_custom_value})
// 	}
	
// }
Consciousness.recalcRepresentCol = async (db) => {
	await db.exec(`
		UPDATE sources_cols co, sources_sources so
		SET co.represent_col = so.represent_cols
		WHERE co.source_id = so.source_id
	`)
	await db.exec(`
		UPDATE sources_cols co, sources_custom_cols cco
		SET co.represent_col = cco.represent_custom_col
		WHERE cco.source_id = co.source_id 
			and cco.col_title = co.col_title
			and cco.represent_custom_col is not null
	`)
}
Consciousness.recalcRepresentCol_bySource = async (db, source_id) => {
	await db.exec(`
		UPDATE sources_cols co, sources_sources so
		SET represent_col = so.represent_cols
		WHERE 
			so.source_id = :source_id 
			and so.source_id = co.source_id
	`, {source_id})
	await db.exec(`
		UPDATE sources_cols co, sources_custom_cols cco
		SET co.represent_col = cco.represent_custom_col
		WHERE co.source_id = :source_id
			and cco.source_id = co.source_id 
			and cco.col_title = co.col_title
			and cco.represent_custom_col is not null
	`, {source_id})
}
Consciousness.recalcRepresentCol_bySheet = async (db, source_id, sheet_index) => {
	await db.exec(`
		UPDATE sources_cols co, sources_sources so
		SET represent_col = so.represent_cols
		WHERE 
			so.source_id = :source_id and co.sheet_index = :sheet_index
			and so.source_id = co.source_id
	`, {source_id, sheet_index})
	await db.exec(`
		UPDATE sources_cols co, sources_custom_cols cco
		SET co.represent_col = cco.represent_custom_col
		WHERE co.source_id = :source_id and co.sheet_index = :sheet_index
			and cco.source_id = co.source_id 
			and cco.col_title = co.col_title
			and cco.represent_custom_col is not null
	`, {source_id, sheet_index})
}
Consciousness.recalcRepresentRow = async (db) => {
	await db.exec(`
		UPDATE sources_rows ro, sources_sources so
		SET ro.represent_row = so.represent_rows
		WHERE 
			ro.source_id = so.source_id 
	`)
	await db.exec(`
		UPDATE sources_rows ro, sources_custom_rows cro, sources_values va
		SET ro.represent_row = cro.represent_custom_row
		WHERE va.value_id = ro.key_id
			and cro.source_id = ro.source_id 
			and cro.key_nick = va.value_nick
			and cro.repeat_index = ro.repeat_index
			and cro.represent_custom_row is not null
	`)
}
Consciousness.recalcRepresentRow_bySheet = async (db, source_id, sheet_index) => {
	await db.exec(`
		UPDATE sources_rows ro, sources_sources so
		SET ro.represent_row = so.represent_rows
		WHERE 
			so.source_id = :source_id and ro.sheet_index = :sheet_index
			and ro.source_id = so.source_id
	`, {source_id, sheet_index})
	await db.exec(`
		UPDATE sources_rows ro, sources_custom_rows cro, sources_values va
		SET ro.represent_row = cro.represent_custom_row
		WHERE ro.source_id = :source_id and ro.sheet_index = :sheet_index
			and va.value_id = ro.key_id
			and cro.source_id = ro.source_id 
			and cro.key_nick = va.value_nick
			and cro.repeat_index = ro.repeat_index
			and cro.represent_custom_row is not null
	`, {source_id, sheet_index})
}
Consciousness.recalcRepresentRow_bySource = async (db, source_id) => {
	await db.exec(`
		UPDATE sources_rows ro, sources_sources so
		SET ro.represent_row = so.represent_rows
		WHERE 
			so.source_id = :source_id 
			and so.source_id = ro.source_id
	`, {source_id})
	await db.exec(`
		UPDATE sources_rows ro, sources_custom_rows cro, sources_values va
		SET ro.represent_row = cro.represent_custom_row
		WHERE ro.source_id = :source_id
			and va.value_id = ro.key_id
			and cro.source_id = ro.source_id 
			and cro.key_nick = va.value_nick
			and cro.repeat_index = ro.repeat_index
			and cro.represent_custom_row is not null
	`, {source_id})
}
Consciousness.recalcRepresentCell = async (db) => {
	await db.exec(`
		UPDATE sources_cells ce, sources_sources so
		SET ce.represent_cell = so.represent_cells
		WHERE 
			ce.source_id = so.source_id 
			and ce.source_id = so.source_id
	`)

	await db.exec(`
		UPDATE sources_cells ce, sources_rows ro, sources_cols co, sources_sheets sh, sources_custom_cells cce, sources_values va
		SET ce.represent_cell = cce.represent_custom_cell
		WHERE ro.source_id = ce.source_id
			and ro.sheet_index = ce.sheet_index
			and ro.row_index = ce.row_index
			
			and sh.source_id = ce.source_id
			and sh.sheet_index = ce.sheet_index

			and co.source_id = ce.source_id
			and co.sheet_index = ce.sheet_index
			and co.col_index = ce.col_index
			
			and va.value_id = ro.key_id
			and cce.source_id = ce.source_id 
			and cce.sheet_title = sh.sheet_title
			and cce.key_nick = va.value_nick
			and cce.repeat_index = ro.repeat_index
			and cce.col_title = co.col_title
			and cce.represent_custom_cell is not null
	`)

	const custom_cells = await db.all(`
		SELECT 
			sh.source_id,
			sh.sheet_index,
			cce.repeat_index,
			cce.key_nick,
			va.value_id as key_id,
			co.col_index,
			cce.represent_custom_cell + 0 as represent_custom_cell
		FROM sources_sheets sh, sources_custom_cells cce, sources_cols co, sources_values va
		WHERE sh.source_id = cce.source_id 
		and va.value_nick = cce.key_nick
		and sh.sheet_title = cce.sheet_title 
		and cce.represent_custom_cell is not null
		and co.source_id = sh.source_id
		and co.sheet_index = sh.sheet_index
		and co.col_title = cce.col_title
	`)


	for (const {source_id, sheet_index, repeat_index, key_nick, key_id, col_index, represent_custom_cell} of custom_cells) {
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
Consciousness.recalcRepresentCell_bySource = async (db, source_id) => {
	
	await db.exec(`
		UPDATE sources_cells ce, sources_sources so
		SET represent_cell = so.represent_cells
		WHERE 
			so.source_id = :source_id 
			and so.source_id = ce.source_id
	`, {source_id})

	await db.exec(`
		UPDATE sources_cells ce, sources_rows ro, sources_cols co, sources_sheets sh, sources_custom_cells cce, sources_values va
		SET ce.represent_cell = cce.represent_custom_cell
		WHERE ce.source_id = :source_id
			and ro.source_id = ce.source_id
			and ro.sheet_index = ce.sheet_index
			and ro.row_index = ce.row_index
			
			and sh.source_id = ce.source_id
			and sh.sheet_index = ce.sheet_index

			and co.source_id = ce.source_id
			and co.sheet_index = ce.sheet_index
			and co.col_index = ce.col_index
			
			and va.value_id = ro.key_id
			and cce.source_id = ce.source_id 
			and cce.sheet_title = sh.sheet_title
			and cce.key_nick = va.value_nick
			and cce.repeat_index = ro.repeat_index
			and cce.col_title = co.col_title
			and cce.represent_custom_cell is not null
	`, {source_id})

	const custom_cells = await db.all(`
		SELECT 
			sh.sheet_index,
			cce.repeat_index,
			cce.key_nick,
			va.value_id as key_id,
			co.col_index,
			cce.represent_custom_cell + 0 as represent_custom_cell
		FROM sources_sheets sh, sources_custom_cells cce, sources_cols co, sources_values va
		WHERE cce.source_id = :source_id
		and sh.source_id = cce.source_id 
		and va.value_nick = cce.key_nick
		and sh.sheet_title = cce.sheet_title 
		and cce.represent_custom_cell is not null
		and co.source_id = sh.source_id
		and co.sheet_index = sh.sheet_index
		and co.col_title = cce.col_title
	`, {source_id})


	for (const {sheet_index, repeat_index, key_nick, key_id, col_index, represent_custom_cell} of custom_cells) {
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
Consciousness.recalcRepresentCell_bySheet = async (db, source_id, sheet_index) => {
	
	await db.exec(`
		UPDATE sources_cells ce, sources_sources so
		SET represent_cell = so.represent_cells
		WHERE 
			ce.source_id = :source_id and ce.sheet_index = :sheet_index
			and so.source_id = ce.source_id
	`, {source_id, sheet_index})

	await db.exec(`
		UPDATE sources_cells ce, sources_rows ro, sources_cols co, sources_sheets sh, sources_custom_cells cce, sources_values va
		SET ce.represent_cell = cce.represent_custom_cell
		WHERE 
			ce.source_id = :source_id and ce.sheet_index = :sheet_index
			and ro.source_id = ce.source_id
			and ro.sheet_index = ce.sheet_index
			and ro.row_index = ce.row_index
			
			and sh.source_id = ce.source_id
			and sh.sheet_index = ce.sheet_index

			and co.source_id = ce.source_id
			and co.sheet_index = ce.sheet_index
			and co.col_index = ce.col_index
			
			and va.value_id = ro.key_id
			and cce.source_id = ce.source_id 
			and cce.sheet_title = sh.sheet_title
			and cce.key_nick = va.value_nick
			and cce.repeat_index = ro.repeat_index
			and cce.col_title = co.col_title
			and cce.represent_custom_cell is not null
	`, {source_id, sheet_index})

	const custom_cells = await db.all(`
		SELECT 
			sh.sheet_index,
			cce.repeat_index,
			cce.key_nick,
			va.value_id as key_id,
			co.col_index,
			cce.represent_custom_cell + 0 as represent_custom_cell
		FROM sources_sheets sh, sources_custom_cells cce, sources_cols co, sources_values va
		WHERE 
			sh.source_id = :source_id and sh.sheet_index = :sheet_index
			and sh.source_id = cce.source_id 
			and va.value_nick = cce.key_nick
			and sh.sheet_title = cce.sheet_title 
			and cce.represent_custom_cell is not null
			and co.source_id = sh.source_id
			and co.sheet_index = sh.sheet_index
			and co.col_title = cce.col_title
	`, {source_id, sheet_index})


	for (const {sheet_index, repeat_index, key_nick, key_id, col_index, represent_custom_cell} of custom_cells) {
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
Consciousness.recalcRepresentSheet = async (db) => {
	await db.exec(`
		UPDATE sources_sheets sh, sources_sources so
		SET sh.represent_sheet = so.represent_sheets
		WHERE so.source_id = sh.source_id
	`)

	await db.exec(`
		UPDATE sources_sheets sh, sources_custom_sheets csh 
		SET sh.represent_sheet = csh.represent_custom_sheet
		WHERE csh.source_id = sh.source_id 
		and csh.sheet_title = sh.sheet_title 
		and csh.represent_custom_sheet is not null
	`)
}
Consciousness.recalcRepresentSheet_bySource = async (db, source_id) => {
	await db.exec(`
		UPDATE sources_sheets sh, sources_sources so 
		SET sh.represent_sheet = so.represent_sheets
		WHERE 
			sh.source_id = :source_id 
			and so.source_id = sh.source_id
	`, {source_id})

	await db.exec(`
		UPDATE sources_sheets sh, sources_custom_sheets csh
		SET sh.represent_sheet = csh.represent_custom_sheet
		WHERE 
		csh.source_id = :source_id
		and csh.source_id = sh.source_id 
		and csh.sheet_title = sh.sheet_title 
		and csh.represent_custom_sheet is not null
	`, {source_id})
}
Consciousness.recalcRepresentSheet_bySheet = async (db, source_id, sheet_index) => {
	await db.exec(`
		UPDATE sources_sheets sh, sources_sources so 
		SET sh.represent_sheet = so.represent_sheets
		WHERE 
			sh.source_id = :source_id and sh.sheet_index = :sheet_index
			and so.source_id = sh.source_id
	`, {source_id, sheet_index})

	await db.exec(`
		UPDATE sources_sheets sh, sources_custom_sheets csh
		SET sh.represent_sheet = csh.represent_custom_sheet
		WHERE 
			sh.source_id = :source_id and sh.sheet_index = :sheet_index
			and csh.source_id = sh.source_id 
			and csh.sheet_title = sh.sheet_title 
			and csh.represent_custom_sheet is not null
	`, {source_id, sheet_index})
}
Consciousness.recalcRepresentItemSummary_bySource = async (db, source_id) => {
	//Видимость ячейки по данным сущности - свойство, сущность, значение ключа, значение ячейки - в итоге учитывается
	await db.exec(`
		UPDATE sources_cells ce
		SET ce.represent_item_summary = 0
		WHERE source_id = :source_id
	`, {source_id})

	await db.exec(`
		UPDATE 
			sources_cells ce, 
			sources_items it, 
			sources_props en, 
			sources_props pr, 
			sources_sheets sh, 
			sources_cols co, 
			sources_rows ro
		SET ce.represent_item_summary = 
				it.represent_value
				and en.represent_prop 
				and pr.represent_prop 
				
		WHERE 
		ce.source_id = :source_id
		and ro.source_id = sh.source_id
		and ro.sheet_index = sh.sheet_index
		and en.prop_id = sh.entity_id 
		and it.entity_id = sh.entity_id
		and it.key_id = ro.key_id

		and co.source_id = sh.source_id
		and co.sheet_index = sh.sheet_index
		and pr.prop_id = co.prop_id
		
		and ce.source_id = sh.source_id
		and ce.sheet_index = sh.sheet_index
		and ce.row_index = ro.row_index
		and ce.col_index = co.col_index
	`, {source_id})
}
Consciousness.recalcRepresentItemSummary_bySheet = async (db, source_id, sheet_index) => {
	//Видимость ячейки по данным сущности - свойство, сущность, значение ключа, значение ячейки - в итоге учитывается
	await db.exec(`
		UPDATE sources_cells ce
		SET ce.represent_item_summary = 0
		WHERE source_id = :source_id and sheet_index = :sheet_index
	`, {source_id, sheet_index})

	await db.exec(`
		UPDATE 
			sources_cells ce, 
			sources_items it, 
			sources_props en, 
			sources_props pr, 
			sources_sheets sh, 
			sources_cols co, 
			sources_rows ro
		SET ce.represent_item_summary = 
				it.represent_value
				and en.represent_prop 
				and pr.represent_prop 
				
		WHERE 
		ce.source_id = :source_id and ce.sheet_index = :sheet_index
		and ro.source_id = sh.source_id
		and ro.sheet_index = sh.sheet_index
		and en.prop_id = sh.entity_id 
		and it.entity_id = sh.entity_id
		and it.key_id = ro.key_id

		and co.source_id = sh.source_id
		and co.sheet_index = sh.sheet_index
		and pr.prop_id = co.prop_id
		
		and ce.source_id = sh.source_id
		and ce.sheet_index = sh.sheet_index
		and ce.row_index = ro.row_index
		and ce.col_index = co.col_index
	`, {source_id, sheet_index})
}
Consciousness.recalcRepresentItemSummary = async (db) => {
	//Видимость ячейки по данным сущности - свойство, сущность, значение ключа, значение ячейки - в итоге учитывается
	await db.exec(`
		UPDATE sources_cells ce
		SET ce.represent_item_summary = 0
	`)

	await db.exec(`
		UPDATE 
			sources_cells ce, 
			sources_items it, 
			sources_props en, 
			sources_props pr, 
			sources_sheets sh, 
			sources_cols co, 
			sources_rows ro
		SET ce.represent_item_summary = 
				it.represent_value
				and en.represent_prop 
				and pr.represent_prop 
				
		WHERE ro.source_id = sh.source_id
		and ro.sheet_index = sh.sheet_index
		and en.prop_id = sh.entity_id 
		and it.entity_id = sh.entity_id
		and it.key_id = ro.key_id

		and co.source_id = sh.source_id
		and co.sheet_index = sh.sheet_index
		and pr.prop_id = co.prop_id
		
		and ce.source_id = sh.source_id
		and ce.sheet_index = sh.sheet_index
		and ce.row_index = ro.row_index
		and ce.col_index = co.col_index
		
	`)
}
Consciousness.recalcRepresentItemSummary_byEntity = async (db, entity_id) => {
	//represent_item_key, represent_entity, represent_prop, represent_item, represent_value
	await db.exec(`
		UPDATE sources_cells ce, sources_sheets sh
		SET ce.represent_item_summary = 0
		WHERE sh.entity_id = :entity_id
		and ce.source_id = sh.source_id
		and ce.sheet_index = sh.sheet_index
	`, {entity_id})
	await db.exec(`
		UPDATE 
			sources_cells ce, 
			sources_items it, 
			sources_props en, 
			sources_props pr, 
			sources_sheets sh, 
			sources_cols co, 
			sources_rows ro
		SET ce.represent_item_summary = 
				it.represent_value
				and en.represent_prop 
				and pr.represent_prop 
				
		WHERE sh.entity_id = :entity_id
		and ro.source_id = sh.source_id
		and ro.sheet_index = sh.sheet_index
		and en.prop_id = sh.entity_id 
		and it.entity_id = sh.entity_id
		and it.key_id = ro.key_id

		and co.source_id = sh.source_id
		and co.sheet_index = sh.sheet_index
		and pr.prop_id = co.prop_id
		
		and ce.source_id = sh.source_id
		and ce.sheet_index = sh.sheet_index
		and ce.row_index = ro.row_index
		and ce.col_index = co.col_index
		
	`, {entity_id})
}
Consciousness.recalcRepresentCellSummary_bySource = async (db, source_id) => {
	await db.exec(`
		UPDATE sources_cells ce, sources_sources so, sources_sheets sh, sources_cols co, sources_rows ro
		SET ce.represent_cell_summary = ro.represent_row_key
			and so.represent_source
			and sh.represent_sheet
			and co.represent_col
			and ro.represent_row
			and ce.represent_cell
		WHERE 
		sh.source_id = :source_id
		and sh.source_id = so.source_id
		and co.source_id = so.source_id and co.sheet_index = sh.sheet_index
		and ro.source_id = so.source_id and ro.sheet_index = sh.sheet_index
		and ce.source_id = so.source_id and ce.sheet_index = sh.sheet_index and ce.col_index = co.col_index and ce.row_index = ro.row_index
	`, {source_id})
}
Consciousness.recalcRepresentCellSummary_bySheet = async (db, source_id, sheet_index) => {
	await db.exec(`
		UPDATE sources_cells ce, sources_sources so, sources_sheets sh, sources_cols co, sources_rows ro
		SET ce.represent_cell_summary = ro.represent_row_key
			and so.represent_source
			and sh.represent_sheet
			and co.represent_col
			and ro.represent_row
			and ce.represent_cell
		WHERE 
		sh.source_id = :source_id and sh.sheet_index = :sheet_index
		and sh.source_id = so.source_id
		and co.source_id = so.source_id and co.sheet_index = sh.sheet_index
		and ro.source_id = so.source_id and ro.sheet_index = sh.sheet_index
		and ce.source_id = so.source_id and ce.sheet_index = sh.sheet_index and ce.col_index = co.col_index and ce.row_index = ro.row_index
	`, {source_id, sheet_index})
}
Consciousness.recalcRepresentCellSummary = async (db) => {
	await db.exec(`
		UPDATE sources_cells ce, sources_sources so, sources_sheets sh, sources_cols co, sources_rows ro
		SET ce.represent_cell_summary = ro.represent_row_key
			and so.represent_source
			and sh.represent_sheet
			and co.represent_col
			and ro.represent_row
			and ce.represent_cell
		WHERE 
		sh.source_id = so.source_id
		and co.source_id = so.source_id and co.sheet_index = sh.sheet_index
		and ro.source_id = so.source_id and ro.sheet_index = sh.sheet_index
		and ce.source_id = so.source_id and ce.sheet_index = sh.sheet_index and ce.col_index = co.col_index and ce.row_index = ro.row_index
	`)
}
Consciousness.recalcRepresentRowSummaryBySource = async (db, source) => {
	await db.exec(`
		UPDATE sources_cells
		SET represent_cell_summary = 0
		WHERE source_id = :source_id
	`, source)
	//represent_cell_summary (represent_row_key, represent_source, represent_sheet, represent_col, represent_row, represent_cell)
	await db.exec(`
		UPDATE sources_cells ce, sources_sources so, sources_sheets sh, sources_cols co, sources_rows ro
		SET represent_cell_summary = ro.represent_row_key
			and so.represent_source
			and sh.represent_sheet
			and co.represent_col
			and ro.represent_row
			and ce.represent_cell
		WHERE so.source_id = :source_id
		and ro.source_id = so.source_id
		and sh.source_id = so.source_id
		and co.source_id = so.source_id
		and ce.source_id = so.source_id

		and ce.sheet_index = sh.sheet_index
		and co.sheet_index = sh.sheet_index
		and ro.sheet_index = sh.sheet_index

		and ce.col_index = co.col_index
		and ce.row_index = ro.row_index

	`, source)
}
Consciousness.recalcRepresentCellRowKey = async (db) => {
	await db.exec(`
		UPDATE sources_rows ro, sources_sources so
		SET ro.represent_row_key = so.represent_cells
		WHERE ro.source_id = so.source_id
	`)
	await db.exec(`
		UPDATE 
			sources_rows ro, 
			sources_sheets sh,
			sources_cols co, 
			sources_cells ce
		SET ro.represent_row_key = 
			ce.represent_cell 
			and co.represent_col
		WHERE sh.source_id = ro.source_id
		and sh.sheet_index = ro.sheet_index
		and co.source_id = ro.source_id
		and co.sheet_index = ro.sheet_index
		and co.col_index = sh.key_index
		and ce.source_id = ro.source_id
		and ce.row_index = ro.row_index
		and ce.col_index = co.col_index
		and ce.sheet_index = ro.sheet_index
	`)
}

Consciousness.recalcRepresentCellRowKey_bySource = async (db, source_id) => {
	await db.exec(`
		UPDATE sources_rows ro, sources_sources so
		SET ro.represent_row_key = so.represent_cells
		WHERE 
		so.source_id = :source_id
		and ro.source_id = so.source_id
	`, {source_id})
	await db.exec(`
		UPDATE 
			sources_rows ro, 
			sources_sheets sh,
			sources_cols co, 
			sources_cells ce
		SET ro.represent_row_key = ce.represent_cell and co.represent_col
		WHERE 
		ro.source_id = :source_id
		and sh.source_id = ro.source_id
		and sh.sheet_index = ro.sheet_index
		and co.source_id = ro.source_id
		and co.sheet_index = ro.sheet_index
		and co.col_index = sh.key_index
		and ce.source_id = ro.source_id
		and ce.row_index = ro.row_index
		and ce.col_index = co.col_index
		and ce.sheet_index = ro.sheet_index
	`, {source_id})
}
Consciousness.recalcRepresentCellRowKey_bySheet = async (db, source_id, sheet_index) => {
	await db.exec(`
		UPDATE sources_rows ro, sources_sources so
		SET ro.represent_row_key = so.represent_cells
		WHERE 
		so.source_id = :source_id and ro.sheet_index = :sheet_index
		and ro.source_id = so.source_id
	`, {source_id, sheet_index})
	await db.exec(`
		UPDATE 
			sources_rows ro, 
			sources_sheets sh,
			sources_cols co, 
			sources_cells ce
		SET ro.represent_row_key = ce.represent_cell and co.represent_col
		WHERE 
		ro.source_id = :source_id and ro.sheet_index = :sheet_index
		and sh.source_id = ro.source_id
		and sh.sheet_index = ro.sheet_index
		and co.source_id = ro.source_id
		and co.sheet_index = ro.sheet_index
		and co.col_index = sh.key_index
		and ce.source_id = ro.source_id
		and ce.row_index = ro.row_index
		and ce.col_index = co.col_index
		and ce.sheet_index = ro.sheet_index
	`, {source_id, sheet_index})
}
Consciousness.recalcRowSearch = async (db) => {

	
	const texts = await db.all(`
		SELECT ce.sheet_index, 
			ce.row_index, 
			GROUP_CONCAT(ce.text SEPARATOR ' ') as text
		FROM sources_cells ce
		GROUP BY ce.sheet_index, ce.row_index
	`)

	for (const {text, sheet_index, row_index} of texts) {
		let search = nicked(text)
		search = search.split('-')
		search = unique(search)
		search.sort()
		search = ' ' + search.join(' ') //Поиск выполняется по началу ключа с пробелом '% key%'
		await db.exec(`
			UPDATE sources_rows
			SET search = :search
			WHERE sheet_index = :sheet_index
			and row_index = :row_index
		`, {sheet_index, row_index, search})
	}
}
Consciousness.recalcRowSearch_bySource = async (db, source_id) => {
	const texts = await db.all(`
		SELECT ce.sheet_index, 
			ce.row_index, 
			GROUP_CONCAT(ce.text SEPARATOR ' ') as text
		FROM sources_cells ce
		WHERE ce.source_id = :source_id
		GROUP BY ce.sheet_index, ce.row_index
	`, {source_id})

	for (const {text, sheet_index, row_index} of texts) {
		let search = nicked(text)
		search = search.split('-')
		search = unique(search)
		search.sort()
		search = ' ' + search.join(' ') //Поиск выполняется по началу ключа с пробелом '% key%'
		await db.exec(`
			UPDATE sources_rows
			SET search = :search
			WHERE source_id = :source_id
			and sheet_index = :sheet_index
			and row_index = :row_index
		`, {source_id, sheet_index, row_index, search})
	}
}
Consciousness.recalcRowSearch_bySheet = async (db, source_id, sheet_index) => {
	const texts = await db.all(`
		SELECT ce.sheet_index, 
			ce.row_index, 
			GROUP_CONCAT(ce.text SEPARATOR ' ') as text
		FROM sources_cells ce
		WHERE 
			ce.source_id = :source_id and ce.sheet_index = :sheet_index
		GROUP BY ce.sheet_index, ce.row_index
	`, {source_id, sheet_index})

	for (const {text, sheet_index, row_index} of texts) {
		let search = nicked(text)
		search = search.split('-')
		search = unique(search)
		search.sort()
		search = ' ' + search.join(' ') //Поиск выполняется по началу ключа с пробелом '% key%'
		await db.exec(`
			UPDATE sources_rows
			SET search = :search
			WHERE source_id = :source_id
			and sheet_index = :sheet_index
			and row_index = :row_index
		`, {source_id, sheet_index, row_index, search})
	}
}
Consciousness.recalcItemSearch_bySource = async (db, source_id) => {
	const texts = await db.all(`
		SELECT 
			wi.entity_id,
			wi.key_id, 
			concat(GROUP_CONCAT(ce.text SEPARATOR '-'), "-", GROUP_CONCAT(distinct pr.prop_nick SEPARATOR '-')) as text
		FROM 
			sources_winners wi, 
			sources_cells ce, 
			sources_props pr
		WHERE 
			ce.source_id = :source_id
			and pr.prop_id = wi.prop_id
			and wi.source_id = ce.source_id
			and wi.sheet_index = ce.sheet_index
			and wi.row_index = ce.row_index
			and wi.col_index = ce.col_index
		GROUP BY wi.key_id
	`, {source_id})
	for (const {entity_id, key_id, text} of texts) {

		let search = nicked(text)
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
Consciousness.recalcItemSearch_byKey = async (db, entity_id, key_id) => {
	const texts = await db.all(`
		SELECT 
			wi.entity_id,
			wi.key_id, 
			concat(GROUP_CONCAT(ce.text SEPARATOR '-'), "-", GROUP_CONCAT(distinct pr.prop_nick SEPARATOR '-')) as text
		FROM 
			sources_winners wi, 
			sources_cells ce, 
			sources_props pr
		WHERE 
			wi.entity_id = :entity_id and wi.key_id = :key_id
			and pr.prop_id = wi.prop_id
			and wi.source_id = ce.source_id
			and wi.sheet_index = ce.sheet_index
			and wi.row_index = ce.row_index
			and wi.col_index = ce.col_index
		GROUP BY wi.key_id
	`, {entity_id, key_id})
	for (const {entity_id, key_id, text} of texts) {

		let search = nicked(text)
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
Consciousness.recalcItemSearch_bySheet = async (db, source_id, sheet_index) => {
	const texts = await db.all(`
		SELECT 
			wi.entity_id,
			wi.key_id, 
			concat(GROUP_CONCAT(ce.text SEPARATOR '-'), "-", GROUP_CONCAT(distinct pr.prop_nick SEPARATOR '-')) as text
		FROM 
			sources_winners wi, 
			sources_cells ce, 
			sources_props pr
		WHERE 
			ce.source_id = :source_id
			and ce.sheet_index = :sheet_index
			and pr.prop_id = wi.prop_id
			and wi.source_id = ce.source_id
			and wi.sheet_index = ce.sheet_index
			and wi.row_index = ce.row_index
			and wi.col_index = ce.col_index
		GROUP BY wi.key_id
	`, {source_id, sheet_index})
	for (const {entity_id, key_id, text} of texts) {

		let search = nicked(text)
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
Consciousness.recalcItemSearch = async (db) => {
	await db.exec(`
		UPDATE sources_items it SET search = ''
	`)
	
	const texts = await db.all(`
		SELECT 
			wi.entity_id,
			wi.key_id, 
			concat(GROUP_CONCAT(ce.text SEPARATOR '-'),"-",GROUP_CONCAT(distinct pr.prop_nick SEPARATOR '-')) as text
		FROM 
			sources_winners wi, 
			sources_cells ce, 
			sources_props pr
		WHERE 
			pr.prop_id = wi.prop_id
			and wi.source_id = ce.source_id
			and wi.sheet_index = ce.sheet_index
			and wi.row_index = ce.row_index
			and wi.col_index = ce.col_index
		GROUP BY wi.key_id
	`)
	for (const {entity_id, key_id, text} of texts) {

		let search = nicked(text)
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
Consciousness.recalcSearchByEntityIdAndSourceId = async (db, entity_id, source_id) => {	
	await db.exec(`
		UPDATE sources_items it
			LEFT JOIN sources_winners wi on (wi.entity_id = it.entity_id and wi.key_id = it.key_id and wi.prop_id = :entity_id)
		SET search = ''
		WHERE it.entity_id = :entity_id and wi.entity_id is null
	`, {entity_id})
	
	const texts = await db.all(`
		SELECT 
			wi.key_id, 
			concat(GROUP_CONCAT(ce.text SEPARATOR '-'),"-",GROUP_CONCAT(distinct pr.prop_nick SEPARATOR '-')) as text
		FROM 
			sources_cells ce, 
			sources_winners wi, 
			sources_props pr
		WHERE 
			wi.source_id = :source_id
			and wi.entity_id = :entity_id
			and pr.prop_id = wi.prop_id
			and wi.source_id = ce.source_id
			and wi.sheet_index = ce.sheet_index
			and wi.row_index = ce.row_index
			and wi.col_index = ce.col_index
		GROUP BY wi.key_id
	`, {source_id, entity_id})
	
	for (const {key_id, text} of texts) {
		let search = nicked(text)
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
// Consciousness.recalcGroups = async (db) => {
// 	await db.exec(`
// 		DELETE FROM sources_groups
// 	`)
// 	await db.exec(`
// 		INSERT INTO sources_groups (entity_id, key_id, prop_id, value_id)
// 		SELECT entity_id, key_id, prop_id, value_id
// 		FROM sources_data
// 		WHERE type = "value"
// 	`)
// }
Consciousness.recalcMaster = async (db) => {
	await db.exec(`
		UPDATE sources_items it
		SET it.master = 0
	`)
	await db.exec(`
		UPDATE 
			sources_items it, 
			sources_rows ro, 
			sources_sheets sh, 
			sources_sources so
		SET it.master = 1
		WHERE
			it.key_id = ro.key_id
			and it.entity_id = sh.entity_id
			and sh.source_id = ro.source_id
			and sh.sheet_index = ro.sheet_index
			and so.source_id = sh.source_id
			and so.master = 1
	`)
}
Consciousness.recalcMaster_bySource = async (db, source_id) => {
	await db.exec(`
		UPDATE sources_items it, sources_rows ro, sources_sheets sh
		SET it.master = 0
		WHERE 
		sh.source_id = :source_id
		and ro.source_id = sh.source_id and ro.sheet_index = sh.sheet_index
		and it.key_id = ro.key_id and it.entity_id = sh.entity_id
	`, {source_id})
	await db.exec(`
		UPDATE 
			sources_sources so,
			sources_sheets sh, 
			sources_rows ro, 
			sources_items it
		SET it.master = 1
		WHERE
			so.source_id = :source_id and so.master = 1
			and sh.source_id = so.source_id
			and ro.source_id = so.source_id and ro.sheet_index = sh.sheet_index
			and it.key_id = ro.key_id and it.entity_id = sh.entity_id
	`, {source_id})
}
Consciousness.recalcMaster_bySheet = async (db, source_id, sheet_index) => {
	await db.exec(`
		UPDATE sources_items it, sources_rows ro, sources_sheets sh
		SET it.master = 0
		WHERE 
		sh.source_id = :source_id and sh.sheet_index = :sheet_index
		and ro.source_id = sh.source_id and ro.sheet_index = sh.sheet_index
		and it.key_id = ro.key_id and it.entity_id = sh.entity_id
	`, {source_id, sheet_index})
	await db.exec(`
		UPDATE 
			sources_sources so,
			sources_sheets sh, 
			sources_rows ro, 
			sources_items it
		SET it.master = 1
		WHERE
			so.source_id = :source_id and so.master = 1
			and sh.source_id = so.source_id and sh.sheet_index = :sheet_index
			and ro.source_id = so.source_id and ro.sheet_index = sh.sheet_index
			and it.key_id = ro.key_id and it.entity_id = sh.entity_id
	`, {source_id, sheet_index})
}
Consciousness.recalcWinner_bySource = async (db, source_id) => {
	const sheets = await db.colAll(`
		select sheet_index from sources_sheets 
		where source_id = :source_id
	`, {source_id})
	for (const sheet_index of sheets) {
		await Consciousness.recalcWinner_bySheet(db, source_id, sheet_index)
	}
}
Consciousness.recalcWinner_byKey = async (db, entity_id, key_id) => {
	await db.exec(`
		DELETE FROM sources_winners 
		WHERE entity_id = :entity_id and key_id = :key_id
	`, {entity_id, key_id})
	await db.exec(`
		INSERT INTO sources_winners (
			entity_id, key_id, prop_id, 
			source_id, sheet_index, row_index, col_index
		)
		SELECT 
		 	sh.entity_id, ro.key_id, co.prop_id, 
		 	ce.source_id, ce.sheet_index, ce.row_index, ce.col_index
	 	FROM sources_cells ce, sources_cols co, sources_sources so, 
	 		sources_sheets sh, sources_rows ro, sources_props pr, sources_items it
	 	WHERE 
	 		sh.entity_id = :entity_id and ro.key_id = :key_id
	 		and ce.sheet_index = co.sheet_index and ce.col_index = co.col_index and ce.multi_index = 0
	 		and pr.prop_id = co.prop_id
	 		and it.entity_id = sh.entity_id and it.key_id = ro.key_id and it.master = 1
	 		and ce.source_id = co.source_id
	 		and sh.source_id = ce.source_id and sh.sheet_index = ce.sheet_index
	 		and so.source_id = ce.source_id
	 		and ro.source_id = ce.source_id and ro.sheet_index = ce.sheet_index and ro.row_index = ce.row_index
	 		and ce.represent = 1 
	 		
	 	ORDER BY so.ordain, ce.sheet_index, ce.row_index, pr.ordain
	 	ON DUPLICATE KEY UPDATE
  			source_id = VALUES(source_id),
  			sheet_index = VALUES(sheet_index),
  			row_index = VALUES(row_index),
  			col_index = VALUES(col_index)
	`, {entity_id, key_id})
	
	
	await db.exec(`DELETE t FROM sources_wvalues t, sources_winners wi 
		WHERE 
			wi.entity_id = :entity_id and wi.key_id = :key_id
			and t.entity_id = wi.entity_id and t.key_id = wi.key_id and t.prop_id = wi.prop_id
	`, {entity_id, key_id})
	await db.exec(`
		INSERT INTO sources_wvalues (
			entity_id, key_id, prop_id, value_id, multi_index
		)
		SELECT 
		 	wi.entity_id, wi.key_id, wi.prop_id, ce.value_id, ce.multi_index
	 	FROM sources_winners wi, sources_cells ce
	 	WHERE 
	 		wi.entity_id = :entity_id and wi.key_id = :key_id
	 		and ce.source_id = wi.source_id and ce.sheet_index = wi.sheet_index and ce.row_index = wi.row_index and ce.col_index = wi.col_index
	 		and ce.value_id is not null
	`, {entity_id, key_id})

	
	await db.exec(`DELETE t FROM sources_wnumbers t, sources_winners wi 
		WHERE 
			wi.entity_id = :entity_id and wi.key_id = :key_id
			and t.entity_id = wi.entity_id and t.key_id = wi.key_id and t.prop_id = wi.prop_id
	`, {entity_id, key_id})
	await db.exec(`
		INSERT INTO sources_wnumbers (
			entity_id, key_id, prop_id, number, multi_index
		)
		SELECT 
		 	wi.entity_id, wi.key_id, wi.prop_id, ce.number, ce.multi_index
	 	FROM sources_winners wi, sources_cells ce
	 	WHERE 
	 		wi.entity_id = :entity_id and wi.key_id = :key_id
	 		and ce.source_id = wi.source_id and ce.sheet_index = wi.sheet_index and ce.row_index = wi.row_index and ce.col_index = wi.col_index
	 		and ce.number is not null
	 		
	`, {entity_id, key_id})


	await db.exec(`DELETE t FROM sources_wdates t, sources_winners wi 
		WHERE 
			wi.entity_id = :entity_id and wi.key_id = :key_id
			and t.entity_id = wi.entity_id and t.key_id = wi.key_id and t.prop_id = wi.prop_id
	`, {entity_id, key_id})
	await db.exec(`
		INSERT INTO sources_wdates (
			entity_id, key_id, prop_id, date, multi_index
		)
		SELECT 
		 	wi.entity_id, wi.key_id, wi.prop_id, ce.date, ce.multi_index
	 	FROM sources_winners wi, sources_cells ce
	 	WHERE 
	 		wi.entity_id = :entity_id and wi.key_id = :key_id
	 		and ce.source_id = wi.source_id and ce.sheet_index = wi.sheet_index and ce.row_index = wi.row_index and ce.col_index = wi.col_index
	 		and ce.date is not null
	`, {entity_id, key_id})
	
	
	await db.exec(`DELETE t FROM sources_wtexts t, sources_winners wi 
		WHERE 
			wi.entity_id = :entity_id and wi.key_id = :key_id
			and t.entity_id = wi.entity_id and t.key_id = wi.key_id and t.prop_id = wi.prop_id
	`, {entity_id, key_id})
	await db.exec(`
		INSERT INTO sources_wtexts (
			entity_id, key_id, prop_id, text, multi_index
		)
		SELECT 
		 	wi.entity_id, wi.key_id, wi.prop_id, ce.text, ce.multi_index
	 	FROM sources_winners wi, sources_cells ce, sources_props pr
	 	WHERE 
	 		wi.entity_id = :entity_id and wi.key_id = :key_id
	 		and ce.source_id = wi.source_id and ce.sheet_index = wi.sheet_index and ce.row_index = wi.row_index and ce.col_index = wi.col_index
	 		and wi.prop_id = pr.prop_id
	 		and pr.type = 'text'
	`, {entity_id, key_id})
}
Consciousness.recalcWinner_bySheet = async (db, source_id, sheet_index) => {
	const entity_id = await db.col(`
		select entity_id from sources_sheets 
		where source_id = :source_id and sheet_index = :sheet_index
	`, {source_id, sheet_index})
	if (!entity_id) {
		const entity_id = await db.col(`
			select entity_id from sources_winners 
			where source_id = :source_id and sheet_index = :sheet_index
			limit 1
		`, {source_id, sheet_index})
		if (!entity_id) return
		return Consciousness.recalcWinner(db)
	}
	
	await db.exec(`
		DELETE wi FROM sources_winners wi
		WHERE 
			wi.entity_id = :entity_id and wi.key_id in (select a.key_id from sources_rows a where a.source_id = :source_id and a.sheet_index = :sheet_index)
	`, {entity_id, source_id, sheet_index})
	await db.exec(`
		INSERT INTO sources_winners (
			entity_id, key_id, prop_id, 
			source_id, sheet_index, row_index, col_index
		)
		SELECT 
		 	sh.entity_id, ro.key_id, co.prop_id, 
		 	ce.source_id, ce.sheet_index, ce.row_index, ce.col_index
	 	FROM sources_cells ce, sources_cols co, sources_sources so, 
	 		sources_sheets sh, sources_rows ro, sources_props pr, sources_items it
	 	WHERE 
	 		sh.entity_id = :entity_id and ro.key_id in (select a.key_id from sources_rows a where a.source_id = :source_id and a.sheet_index = :sheet_index)
	 		and ce.sheet_index = co.sheet_index and ce.col_index = co.col_index and ce.multi_index = 0
	 		and pr.prop_id = co.prop_id
	 		and it.entity_id = sh.entity_id and it.key_id = ro.key_id and it.master = 1
	 		and ce.source_id = co.source_id
	 		and sh.source_id = ce.source_id and sh.sheet_index = ce.sheet_index
	 		and so.source_id = ce.source_id
	 		and ro.source_id = ce.source_id and ro.sheet_index = ce.sheet_index and ro.row_index = ce.row_index
	 		and ce.represent = 1 
	 		
	 	ORDER BY so.ordain, ce.sheet_index, ce.row_index, pr.ordain
	 	ON DUPLICATE KEY UPDATE
  			source_id = VALUES(source_id),
  			sheet_index = VALUES(sheet_index),
  			row_index = VALUES(row_index),
  			col_index = VALUES(col_index)
	`, {entity_id, source_id, sheet_index})
	
	
	await db.exec(`DELETE t FROM sources_wvalues t, sources_winners wi 
		WHERE 
			wi.entity_id = :entity_id and wi.key_id in (select a.key_id from sources_rows a where a.source_id = :source_id and a.sheet_index = :sheet_index)
			and t.entity_id = wi.entity_id and t.key_id = wi.key_id and t.prop_id = wi.prop_id
	`, {entity_id, source_id, sheet_index})
	await db.exec(`
		INSERT INTO sources_wvalues (
			entity_id, key_id, prop_id, value_id, multi_index
		)
		SELECT 
		 	wi.entity_id, wi.key_id, wi.prop_id, ce.value_id, ce.multi_index
	 	FROM sources_winners wi, sources_cells ce
	 	WHERE 
	 		wi.entity_id = :entity_id and wi.key_id in (select a.key_id from sources_rows a where a.source_id = :source_id and a.sheet_index = :sheet_index)
	 		and ce.source_id = wi.source_id and ce.sheet_index = wi.sheet_index and ce.row_index = wi.row_index and ce.col_index = wi.col_index
	 		and ce.value_id is not null
	`, {entity_id, source_id, sheet_index})

	
	await db.exec(`DELETE t FROM sources_wnumbers t, sources_winners wi 
		WHERE 
			wi.entity_id = :entity_id and wi.key_id in (select a.key_id from sources_rows a where a.source_id = :source_id and a.sheet_index = :sheet_index)
			and	t.entity_id = wi.entity_id and t.key_id = wi.key_id and t.prop_id = wi.prop_id
	`, {entity_id, source_id, sheet_index})
	await db.exec(`
		INSERT INTO sources_wnumbers (
			entity_id, key_id, prop_id, number, multi_index
		)
		SELECT 
		 	wi.entity_id, wi.key_id, wi.prop_id, ce.number, ce.multi_index
	 	FROM sources_winners wi, sources_cells ce
	 	WHERE 
	 		wi.entity_id = :entity_id and wi.key_id in (select a.key_id from sources_rows a where a.source_id = :source_id and a.sheet_index = :sheet_index)
	 		and ce.source_id = wi.source_id and ce.sheet_index = wi.sheet_index and ce.row_index = wi.row_index and ce.col_index = wi.col_index
	 		and ce.number is not null
	 		
	`, {entity_id, source_id, sheet_index})


	await db.exec(`DELETE t FROM sources_wdates t, sources_winners wi 
		WHERE 
			wi.entity_id = :entity_id and wi.key_id in (select a.key_id from sources_rows a where a.source_id = :source_id and a.sheet_index = :sheet_index)
			and t.entity_id = wi.entity_id and t.key_id = wi.key_id and t.prop_id = wi.prop_id
	`, {entity_id, source_id, sheet_index})
	await db.exec(`
		INSERT INTO sources_wdates (
			entity_id, key_id, prop_id, date, multi_index
		)
		SELECT 
		 	wi.entity_id, wi.key_id, wi.prop_id, ce.date, ce.multi_index
	 	FROM sources_winners wi, sources_cells ce
	 	WHERE 
	 		wi.entity_id = :entity_id and wi.key_id in (select a.key_id from sources_rows a where a.source_id = :source_id and a.sheet_index = :sheet_index)
	 		and ce.source_id = wi.source_id and ce.sheet_index = wi.sheet_index and ce.row_index = wi.row_index and ce.col_index = wi.col_index
	 		and ce.date is not null
	`, {entity_id, source_id, sheet_index})
	
	
	await db.exec(`DELETE t FROM sources_wtexts t, sources_winners wi 
		WHERE 
			wi.entity_id = :entity_id and wi.key_id in (select a.key_id from sources_rows a where a.source_id = :source_id and a.sheet_index = :sheet_index)
			and t.entity_id = wi.entity_id and t.key_id = wi.key_id and t.prop_id = wi.prop_id
		
	`, {entity_id, source_id, sheet_index})
	await db.exec(`
		INSERT INTO sources_wtexts (
			entity_id, key_id, prop_id, text, multi_index
		)
		SELECT 
		 	wi.entity_id, wi.key_id, wi.prop_id, ce.text, ce.multi_index
	 	FROM sources_winners wi, sources_cells ce, sources_props pr
	 	WHERE 
	 		wi.entity_id = :entity_id and wi.key_id in (select a.key_id from sources_rows a where a.source_id = :source_id and a.sheet_index = :sheet_index)
	 		and ce.source_id = wi.source_id and ce.sheet_index = wi.sheet_index and ce.row_index = wi.row_index and ce.col_index = wi.col_index
	 		and wi.prop_id = pr.prop_id
	 		and pr.type = 'text'
	`, {entity_id, source_id, sheet_index})
}
Consciousness.recalcWinner = async (db) => {
	await db.exec(`TRUNCATE TABLE sources_winners`)
	await db.exec(`
		INSERT INTO sources_winners (
			entity_id, key_id, prop_id, 
			source_id, sheet_index, row_index, col_index
		)
		SELECT 
		 	sh.entity_id, ro.key_id, co.prop_id, 
		 	ce.source_id, ce.sheet_index, ce.row_index, ce.col_index
	 	FROM sources_cells ce, sources_cols co, sources_sources so, 
	 		sources_sheets sh, sources_rows ro, sources_props pr, sources_items it
	 	WHERE 
	 		ce.represent = 1  
	 		and ce.sheet_index = co.sheet_index and ce.col_index = co.col_index and ce.multi_index = 0
	 		and pr.prop_id = co.prop_id
	 		and it.entity_id = sh.entity_id and it.key_id = ro.key_id and it.master = 1
	 		and ce.source_id = co.source_id
	 		and sh.source_id = ce.source_id and sh.sheet_index = ce.sheet_index
	 		and so.source_id = ce.source_id
	 		and ro.source_id = ce.source_id and ro.sheet_index = ce.sheet_index and ro.row_index = ce.row_index
	 	ORDER BY so.ordain, ce.sheet_index, ce.row_index, pr.ordain
	 	ON DUPLICATE KEY UPDATE
  			source_id = VALUES(source_id),
  			sheet_index = VALUES(sheet_index),
  			row_index = VALUES(row_index),
  			col_index = VALUES(col_index)
	`)
	await db.exec(`TRUNCATE TABLE sources_wvalues`)
	await db.exec(`
		INSERT INTO sources_wvalues (
			entity_id, key_id, prop_id, value_id, multi_index
		)
		SELECT 
		 	wi.entity_id, wi.key_id, wi.prop_id, ce.value_id, ce.multi_index
	 	FROM sources_winners wi, sources_cells ce
	 	WHERE 
	 		ce.value_id is not null
	 		and ce.source_id = wi.source_id and ce.sheet_index = wi.sheet_index and ce.row_index = wi.row_index and ce.col_index = wi.col_index
	 		
	`)

	await db.exec(`TRUNCATE TABLE sources_wnumbers`)
	await db.exec(`
		INSERT INTO sources_wnumbers (
			entity_id, key_id, prop_id, number, multi_index
		)
		SELECT 
		 	wi.entity_id, wi.key_id, wi.prop_id, ce.number, ce.multi_index
	 	FROM sources_winners wi, sources_cells ce
	 	WHERE 
	 		ce.number is not null
	 		and ce.source_id = wi.source_id and ce.sheet_index = wi.sheet_index and ce.row_index = wi.row_index and ce.col_index = wi.col_index
	 		
	`)

	await db.exec(`TRUNCATE TABLE sources_wdates`)
	await db.exec(`
		INSERT INTO sources_wdates (
			entity_id, key_id, prop_id, date, multi_index
		)
		SELECT 
		 	wi.entity_id, wi.key_id, wi.prop_id, ce.date, ce.multi_index
	 	FROM sources_winners wi, sources_cells ce
	 	WHERE 
	 		ce.date is not null
	 		and ce.source_id = wi.source_id and ce.sheet_index = wi.sheet_index and ce.row_index = wi.row_index and ce.col_index = wi.col_index
	 		
	`)

	await db.exec(`TRUNCATE TABLE sources_wtexts`)
	await db.exec(`
		INSERT INTO sources_wtexts (
			entity_id, key_id, prop_id, text, multi_index
		)
		SELECT 
		 	wi.entity_id, wi.key_id, wi.prop_id, ce.text, ce.multi_index
	 	FROM sources_winners wi, sources_cells ce, sources_props pr
	 	WHERE 
	 		pr.type = 'text'
	 		and wi.prop_id = pr.prop_id
	 		and ce.source_id = wi.source_id and ce.sheet_index = wi.sheet_index and ce.row_index = wi.row_index and ce.col_index = wi.col_index
	`)
}