import Sources from "/-sources/Sources.js"

import Consciousness from "/-sources/Consciousness.js" //кОншиснес (Сознание)
const Constellation = {} //кОнстелейшен (Созвездие)
const Consequences = {} //кОнс(иеэ)кв(аеэ)нсиз (Последствия)



Consequences.loaded = async (db, source_id) => {
	const source = await Sources.getSource(db, source_id)
	await Consciousness.recalcEntitiesPropId(db, source)
	await Constellation.recalcTexts(db, source)
	await Consciousness.recalcKeyIndex(db)
	await Consciousness.recalcRowsKeyId(db, source)
	await Constellation.recalcRepresentBySource(db, source) //key_id, represent, winner
}
Consequences.changed = async (db, entity_id) => {
	const entity = await Sources.getEntity(db, entity_id)
	await Constellation.recalcEntity(db, entity)
	const sources = await db.colAll(`
		SELECT distinct source_id FROM sources_sheets
		WHERE entity_id = :entity_id
	`, entity)
	for (const source_id of sources) {
		const source = await Sources.getSource(db, source_id)
		await Consciousness.recalcEntitiesPropId(db, source)
		await Constellation.recalcTexts(db, source)
		await Consciousness.recalcKeyIndex(db)
		await Consciousness.recalcRowsKeyId(db, source)
		await Constellation.recalcRepresentBySource(db, source) //key_id, represent, winner
	}
}
Consequences.all = async (db) => {
	const sources = await Sources.getSources(db)
	for (const source of sources) {
		await Consciousness.recalcEntitiesPropId(db, source)
		await Constellation.recalcTexts(db, source)
		await Consciousness.recalcKeyIndex(db)
		await Consciousness.recalcRowsKeyId(db, source)
		
		await Consciousness.recalcRepresentSheetBySource(db, source)
		await Consciousness.recalcRepresentColBySource(db, source)
		await Consciousness.recalcRepresentRowBySource(db, source)
		await Consciousness.recalcRepresentCellBySource(db, source)
		await Consciousness.recalcRepresentKeyBySource(db, source)
	}
	const entities = await Sources.getEntities(db)
	for (const entity of entities) {
		await Consciousness.insertItemsByEntity(db, entity) //insert items
		await Consciousness.recalcRepresentPropByEntity(db, entity)
		await Consciousness.recalcRepresentValueByEntity(db, entity)
		await Consciousness.recalcRepresentItemByEntity(db, entity)
		await Consciousness.recalcRepresentInstanceByEntity(db, entity)
	}
	await Consciousness.recalcRepresentCell(db)
	await Consciousness.recalcWinner(db)
	
	for (const entity of entities) {
		for (const source of sources) {
			await Consciousness.recalcSearchByEntityIdAndSourceId(db, entity.entity_id, source.source_id)
		}
	}
}
Consequences.represent = async (db) => {
	const sources = await Sources.getSources(db)
	for (const source of sources) {
		await Consciousness.recalcRepresentSheetBySource(db, source)
		await Consciousness.recalcRepresentColBySource(db, source)
		await Consciousness.recalcRepresentRowBySource(db, source)
		await Consciousness.recalcRepresentCellBySource(db, source)
		await Consciousness.recalcRepresentKeyBySource(db, source)
	}
	const entities = await Sources.getEntities(db)
	for (const entity of entities) {
		await Consciousness.insertItemsByEntity(db, entity) //insert items
		await Consciousness.recalcRepresentPropByEntity(db, entity)
		await Consciousness.recalcRepresentValueByEntity(db, entity)
		await Consciousness.recalcRepresentItemByEntity(db, entity)
		await Consciousness.recalcRepresentInstanceByEntity(db, entity)
	}
	await Consciousness.recalcRepresentCell(db)
	await Consciousness.recalcWinner(db)
	
	for (const entity of entities) {
		for (const source of sources) {
			await Consciousness.recalcSearchByEntityIdAndSourceId(db, entity.entity_id, source.source_id)
		}
	}
}
Constellation.recalcSearchByEntity = async (db, {entity_id}) => {
	const sources = await db.colAll(`
		SELECT distinct source_id FROM sources_sheets
		WHERE entity_id = :entity_id
	`, {entity_id})
	for (const source_id of sources) {
		await Consciousness.recalcSearchByEntityIdAndSourceId(db, entity_id, source_id)
	}
}
Constellation.recalcSearchBySource = async (db, {source_id}) => {
	const entities = await db.colAll(`
		SELECT distinct entity_id FROM sources_sheets
		WHERE source_id = :source_id
	`, {source_id})
	for (const entity_id of entities) {
		await Consciousness.recalcSearchByEntityIdAndSourceId(db, entity_id, source_id)
	}
}
Constellation.recalcEntity = async (db, entity) => {
	await Consciousness.insertItemsByEntity(db, entity) //insert items
	await Consciousness.recalcRepresentPropByEntity(db, entity)
	await Consciousness.recalcRepresentValueByEntity(db, entity)
	await Consciousness.recalcRepresentItemByEntity(db, entity)
	await Consciousness.recalcRepresentInstanceByEntity(db, entity)

	await Consciousness.recalcRepresentCell(db)
	await Consciousness.recalcWinner(db)
	await Constellation.recalcSearchByEntity(db, entity)
}


