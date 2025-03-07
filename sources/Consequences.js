import Sources from "/-sources/Sources.js"

import Consciousness from "/-sources/Consciousness.js" //кОншиснес (Сознание)
const Constellation = {} //кОнстелейшен (Созвездие)
const Consequences = {} //кОнс(иеэ)кв(аеэ)нсиз (Последствия)



Consequences.loaded = async (db, source_id) => { //Загружены данные
	return Consequences.all(db)
	// const source = await Sources.getSource(db, source_id)

	// await Consciousness.recalcRowSearchBySourceId(db, source_id) //Асинхронно расчитывается, не зависит от расчёта represent

	// await Consciousness.recalcEntitiesPropIdBySource(db, source)
	

	// await Consciousness.recalcMultiBySource(db, source)
	
	// await Consciousness.recalcTextsBySource(db, source)


	// await Consciousness.recalcKeyIndex(db)

	// await Consciousness.recalcRowsKeyIdBySource(db, source)
	
	// //key_id, represent, winner
	// await Consciousness.recalcRepresentSheetBySource(db, source)

	// await Consciousness.recalcRepresentColBySource(db, source)

	// await Consciousness.recalcRepresentRowBySource(db, source)

	// await Consciousness.recalcRepresentCellBySource(db, source)
	// await Consciousness.recalcRepresentRowKeyBySource(db, source)
	// await Consciousness.recalcRepresentRowSummaryBySource(db, source)

	// const entities = await db.colAll(`
	// 	SELECT distinct entity_id FROM sources_sheets
	// 	WHERE source_id = :source_id
	// `, source)
	// for (const entity_id of entities) {
	// 	const entity = await Sources.getEntity(db, entity_id)
	// 	if (!entity) continue

	// 	await Consciousness.insertItemsByEntity(db, entity) //insert items
	
	// 	await Consciousness.recalcRepresentValueByEntity(db, entity)
	// 	await Consciousness.recalcRepresentItemByEntity(db, entity)
	// 	await Consciousness.recalcRepresentItemSummaryByEntity(db, entity)
	// }
	
	// await Consciousness.recalcRepresent(db)
	// await Consciousness.recalcWinner(db)
	// await Consciousness.recalcMaster(db)
	
	// for (const entity_id of entities) {
	// 	await Consciousness.recalcSearchByEntityIdAndSourceId(db, entity_id, source.source_id)
	// }
	//await Consciousness.recalcAppear(db)
}
Consequences.changed = async (db, entity_id) => { //Изменились данные меняющие итоговые данные
	return Consequences.all(db)
	// /*
	// 	prop: multi, known, type, represent_custom_prop, represent_custom_item, represent_entity
	// 	entity: prop_id


	// */
	// const entity = await Sources.getEntity(db, entity_id)
	
	// await Consciousness.insertItemsByEntity(db, entity) //insert items
	
	// await Consciousness.recalcRepresentValueByEntity(db, entity)
	// await Consciousness.recalcRepresentItemByEntity(db, entity)
	// await Consciousness.recalcRepresentItemSummaryByEntity(db, entity)

	
	// const sources = await Sources.getSources(db, entity_id)
	
	// for (const source of sources) {
	// 	await Consciousness.recalcEntitiesPropIdBySource(db, source)
	// 	await Consciousness.recalcMultiBySource(db, source)
	// 	await Consciousness.recalcTextsBySource(db, source)
	// 	await Consciousness.recalcKeyIndex(db)
	// 	await Consciousness.recalcRowsKeyIdBySource(db, source)

	// 	//await Consciousness.recalcRepresentSheetBySource(db, source)
	// 	//await Consciousness.recalcRepresentColBySource(db, source)
	// 	//await Consciousness.recalcRepresentRowBySource(db, source)
	// 	await Consciousness.recalcRepresentCellBySource(db, source)
	// 	await Consciousness.recalcRepresentRowKeyBySource(db, source)
	// 	await Consciousness.recalcRepresentRowSummaryBySource(db, source)
	// }
	// await Consciousness.recalcRepresent(db)
	// await Consciousness.recalcWinner(db)
	// await Consciousness.recalcMaster(db)
	// for (const source of sources) {
	// 	await Consciousness.recalcSearchByEntityIdAndSourceId(db, entity_id, source.source_id)
	// }
}



