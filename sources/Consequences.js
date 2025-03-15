import Sources from "/-sources/Sources.js"

import Consciousness from "/-sources/Consciousness.js" //кОншиснес (Сознание)
const Constellation = {} //кОнстелейшен (Созвездие)
const Consequences = {} //кОнс(иеэ)кв(аеэ)нсиз (Последствия)


Consequences.all = async (db) => {
	
	await Consciousness.recalcEntitiesPropId(db)
	await Consciousness.recalcMulti(db)
	await Consciousness.recalcTexts(db)
	await Consciousness.recalcKeyIndex(db)
	await Consciousness.recalcRowsKeyIdRepeatIndex(db)
	await Consciousness.insertItems(db)
	
	await Consciousness.recalcRepresentSheet(db)
	await Consciousness.recalcRepresentCol(db)
	await Consciousness.recalcRepresentRow(db)
	await Consciousness.recalcRepresentCell(db)

	await Consciousness.recalcRepresentCellRowKey(db)
	await Consciousness.recalcRepresentCellSummary(db)
	
	await Consciousness.recalcRepresentItemValue(db)
	await Consciousness.recalcRepresentItemSummary(db)
	await Consciousness.recalcRepresent(db)
	await Consciousness.recalcMaster(db)
	await Consciousness.recalcWinner(db)
	await Consciousness.recalcAppear(db)
	await Consciousness.recalcRowSearch(db)
	await Consciousness.recalcItemSearch(db)
	
}




export default Consequences