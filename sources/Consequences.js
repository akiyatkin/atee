import Sources from "/-sources/Sources.js"

import Consciousness from "/-sources/Consciousness.js" //кОншиснес (Сознание)
const Constellation = {} //кОнстелейшен (Созвездие)
const Consequences = {} //кОнс(иеэ)кв(аеэ)нсиз (Последствия)



Consequences.loaded = async (db, source_id) => {
	const source = await Sources.getSource(db, source_id)
	await Consciousness.recalcEntitiesPropId(db, source)
	await Consciousness.recalcMulti(db, source)
	await Consciousness.recalcTexts(db, source)
	await Consciousness.recalcKeyIndex(db)
	await Consciousness.recalcRowsKeyId(db, source)
	
	//key_id, represent, winner
	await Consciousness.recalcRepresentSheetBySource(db, source)
	await Consciousness.recalcRepresentColBySource(db, source)
	await Consciousness.recalcRepresentRowBySource(db, source)
	await Consciousness.recalcRepresentCellBySource(db, source)
	await Consciousness.recalcRepresentRowKeyBySource(db, source)
	await Consciousness.recalcRepresentRowSummaryBySource(db, source)

	const entities = await db.colAll(`
		SELECT distinct entity_id FROM sources_sheets
		WHERE source_id = :source_id
	`, source)
	for (const entity_id of entities) {
		const entity = await Sources.getEntity(db, entity_id)
		if (!entity) continue
		await Consciousness.insertItemsByEntity(db, entity) //insert items
		await Consciousness.recalcRepresentPropByEntity(db, entity)
		await Consciousness.recalcRepresentValueByEntity(db, entity)
		await Consciousness.recalcRepresentItemByEntity(db, entity)
		await Consciousness.recalcRepresentItemSummaryByEntity(db, entity)
	}
	await Consciousness.recalcRepresent(db)
	await Consciousness.recalcWinner(db)
	for (const entity_id of entities) {
		await Consciousness.recalcSearchByEntityIdAndSourceId(db, entity_id, source.source_id)
	}
	await Consciousness.recalcAppear(db, source)
}
Consequences.changed = async (db, entity_id) => {
	/*
		prop: multi, known, type, represent_custom_prop, represent_custom_item, represent_entity
		entity: prop_id


	*/
	const entity = await Sources.getEntity(db, entity_id)
	
	await Consciousness.insertItemsByEntity(db, entity) //insert items
	await Consciousness.recalcRepresentPropByEntity(db, entity)
	await Consciousness.recalcRepresentValueByEntity(db, entity)
	await Consciousness.recalcRepresentItemByEntity(db, entity)
	await Consciousness.recalcRepresentItemSummaryByEntity(db, entity)

	
	const sources = await Sources.getSources(db, entity_id)
	
	for (const source of sources) {
		await Consciousness.recalcEntitiesPropId(db, source)
		await Consciousness.recalcMulti(db, source)
		await Consciousness.recalcTexts(db, source)
		await Consciousness.recalcKeyIndex(db)
		await Consciousness.recalcRowsKeyId(db, source)

		//await Consciousness.recalcRepresentSheetBySource(db, source)
		//await Consciousness.recalcRepresentColBySource(db, source)
		//await Consciousness.recalcRepresentRowBySource(db, source)
		await Consciousness.recalcRepresentCellBySource(db, source)
		await Consciousness.recalcRepresentRowKeyBySource(db, source)
		await Consciousness.recalcRepresentRowSummaryBySource(db, source)
	}
	await Consciousness.recalcRepresent(db)
	await Consciousness.recalcWinner(db)
	for (const source of sources) {
		await Consciousness.recalcSearchByEntityIdAndSourceId(db, entity_id, source.source_id)
	}
}



