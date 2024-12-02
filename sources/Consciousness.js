import Sources from "/-sources/Sources.js"
import nicked from "/-nicked"
import unique from "/-nicked/unique.js"
const Consciousness = {}
export default Consciousness


Consciousness.recalcKeyIndex = async (db) => { //Определить key_index, по имеющимся entity_id
	await db.exec(`
		UPDATE sources_sheets sh
		SET sh.key_index = null
	`)
	await db.exec(`
		UPDATE sources_sheets sh, sources_entities en, sources_cols co
		SET sh.key_index = co.col_index
		WHERE 
			en.entity_id = sh.entity_id
			and co.source_id = sh.source_id 
			and co.sheet_index = sh.sheet_index
			and co.prop_id = en.prop_id
	`)
}
Consciousness.recalcEntitiesPropId = async (db, source) => { //Определить entity_id, prop_id, key_index
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
	const sheets = await db.all(`
		SELECT sheet_index, sheet_title
		FROM sources_sheets
		WHERE source_id = :source_id
	`, source)

	for (const {sheet_index, sheet_title} of sheets) {

		const entity_id = custom_sheets[sheet_title]?.entity_id || source.entity_id || null

		if (entity_id) {
			const custom_cols = await db.allto('col_title', `
				SELECT prop_id, col_title
				FROM sources_custom_cols
				WHERE source_id = :source_id and sheet_title = :sheet_title and prop_id is not null
			`, {source_id, sheet_title})
			console.log(custom_cols)

			const head = await db.all(`
				SELECT col_title, col_nick, col_index
				FROM sources_cols
				WHERE source_id = :source_id and sheet_index = :sheet_index
			`, {source_id, sheet_index})
			for (const {col_index, col_title, col_nick} of head) {
				const prop_id = custom_cols[col_title]?.prop_id || await db.insertId(`
					INSERT INTO sources_props (entity_id, prop_title, prop_nick, type)
			   		VALUES (:entity_id, :col_title, :col_nick, 'text')
			   		ON DUPLICATE KEY UPDATE prop_id = LAST_INSERT_ID(prop_id)
				`, {entity_id, col_title, col_nick})

				await db.exec(`
					UPDATE sources_cols
					SET prop_id = :prop_id
					WHERE source_id = :source_id and sheet_index = :sheet_index and col_index = :col_index
				`, {source_id, prop_id, sheet_index, col_index})
			}
		} else {
			await db.exec(`
				UPDATE sources_cols
				SET prop_id = null
				WHERE source_id = :source_id and sheet_index = :sheet_index
			`, {source_id, sheet_index})
		}

		await db.exec(`
			UPDATE sources_sheets
			SET entity_id = :entity_id
			WHERE source_id = :source_id and sheet_index = :sheet_index
		`, {source_id, entity_id, sheet_index})

		await Sources.reorderProps(db, entity_id)
	}
}
Consciousness.recalcRowsKeyId = async (db, source) => {
	await db.exec(`
		UPDATE sources_rows ro
		SET ro.key_id = null, ro.repeat_index = null
		WHERE ro.source_id = :source_id
	`, source)
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
	await db.exec(`
		UPDATE sources_rows ro, (
			SELECT 
				source_id, sheet_index, row_index,
				ROW_NUMBER() OVER (PARTITION BY source_id, sheet_index, key_id ORDER BY row_index) - 1 AS repeat_index
			FROM sources_rows
		) cte
		SET ro.repeat_index = cte.repeat_index
		WHERE ro.source_id = :source_id
		and cte.source_id = ro.source_id
		and ro.sheet_index = cte.sheet_index 
		AND ro.row_index = cte.row_index
	`, source)
}
Consciousness.setCellType = async (db, cell, type) => {
	let pruning = 0
	let number = null
	let value_id = null
	let date = null
	const text = cell.text
	if (text) {
		if (type == 'number') {
			const textnumber = text.replace(/\s/g,'')
			number = parseFloat(textnumber)
			if (isNaN(number)) {
				number = null
				pruning = true
			}
			if (number != textnumber) {
				pruning = true
			}
			number = Math.round(number * 100) / 100
			const len = String(Math.round(number)).length
			if (len > 8) {
				number = null
				pruning = true
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
Consciousness.recalcMulti = async (db, {source_id}) => {
	//prop_id может не быть, тогда multi считаем false
	const props = await db.all(`
		SELECT co.col_index, co.sheet_index, pr.multi + 0 as multi
		FROM sources_cols co
			LEFT JOIN sources_props pr on (pr.prop_id = co.prop_id)
		WHERE co.source_id = :source_id
	`, {source_id})
	
	

	
	for (const {col_index, sheet_index, multi} of props) {		
		if (multi) {
			const cells = await db.all(`
				SELECT 
					row_index,
					text
				FROM sources_cells
				WHERE 
					col_index = :col_index 
					and sheet_index = :sheet_index 
					and source_id = :source_id
					and text like "%, %"
				ORDER BY row_index, multi_index
			`, {col_index, sheet_index, source_id})
			
			const texts = {}
			for (const {row_index, text} of cells) {
				texts[row_index] ??= []
				texts[row_index].push(...text.split(', '))
				await db.exec(`
					DELETE FROM sources_cells
					WHERE source_id = :source_id 
						and row_index = :row_index
						and sheet_index = :sheet_index 
						and col_index = :col_index
				`, {source_id, sheet_index, row_index, col_index})
			}
			for (const row_index in texts) {
				for (const multi_index in texts[row_index]) {
					const text = texts[row_index][multi_index]
					await db.exec(`
						INSERT INTO sources_cells (source_id, sheet_index, row_index, col_index, multi_index, text)
						VALUES (:source_id, :sheet_index, :row_index, :col_index, :multi_index, :text)
					`, {source_id, sheet_index, row_index, col_index, multi_index, text})
				}
			}

		} else { //multi нет, дубли мёрджим
			const cells = await db.all(`
				SELECT 
					row_index,
					text
				FROM sources_cells
				WHERE 
					col_index = :col_index 
					and sheet_index = :sheet_index 
					and source_id = :source_id
					and row_index in (
						SELECT row_index 
						FROM sources_cells 
						WHERE source_id = :source_id and sheet_index = :sheet_index and col_index = :col_index
						GROUP BY row_index HAVING COUNT(*) > 1
					)
				ORDER BY row_index, multi_index
			`, {col_index, sheet_index, source_id})
			
			const texts = {}
			for (const {row_index, text} of cells) {
				texts[row_index] ??= []
				texts[row_index].push(text)
				await db.exec(`
					DELETE FROM sources_cells
					WHERE source_id = :source_id 
						and row_index = :row_index
						and sheet_index = :sheet_index 
						and col_index = :col_index
				`, {source_id, sheet_index, row_index, col_index})
			}
			for (const row_index in texts) {
				const text = texts[row_index].join(', ')
				await db.exec(`
					INSERT INTO sources_cells (source_id, sheet_index, row_index, col_index, text)
					VALUES (:source_id, :sheet_index, :row_index, :col_index, :text)
				`, {source_id, sheet_index, row_index, col_index, text})
			}
		}
	}
}
Consciousness.recalcTexts = async (db, source) => {
	const {source_id} = source
	const sheets = await db.colAll(`
		SELECT sheet_index
		FROM sources_sheets
		WHERE source_id = :source_id
	`, {source_id})
	for (const sheet_index of sheets) {
		const props = await db.allto('col_index', `
			SELECT co.col_index, co.prop_id, pr.type, pr.multi + 0 as multi
			FROM sources_cols co
				LEFT JOIN sources_props pr on (pr.prop_id = co.prop_id)
			WHERE co.source_id = :source_id and co.sheet_index = :sheet_index
		`, {source_id, sheet_index})
		
		const cells = await db.all(`
			SELECT ce.source_id, ce.sheet_index, ce.row_index, ce.col_index, ce.multi_index, ce.text
			FROM sources_cells ce
			WHERE ce.source_id = :source_id
				and ce.sheet_index = :sheet_index
		`, {source_id, sheet_index})
		for (const cell of cells) {
			const prop = props[cell.col_index]

			await Consciousness.setCellType(db, cell, prop?.type)
		}
	}
}
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
Consciousness.insertItemsByEntity = async (db, entity) => {
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
Consciousness.recalcRepresent = async (db) => {
	/*
		represent_sheet (represent_custom_sheet, represent_sheets)
		represent_col (represent_custom_col, represent_cols)
		represent_row (represent_custom_row, represent_rows)
		represent_cell (represent_custom_cell, represent_cels)

		represent_prop (represent_custom_prop, represent_props)
		represent_key_value pos(represent_custom_value, represent_values)
		represent_item pos(represent_custom_item, represent_items)
		
		represent_key (represent_source, represent_sheet, represent_col, represent_row, represent_cell)

		represent_instance (represent_entity, represent_prop, represent_item, represent_key_value)
		
		represent (
			represent_instance
			represent_key,

			represent_prop,

			represent_sheet, 
			represent_col, 
			represent_row, 
			represent_cell,
			represent_custom_value
			
		)
		winner (represent)
	*/
	await db.exec(`
		UPDATE 
			sources_rows ro,
			sources_sheets sh, 
			sources_cols co, 
			sources_props pr,
			sources_items it,
			sources_cells ce
				LEFT JOIN sources_custom_values cva on cva.value_id = ce.value_id
		SET ce.represent = ce.represent_cell
			and ro.represent_key 
			and sh.represent_sheet 
			and ro.represent_row 
			and co.represent_col 
			and pr.represent_prop 
			and nvl(cva.represent_custom_value, 1)
			and it.represent_instance
		WHERE 
		sh.source_id = ce.source_id and sh.sheet_index = ce.sheet_index
		and co.source_id = ce.source_id and co.sheet_index = ce.sheet_index and co.col_index = ce.col_index
		and ro.source_id = ce.source_id and ro.sheet_index = ce.sheet_index and ro.row_index = ce.row_index
		and pr.prop_id = co.prop_id
		and it.key_id = ro.key_id and it.entity_id = sh.entity_id
	`)
}

Consciousness.recalcRepresentValueByEntity = async (db, entity) => {
	await db.exec(`
		UPDATE sources_items
		SET represent_key_value = :represent_values
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
			SET it.represent_key_value = :represent_custom_value
			WHERE it.entity_id = :entity_id
			and it.key_id = :key_id
		`, {entity_id, key_id, represent_custom_value})
	}
	
}
Consciousness.recalcRepresentPropByEntity = async (db, entity) => {
	await db.exec(`
		UPDATE sources_props
		SET represent_prop = nvl(represent_custom_prop, :represent_props)
		WHERE entity_id = :entity_id
	`, entity)
}
Consciousness.recalcRepresentColBySource = async (db, source) => {
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
Consciousness.recalcRepresentRowBySource = async (db, source) => {
	await db.exec(`
		UPDATE sources_rows
		SET represent_row = :represent_rows
		WHERE source_id = :source_id 
	`, source)
	await db.exec(`
		UPDATE sources_rows ro, sources_custom_rows cro
		SET ro.represent_row = cro.represent_custom_row
		WHERE ro.source_id = :source_id
			and cro.source_id = ro.source_id 
			and cro.key_id = ro.key_id
			and cro.repeat_index = ro.repeat_index
			and cro.represent_custom_row is not null
	`, source)
}
Consciousness.recalcRepresentCellBySource = async (db, source) => {
	const { source_id } = source
	await db.exec(`
		UPDATE sources_cells
		SET represent_cell = :represent_cells
		WHERE source_id = :source_id 
	`, source)

	await db.exec(`
		UPDATE sources_cells ce, sources_rows ro, sources_custom_cells cce
		SET ce.represent_cell = cce.represent_custom_cell
		WHERE ce.source_id = :source_id
			and ro.source_id = ce.source_id
			and ro.row_index = ce.row_index
			and cce.source_id = ce.source_id 
			and cce.key_id = ro.key_id
			and cce.repeat_index = ro.repeat_index
			and cce.represent_custom_cell is not null
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
Consciousness.recalcRepresentSheetBySource = async (db, source) => {
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
Consciousness.recalcRepresentItemByEntity = async (db, entity) => {
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
Consciousness.recalcRepresentInstanceByEntity = async (db, entity) => {
	await db.exec(`
		UPDATE sources_items it, sources_entities en, sources_props pr
		SET it.represent_instance = it.represent_item and it.represent_key_value and pr.represent_prop and en.represent_entity
		WHERE it.entity_id = :entity_id
		and en.entity_id = it.entity_id 
		and pr.prop_id = en.prop_id
	`, entity)
}
Consciousness.recalcRepresentKeyBySource = async (db, source) => {
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


Consciousness.recalcSearchByEntityIdAndSourceId = async (db, entity_id, source_id) => {

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
				and ce.source_id = sh.source_id and ce.sheet_index = sh.sheet_index and ce.value_id = ro.key_id 
				and ce.winner = 1 and ce.represent = 1
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
Consciousness.recalcWinner = async (db) => {
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
					WHERE ce.sheet_index = co.sheet_index and ce.col_index = co.col_index 
						and ce.source_id = co.source_id and co.prop_id is not null
						and sh.source_id = ce.source_id and sh.sheet_index = ce.sheet_index
						and so.source_id = ce.source_id
						and ro.source_id = ce.source_id and ro.sheet_index = ce.sheet_index and ro.row_index = ce.row_index
						and ce.represent = 1

				) t
				LEFT JOIN (

					SELECT sh.entity_id, ro.key_id, co.prop_id, ce.source_id, so.ordain, ce.sheet_index, ce.row_index, ce.col_index
					FROM sources_cells ce, sources_cols co, sources_sources so, sources_sheets sh, sources_rows ro
					WHERE ce.sheet_index = co.sheet_index and ce.col_index = co.col_index 
						and ce.represent = 1
						and ce.source_id = co.source_id and co.prop_id is not null
						and sh.source_id = ce.source_id and sh.sheet_index = ce.sheet_index
						and so.source_id = ce.source_id
						and ro.source_id = ce.source_id and ro.sheet_index = ce.sheet_index and ro.row_index = ce.row_index

				) t2 on (
					t2.entity_id = t.entity_id and t2.key_id = t.key_id and t2.prop_id = t.prop_id 
					and (
						t2.ordain > t.ordain 
						or t2.sheet_index > t.sheet_index 
						or t2.row_index > t.row_index 
						or t2.col_index > t.col_index
					)
				)
				WHERE t2.entity_id is null
			) w
		SET 
			c.winner = 1
		WHERE c.source_id = w.source_id 
			and c.sheet_index = w.sheet_index 
			and c.row_index = w.row_index 
			and c.col_index = w.col_index
	`)
}