Consequences.represent = async (db) => { //Изменились данные меняющие итоговую видимость
	return Consequences.all(db)

	// const sources = await Sources.getSources(db)

	// for (const source of sources) {
	// 	await Consciousness.recalcRepresentSheetBySource(db, source)
	// 	await Consciousness.recalcRepresentColBySource(db, source)
	// 	await Consciousness.recalcRepresentRowBySource(db, source)
	// 	await Consciousness.recalcRepresentCellBySource(db, source)
	// 	await Consciousness.recalcRepresentRowKeyBySource(db, source)
	// 	await Consciousness.recalcRepresentRowSummaryBySource(db, source)
	// }

	// const entities = await Sources.getEntities(db)

	// for (const entity of entities) {
	// 	await Consciousness.insertItemsByEntity(db, entity) //insert items
		
	

	// 	await Consciousness.recalcRepresentValueByEntity(db, entity)

	// 	await Consciousness.recalcRepresentItemByEntity(db, entity)
	// 	await Consciousness.recalcRepresentItemSummaryByEntity(db, entity)
	// }


	// await Consciousness.recalcRepresent(db)
	// await Consciousness.recalcWinner(db)
	// await Consciousness.recalcMaster(db)
	// for (const entity of entities) {
	// 	for (const source of sources) {
	// 		Consciousness.recalcSearchByEntityIdAndSourceId(db, entity.entity_id, source.source_id)
	// 	}
	// }
}

Consequences.all = async (db) => {
	//const sources = await Sources.getSources(db)
	
	
	console.time('recalc')
	await Consciousness.recalcEntitiesPropId(db)
	console.timeLog('recalc', 'recalcEntitiesPropId')

	
	await Consciousness.recalcMulti(db)
	console.timeLog('recalc', 'recalcMulti')

	
	await Consciousness.recalcTexts(db)
	console.timeLog('recalc', 'recalcTexts')

	
	await Consciousness.recalcKeyIndex(db)
	console.timeLog('recalc', 'recalcKeyIndex')

	
	await Consciousness.recalcRowsKeyIdRepeatIndex(db)
	console.timeLog('recalc', 'recalcRowsKeyIdRepeatIndex')

	
	await Consciousness.recalcRepresentSheet(db)
	console.timeLog('recalc', 'recalcRepresentSheet')
	
	
	await Consciousness.recalcRepresentCol(db)
	console.timeLog('recalc', 'recalcRepresentCol')

	
	await Consciousness.recalcRepresentRow(db)
	console.timeLog('recalc', 'recalcRepresentRow')

	
	await Consciousness.recalcRepresentCell(db)
	console.timeLog('recalc', 'recalcRepresentCell')

	
	await Consciousness.recalcRepresentRowKey(db)
	console.timeLog('recalc', 'recalcRepresentRowKey')

	
	await Consciousness.recalcRepresentRowSummary(db)
	console.timeLog('recalc', 'recalcRepresentRowSummary')


	await Consciousness.insertItems(db) //insert items
	console.timeLog('recalc', 'insertItems')


	await Consciousness.recalcRepresentValueByEntity(db)
	console.timeLog('recalc', 'recalcRepresentValueByEntity')


	await Consciousness.recalcRepresentItemSummary(db)
	console.timeLog('recalc', 'recalcRepresentItemSummary')

	await Consciousness.recalcRepresent(db)
	console.timeLog('recalc', 'recalcRepresent')

	
	await Consciousness.recalcMaster(db)
	console.timeLog('recalc', 'recalcMaster')

	
	await Consciousness.recalcWinner(db)
	console.timeLog('recalc', 'recalcWinner')

	await Consciousness.recalcAppear(db)
	console.timeLog('recalc', 'recalcAppear')

	console.timeEnd('recalc')

	Consciousness.recalcRowSearch(db) //Асинхронно расчитывается, не зависит от расчёта represent
	Consciousness.recalcItemSearch(db) //Асинхронно расчитывается, не зависит от расчёта represent
}

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