Constellation.recalcRepresentBySource = async (db, source) => { //Уже есть sheets, cols, cells, rows
	
	await Consciousness.recalcRepresentSheetBySource(db, source)
	await Consciousness.recalcRepresentColBySource(db, source)
	await Consciousness.recalcRepresentRowBySource(db, source)
	await Consciousness.recalcRepresentCellBySource(db, source)

	await Consciousness.recalcRepresentKeyBySource(db, source)
	const entities = await db.colAll(`
		SELECT distinct entity_id FROM sources_sheets
		WHERE source_id = :source_id
	`, source)
	for (const entity_id of entities) {
		const entity = await Sources.getEntity(db, entity_id)
		await Consciousness.insertItemsByEntity(db, entity) //insert items
		await Consciousness.recalcRepresentPropByEntity(db, entity)
		await Consciousness.recalcRepresentValueByEntity(db, entity)
		await Consciousness.recalcRepresentItemByEntity(db, entity)
		await Consciousness.recalcRepresentInstanceByEntity(db, entity)
	}
	await Consciousness.recalcRepresentCell(db)
	await Consciousness.recalcWinner(db)
	await Constellation.recalcSearchBySource(db, source)
	
	
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
Constellation.recalcTexts = async (db, source) => {
	const {source_id} = source
	const sheets = await db.colAll(`
		SELECT sheet_index
		FROM sources_sheets
		WHERE source_id = :source_id
	`, {source_id})
	for (const sheet_index of sheets) {
		const props = await db.allto('col_index', `
			SELECT co.prop_id, pr.type, pr.multi + 1 as multi
			FROM sources_cols co
				LEFT JOIN sources_props pr on (pr.prop_id = co.prop_id)
			WHERE co.source_id = :source_id and co.sheet_index = :sheet_index
		`, {source_id, sheet_index})

		const cells = await db.all(`
			SELECT ce.source_id, ce.sheet_index, ce.row_index, ce.col_index, ce.text
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


Constellation.recalcPropByProp = async (db, prop) => {
	if (prop.type == 'text') {
		await db.exec(`
			UPDATE sources_cells ce, sources_cols co
			SET ce.value_id = null,
			ce.number = null,
			ce.date = null
			WHERE ce.source_id = co.source_id 
			and ce.sheet_index = co.sheet_index 
			and ce.col_index = co.col_index 
			and co.prop_id = :prop_id
		`, prop)
		return
	}
	const cells = await db.all(`
		SELECT ce.source_id, ce.sheet_index, ce.row_index, ce.col_index, ce.text
		FROM sources_cells ce, sources_cols co
		WHERE ce.source_id = co.source_id 
		and ce.sheet_index = co.sheet_index 
		and ce.col_index = co.col_index 
		and co.prop_id = :prop_id
	`, prop)
	for (const cell of cells) {
		await Consciousness.setCellType(db, cell, prop.type)
	}
}

export default Consequences