Consequences.represent = async (db) => {
	const sources = await Sources.getSources(db)
	for (const source of sources) {
		await Consciousness.recalcRepresentSheetBySource(db, source)
		await Consciousness.recalcRepresentColBySource(db, source)
		await Consciousness.recalcRepresentRowBySource(db, source)
		await Consciousness.recalcRepresentCellBySource(db, source)
		await Consciousness.recalcRepresentRowKeyBySource(db, source)
		await Consciousness.recalcRepresentRowSummaryBySource(db, source)
	}
	const entities = await Sources.getEntities(db)
	for (const entity of entities) {
		await Consciousness.insertItemsByEntity(db, entity) //insert items
		await Consciousness.recalcRepresentPropByEntity(db, entity)
		await Consciousness.recalcRepresentValueByEntity(db, entity)
		await Consciousness.recalcRepresentItemByEntity(db, entity)
		await Consciousness.recalcRepresentItemSummaryByEntity(db, entity)
	}
	await Consciousness.recalcRepresent(db)
	await Consciousness.recalcWinner(db)
	
	for (const entity of entities) {
		for (const source of sources) {
			await Consciousness.recalcSearchByEntityIdAndSourceId(db, entity.entity_id, source.source_id)
		}
	}
}

// Consequences.all = async (db) => {
// 	const sources = await Sources.getSources(db)
// 	for (const source of sources) {
// 		await Consciousness.recalcEntitiesPropId(db, source)
// 		await Consciousness.recalcTexts(db, source)
// 		await Consciousness.recalcKeyIndex(db)
// 		await Consciousness.recalcRowsKeyId(db, source)
		
// 		await Consciousness.recalcRepresentSheetBySource(db, source)
// 		await Consciousness.recalcRepresentColBySource(db, source)
// 		await Consciousness.recalcRepresentRowBySource(db, source)
// 		await Consciousness.recalcRepresentCellBySource(db, source)
// 		await Consciousness.recalcRepresentRowKeyBySource(db, source)
//		await Consciousness.recalcRepresentRowSummaryBySource(db, source)
// 	}
// 	const entities = await Sources.getEntities(db)
// 	for (const entity of entities) {
// 		await Consciousness.insertItemsByEntity(db, entity) //insert items
// 		await Consciousness.recalcRepresentPropByEntity(db, entity)
// 		await Consciousness.recalcRepresentValueByEntity(db, entity)
// 		await Consciousness.recalcRepresentItemByEntity(db, entity)
// 		await Consciousness.recalcRepresentItemSummaryByEntity(db, entity)
// 	}
// 	await Consciousness.recalcRepresent(db)
// 	await Consciousness.recalcWinner(db)
//	await Consciousness.recalcAppear(db, source)
// 	for (const entity of entities) {
// 		for (const source of sources) {
// 			await Consciousness.recalcSearchByEntityIdAndSourceId(db, entity.entity_id, source.source_id)
// 		}
// 	}
// }

// Constellation.recalcRepresentBySource = async (db, source) => { //Уже есть sheets, cols, cells, rows
	
// 	await Consciousness.recalcRepresentSheetBySource(db, source)
// 	await Consciousness.recalcRepresentColBySource(db, source)
// 	await Consciousness.recalcRepresentRowBySource(db, source)
// 	await Consciousness.recalcRepresentCellBySource(db, source)

// 	await Consciousness.recalcRepresentRowKeyBySource(db, source)
//	await Consciousness.recalcRepresentRowSummaryBySource(db, source)
// 	const entities = await db.colAll(`
// 		SELECT distinct entity_id FROM sources_sheets
// 		WHERE source_id = :source_id
// 	`, source)
// 	for (const entity_id of entities) {
// 		const entity = await Sources.getEntity(db, entity_id)
// 		await Consciousness.insertItemsByEntity(db, entity) //insert items
// 		await Consciousness.recalcRepresentPropByEntity(db, entity)
// 		await Consciousness.recalcRepresentValueByEntity(db, entity)
// 		await Consciousness.recalcRepresentItemByEntity(db, entity)
// 		await Consciousness.recalcRepresentItemSummaryByEntity(db, entity)
// 	}
// 	await Consciousness.recalcRepresent(db)
// 	await Consciousness.recalcWinner(db)
	
// 	for (const entity_id of entities) {
// 		await Consciousness.recalcSearchByEntityIdAndSourceId(db, entity_id, source.source_id)
// 	}
	

	
// }





export default Consequences