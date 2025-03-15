import fs from "fs/promises"

import nicked from '/-nicked/nicked.js'
import unique from '/-nicked/unique.js'
import words from '/-words/words.js'
import date from '/-words/date.html.js'
import eye from "/-sources/represent.js"

import Sources from "/-sources/Sources.js"
import Consequences from "/-sources/Consequences.js"
import Consciousness from "/-sources/Consciousness.js"

import Rest from "/-rest"
const rest = new Rest()

import rest_admin from '/-controller/rest.admin.js'
rest.extra(rest_admin)

import rest_sources from '/-sources/rest.sources.js'
rest.extra(rest_sources)

import rest_search from "/-dialog/search/rest.search.js" //аргументы hash, search 
rest.extra(rest_search)

rest.addAction('set-recalc', ['admin','checkstart'], async view => {
	const db = await view.get('db')
	Sources.recalc(db, async () => {
		await Consequences.all(db)
	})
	
	return view.ret()
})

rest.addAction('set-source-prop', ['admin','checkstart'], async view => {
	
	const db = await view.get('db')
	const source_id = await view.get('source_id#required') 
	const propname = await view.get('sourceprop#required')
	const value = await view.get('bit#required')
	
	await db.exec(`
		UPDATE sources_sources
		SET ${propname} = :value
		WHERE source_id = :source_id
	`, {source_id, value})

	view.ans.value = value
	
	
	/*
		1 независимые данные
		2 независимый прайс
		3 зависимые данные
		4 зависимый прайс
	*/
	if (propname == 'master') {
		Sources.recalc(db, async () => {
			//await Consciousness.recalcEntitiesPropId(db)
			//await Consciousness.recalcMulti(db)
			//await Consciousness.recalcTexts_byProp(db, prop_id)
			//await Consciousness.recalcKeyIndex(db)
			//await Consciousness.recalcRowsKeyIdRepeatIndex(db)
			//await Consciousness.insertItems(db) //insert items

			//await Consciousness.recalcRepresentSheet_bySheet(db, sheet.source_id, sheet.sheet_index)
			//await Consciousness.recalcRepresentCol(db)
			//await Consciousness.recalcRepresentRow(db)
			//await Consciousness.recalcRepresentCell(db)
			//await Consciousness.recalcRepresentCellRowKey_bySheet(db, sheet.source_id, sheet.sheet_index)
			//await Consciousness.recalcRepresentCellSummary_bySheet(db, sheet.source_id, sheet.sheet_index)
			//await Consciousness.recalcRepresentItemValue(db)
			//await Consciousness.recalcRepresentItemSummary(db)
			//await Consciousness.recalcRepresent(db)
			
			await Consciousness.recalcMaster_bySource(db, source_id)
			await Consciousness.recalcWinner_bySource(db, source_id)

			//await Consciousness.recalcAppear(db)
			//await Consciousness.recalcRowSearch(db) //Асинхронно расчитывается, не зависит от расчёта represent
			await Consciousness.recalcItemSearch_bySource(db, source_id) //Асинхронно расчитывается, не зависит от расчёта represent
		})
	}
	
	return view.ret()
})


rest.addAction('set-prop-prop', ['admin','checkstart'], async view => {
	
	const db = await view.get('db')
	const prop_id = await view.get('prop_id#required') 
	const propname = await view.get('propprop#required')
	const value = await view.get('bit#required')
	
	const source_title = await Sources.getSourceTitleByKeyId(db, prop_id)

	
	

	if (propname == 'multi' && value && source_title) return view.err('Ключевое свойство может быть только с одним значением. Используется в истончике ' + source_title)
	
	await db.exec(`
		UPDATE sources_props
		SET ${propname} = :value
		WHERE prop_id = :prop_id
	`, {prop_id, value})
	
	if (propname == 'multi') {
		Sources.recalc(db, async () => {
			//await Consciousness.recalcEntitiesPropId(db)
			await Consciousness.recalcMulti_byProp(db, prop_id)
			await Consciousness.recalcTexts_byProp(db, prop_id)
			//await Consciousness.recalcKeyIndex(db)
			//await Consciousness.recalcRowsKeyIdRepeatIndex(db)
			//await Consciousness.insertItems(db) //insert items

			//await Consciousness.recalcRepresentSheet_bySheet(db, sheet.source_id, sheet.sheet_index)
			//await Consciousness.recalcRepresentCol(db)
			//await Consciousness.recalcRepresentRow(db)
			//await Consciousness.recalcRepresentCell(db)
			//await Consciousness.recalcRepresentCellRowKey_bySheet(db, sheet.source_id, sheet.sheet_index)
			//await Consciousness.recalcRepresentCellSummary_bySheet(db, sheet.source_id, sheet.sheet_index)

			await Consciousness.recalcRepresentItemValue(db)
			await Consciousness.recalcRepresentItemSummary(db)
			await Consciousness.recalcRepresent(db)
			
			await Consciousness.recalcMaster(db)
			await Consciousness.recalcWinner(db)

			//await Consciousness.recalcAppear(db)
			//await Consciousness.recalcRowSearch(db) //Асинхронно расчитывается, не зависит от расчёта represent
			//await Consciousness.recalcItemSearch(db, source_id) //Асинхронно расчитывается, не зависит от расчёта represent
		})
	}

	return view.ret()
})

rest.addAction('set-sheet-custom-delete', ['admin','checkstart'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const sheet_title = await view.get('title#required')
	
	await db.exec(`
		DELETE FROM sources_custom_sheets 
   		WHERE source_id = :source_id and sheet_title = :sheet_title
	`, {source_id, sheet_title})
	await db.exec(`
		DELETE FROM sources_custom_rows 
   		WHERE source_id = :source_id and sheet_title = :sheet_title
	`, {source_id, sheet_title})
	await db.exec(`
		DELETE FROM sources_custom_cells 
   		WHERE source_id = :source_id and sheet_title = :sheet_title
	`, {source_id, sheet_title})
	await db.exec(`
		DELETE FROM sources_custom_cols
   		WHERE source_id = :source_id and sheet_title = :sheet_title
	`, {source_id, sheet_title})

	const sheet = await Sources.getSheetByTitle(db, source_id, sheet_title)
	if (sheet) {
		Sources.recalc(db, async () => {
			//await Consciousness.recalcEntitiesPropId(db)
			//await Consciousness.recalcMulti_byProp(db, prop_id)
			//await Consciousness.recalcTexts_byProp(db, prop_id)
			//await Consciousness.recalcKeyIndex(db)
			//await Consciousness.recalcRowsKeyIdRepeatIndex(db)
			//await Consciousness.insertItems(db) //insert items

			await Consciousness.recalcRepresentSheet_bySheet(db, sheet.source_id, sheet.sheet_index)
			await Consciousness.recalcRepresentCol_bySheet(db, sheet.source_id, sheet.sheet_index)
			await Consciousness.recalcRepresentRow_bySheet(db, sheet.source_id, sheet.sheet_index)
			await Consciousness.recalcRepresentCell_bySource(db, sheet.source_id)
			await Consciousness.recalcRepresentCellRowKey_bySheet(db, sheet.source_id, sheet.sheet_index)
			await Consciousness.recalcRepresentCellSummary_bySheet(db, sheet.source_id, sheet.sheet_index)

			await Consciousness.recalcRepresentItemValue(db)
			await Consciousness.recalcRepresentItemSummary_bySheet(db, sheet.source_id, sheet.sheet_index)
			await Consciousness.recalcRepresent_bySheet(db, sheet.source_id, sheet.sheet_index)
			
			await Consciousness.recalcMaster_bySheet(db, sheet.source_id, sheet.sheet_index)
			await Consciousness.recalcWinner_bySheet(db, sheet.source_id, sheet.sheet_index)

			//await Consciousness.recalcAppear(db)
			//await Consciousness.recalcRowSearch(db) //Асинхронно расчитывается, не зависит от расчёта represent
			await Consciousness.recalcItemSearch(db, source_id) //Асинхронно расчитывается, не зависит от расчёта represent
		})
	}

	return view.ret()
})


rest.addAction('set-prop-type', ['admin','checkstart'], async view => {
	
	const db = await view.get('db')
	const prop_id = await view.get('prop_id#required') 
	const type = await view.get('type#required') 
	
	const prop = await Sources.getProp(db, prop_id)
	
	const issource = await db.col(`select 1 from sources_sources where entity_id = :prop_id`, {prop_id})
	const iscol = await db.col(`select 1 from sources_sheets where entity_id = :prop_id`, {prop_id})

	if ((iscol || issource) && type != 'value') return view.err('Нельзя изменить тип ключевого свойства')
	
	await db.exec(`
		UPDATE sources_props
		SET type = :type
		WHERE prop_id = :prop_id
	`, {prop_id, type})
	prop.type = type
	view.ans.type = type

	Sources.recalc(db, async () => {
		//await Consciousness.recalcEntitiesPropId(db)
		//await Consciousness.recalcMulti(db)
		await Consciousness.recalcTexts_byProp(db, prop_id)
		//await Consciousness.recalcKeyIndex(db)
		//await Consciousness.recalcRowsKeyIdRepeatIndex(db)
		//await Consciousness.insertItems(db) //insert items

		//await Consciousness.recalcRepresentSheet_bySheet(db, sheet.source_id, sheet.sheet_index)
		//await Consciousness.recalcRepresentCol(db)
		//await Consciousness.recalcRepresentRow(db)
		//await Consciousness.recalcRepresentCell(db)
		//await Consciousness.recalcRepresentCellRowKey_bySheet(db, sheet.source_id, sheet.sheet_index)
		//await Consciousness.recalcRepresentCellSummary_bySheet(db, sheet.source_id, sheet.sheet_index)
		//await Consciousness.recalcRepresentItemValue(db)
		await Consciousness.recalcRepresentItemSummary(db)
		await Consciousness.recalcRepresent(db)
		
		await Consciousness.recalcMaster(db)
		await Consciousness.recalcWinner(db)//await Consciousness.recalcWinner(db)

		//await Consciousness.recalcAppear(db)
		//await Consciousness.recalcRowSearch(db) //Асинхронно расчитывается, не зависит от расчёта represent
		//await Consciousness.recalcItemSearch_bySheet(db, sheet.source_id, sheet.sheet_index) //Асинхронно расчитывается, не зависит от расчёта represent
	})
	
	return view.ret()
})
const loadSources = async (db, visitor, list, callback) => {
	const mylist = list.filter(callback)
	const res = []
	for (const source of mylist) {
		const end = await Sources.load(db, source, visitor)
		if (end) await end()
	}
}
const loadSourcesAll = async (db, visitor) => {
	const list = await Sources.getSources(db)
	/*
		1 независимые данные
		2 независимый прайс
		3 зависимые данные
		4 зависимый прайс
	*/
	// await loadSources(db, visitor, list, source => source.master)
	// await loadSources(db, visitor, list, source => !source.master)
	await loadSources(db, visitor, list, source => true)
}
const checkSourcesAll = async (db, visitor) => {
	const list = await Sources.getSources(db)
	/*
		1 независимые данные
		2 независимый прайс
		3 зависимые данные
		4 зависимый прайс
	*/
	// await checkSources(db, visitor, list, source => source.master)
	// await checkSources(db, visitor, list, source => !source.master)
	await checkSources(db, visitor, list, source => true)
}
const checkSources = async (db, visitor, list, callback) => {
	const proms1 = list.filter(callback).map(source => Sources.check(db, source, visitor))
	await Promise.all(proms1)
}
const renovateSourcesAll = async (db, visitor) => {
	const list = await Sources.getSources(db)
	// await renovateSources(db, visitor, list, source => source.master)
	// await renovateSources(db, visitor, list, source => !source.master)
	await renovateSources(db, visitor, list, source => true)
	
}
const renovateSources = async (db, visitor, list, callback) => {
	const proms1 = list.filter(callback).map(source => Sources.renovate(db, source, visitor))
	await Promise.all(proms1)
	for await (const end of proms1) {
		if (!end) continue
		await end()
	}
}
rest.addAction('set-sources-check', ['admin','checkstart'], async view => {
	/*
		1 независимые данные
		2 независимый прайс
		3 зависимые данные
		4 зависимый прайс
	*/
	const db = await view.get('db')
	await checkSourcesAll(db, view.visitor)
	return view.ret()
})
rest.addAction('set-sources-renovate', ['admin','checkstart'], async view => {
	const db = await view.get('db')
	await renovateSourcesAll(db, view.visitor)
	const promise = Sources.recalc(db, async () => {
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
	})
	const go = await view.get('go')
	if (!go) return view.ret()
	await promise
	view.headers.Location = encodeURI(go)
	return view.ret('', 301)
})
rest.addAction('set-sources-load', ['admin'], async view => {
	const db = await view.get('db')
	
	const promise = Sources.recalc(db, async () => {
		await loadSourcesAll(db, view.visitor)
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
	})
	const go = await view.get('go')
	if (!go) return view.ret()
	await promise
	view.headers.Location = encodeURI(go)
	return view.ret('', 301)
})
rest.addAction('set-source-ordain', ['admin','checkstart'], async view => {
	const next_id = await view.get('next_id')
	const id = await view.get('id')
	const db = await view.get('db')

	let ordain
	if (!next_id) ordain = await db.col('SELECT max(ordain) FROM sources_sources') + 1
	if (next_id) ordain = await db.col('SELECT ordain FROM sources_sources WHERE source_id = :next_id', {next_id}) - 1
	if (ordain < 0) ordain = 0
	await db.exec(`
		UPDATE sources_sources 
		SET ordain = :ordain 
		WHERE source_id = :id
	`, {ordain, id})

	await Sources.reorderSources(db)
	
	Sources.recalc(db, async () => {
		// await Consciousness.recalcEntitiesPropId(db)
		// await Consciousness.recalcMulti(db)
		// await Consciousness.recalcTexts(db)
		// await Consciousness.recalcKeyIndex(db)
		// await Consciousness.recalcRowsKeyIdRepeatIndex(db)
		// await Consciousness.insertItems(db)

		// await Consciousness.recalcRepresentSheet(db)
		// await Consciousness.recalcRepresentCol(db)
		// await Consciousness.recalcRepresentRow(db)
		// await Consciousness.recalcRepresentCell(db)
		// await Consciousness.recalcRepresentCellRowKey(db)
		// await Consciousness.recalcRepresentCellSummary(db)
		// await Consciousness.recalcRepresentItemValue(db)
		// await Consciousness.recalcRepresentItemSummary(db)
		// await Consciousness.recalcRepresent(db)
		
		// await Consciousness.recalcMaster(db)
		await Consciousness.recalcWinner(db)

		// await Consciousness.recalcAppear(db)
		// await Consciousness.recalcRowSearch(db)
		await Consciousness.recalcItemSearch(db)
	})

	return view.ret()
})
rest.addAction('set-entity-ordain', ['admin','checkstart'], async view => {
	const next_id = await view.get('next_id')
	const id = await view.get('id')
	const db = await view.get('db')

	let ordain
	if (!next_id) ordain = await db.col('SELECT max(ordain) FROM sources_entities') + 1
	if (next_id) ordain = await db.col('SELECT ordain FROM sources_entities WHERE entity_id = :next_id', {next_id}) - 1
	if (ordain < 0) ordain = 0
	await db.exec(`
		UPDATE sources_entities 
		SET ordain = :ordain 
		WHERE entity_id = :id
	`, {ordain, id})

	await Sources.reorderEntities(db)	
	//await Consequences порядок сущностей никак не влияет на выдачу data или сразу влияет если сортируется
	return view.ret()
})
rest.addAction('set-prop-synonym-create', ['admin','checkstart'], async view => {
	const db = await view.get('db')
	const col_title = await view.get('col_title#required')
	const col_nick = nicked(col_title)
	const prop_id = await view.get('prop_id#required')
	if (!col_nick) return view.err('Укажите корректное имя')
	const synonym = await db.col(`
		SELECT pr.prop_title
		FROM sources_synonyms sy, sources_props pr
		WHERE sy.col_nick = :col_nick
		and sy.prop_id = pr.prop_id
	`, {col_nick})
	if (synonym) return view.err('Такой синоним уже указан у свойства ' + synonym)

	await db.exec(`
		INSERT INTO sources_synonyms (col_nick, col_title, prop_id)
   		VALUES (:col_nick, :col_title, :prop_id)
	`, {col_nick, col_title, prop_id})



	Sources.recalc(db, async () => {
		await Consciousness.recalcEntitiesPropId(db)
		await Consciousness.recalcMulti_byProp(db, prop_id)
		await Consciousness.recalcTexts_byProp(db, prop_id)
		await Consciousness.recalcKeyIndex(db)
		await Consciousness.recalcRowsKeyIdRepeatIndex(db)
		await Consciousness.insertItems(db)

		// await Consciousness.recalcRepresentSheet(db)
		// await Consciousness.recalcRepresentCol(db)
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
	})


	return view.ret()
})
rest.addAction('set-prop-synonym-delete', ['admin','checkstart'], async view => {
	const db = await view.get('db')
	const col_nick = await view.get('col_nick#required')
	const prop_id = await view.get('prop_id#required')
	if (!col_nick) return view.err('Укажите корректное имя')
	
	await db.exec(`DELETE FROM sources_synonyms WHERE prop_id = :prop_id and col_nick = :col_nick`, {prop_id, col_nick})
	
	

	Sources.recalc(db, async () => {
		await Consciousness.recalcEntitiesPropId(db)
		await Consciousness.recalcMulti_byProp(db, prop_id)
		await Consciousness.recalcTexts_byProp(db, prop_id)
		await Consciousness.recalcKeyIndex(db)
		await Consciousness.recalcRowsKeyIdRepeatIndex(db)
		await Consciousness.insertItems(db)

		// await Consciousness.recalcRepresentSheet(db)
		// await Consciousness.recalcRepresentCol(db)
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
	})


	return view.ret()
})
rest.addAction('set-prop-ordain', ['admin','checkstart'], async view => {
	const next_id = await view.get('next_id')
	const id = await view.get('id')
	const db = await view.get('db')

	let ordain
	if (!next_id) ordain = await db.col('SELECT max(ordain) FROM sources_props') + 1
	if (next_id) ordain = await db.col('SELECT ordain FROM sources_props WHERE prop_id = :next_id', {next_id}) - 1
	if (ordain < 0) ordain = 0
	await db.exec(`
		UPDATE sources_props 
		SET ordain = :ordain 
		WHERE prop_id = :id
	`, {ordain, id})
	
	const prop = await Sources.getProp(db, id)
	if (!prop) return view.err()
	await Sources.reorderProps(db)
	//await Consequences порядок свойств ничего не меняет
	return view.ret()
})
rest.addAction('set-reset-values', ['admin'], async (view) => {
	const db = await rest.data('db')
	
	
	// await db.exec(`DELETE FROM sources_appears`)
	// await db.exec(`DELETE FROM sources_cells`)
	// await db.exec(`DELETE FROM sources_cols`)
	// await db.exec(`DELETE FROM sources_rows`)
	// await db.exec(`DELETE FROM sources_sheets`)
	// await db.exec(`DELETE FROM sources_items`)
	// await db.exec(`DELETE FROM sources_values`)
	await db.exec(`SET FOREIGN_KEY_CHECKS = 0`)
	await db.exec(`TRUNCATE TABLE sources_appears`)
	await db.exec(`TRUNCATE TABLE sources_cells`)
	await db.exec(`TRUNCATE TABLE sources_cols`)
	await db.exec(`TRUNCATE TABLE sources_rows`)
	await db.exec(`TRUNCATE TABLE sources_sheets`)
	await db.exec(`TRUNCATE TABLE sources_items`)
	await db.exec(`TRUNCATE TABLE sources_values`)
	await db.exec(`SET FOREIGN_KEY_CHECKS = 1`)

	await db.exec(`
		UPDATE sources_sources
		SET date_check = null, date_content = null, date_load = null, date_mtime = null
	`)
	await checkSourcesAll(db, view.visitor)
	Sources.recalc(db, async () => {
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
	})
	
	return view.ret('Данные очищены')
})
rest.addAction('set-reset-start', ['admin'], async (view) => {
	const db = await rest.data('db') //База данных могла не перезапуститься и процесс загрузки ещё идёт
	await db.exec(`UPDATE sources_sources SET date_start = null`)
	//await Consequences если данные источника были победителями, то просто ничего не прокажется, так как старые были удалены при внесении и победителя не будет
	return view.ret()
})
rest.addAction('set-source-renovate', ['admin','checkstart'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const source = await Sources.getSource(db, source_id)
	await Sources.check(db, source, view.visitor)
	if (source.error) return view.ret('Для загрузки необходимо устранить ошибку')
	if (!source.renovate) return view.ret('Актуализация запрещена')
	if (!source.need) return view.ret(source.status)
	
	
	Sources.recalc(db, async () => {
		await Sources.load(db, source, view.visitor)

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
	})
	//return view.ret('Загрузка запущена!')
	return view.ret()
})
rest.addAction('set-source-load', ['admin','checkstart'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const source = await Sources.getSource(db, source_id)
	if (source.date_start) return view.err('Загрузка уже запущена!')

	if (!source.date_check) await Sources.check(db, source, view.visitor)
	//if (source.error) return view.err('Для загрузки необходимо устранить ошибку')
		
	
	Sources.recalc(db, async () => {
		await Sources.load(db, source, view.visitor)

		await Consciousness.recalcEntitiesPropId(db)
		await Consciousness.recalcMulti_bySource(db, source_id)
		await Consciousness.recalcTexts_bySource(db, source_id)
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
		await Consciousness.recalcWinner_bySource(db, source_id)
		await Consciousness.recalcAppear(db)
		await Consciousness.recalcRowSearch_bySource(db, source_id)
		await Consciousness.recalcItemSearch_bySource(db, source_id)
	})
	
	
	//return view.ret('Загрузка запущена!')
	return view.ret()	
})

rest.addAction('set-prop-comment', ['admin'], async view => {
	const db = await view.get('db')
	const prop_id = await view.get('prop_id#required')
	const comment = await view.get('comment')
	view.ans.comment = comment || 'Написать'
	await db.exec(`
		UPDATE sources_props
		SET comment = :comment
		WHERE prop_id = :prop_id
	`, {comment, prop_id})
	return view.ret()
})
rest.addAction('set-source-comment', ['admin'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const comment = await view.get('comment')
	await db.exec(`
		UPDATE sources_sources
		SET comment = :comment
		WHERE source_id = :source_id
	`, {comment, source_id})
	return view.ret()
})
rest.addAction('set-entity-comment', ['admin'], async view => {
	const db = await view.get('db')
	const entity_id = await view.get('entity_id#required')
	const comment = await view.get('comment')
	await db.exec(`
		UPDATE sources_entities
		SET comment = :comment
		WHERE entity_id = :entity_id
	`, {comment, entity_id})
	return view.ret()
})
rest.addAction('set-source-check', ['admin','checkstart'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const source = await Sources.getSource(db, source_id)
	const ans = await Sources.check(db, source, view.visitor)
	
	// let news
	// if (source.date_load) news = source.date_mtime > source.date_load ? 'могут быть изменения, требуется загрузка' : 'изменений нет, загрузка не требуется'
	// else news = 'необходимо загрузить данные'
	return view.ret(`<p>${source.error || source.status}<p><i>${ans?.msg || ''}</i>`)
})

rest.addAction('set-source-exam', ['admin'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const date = await view.get('date')

	if (!date) {
		await db.exec(`
			UPDATE sources_sources
			SET date_exam = null
			WHERE source_id = :source_id
		`, {source_id})
	} else {
		await db.exec(`
			UPDATE sources_sources
			SET date_exam = FROM_UNIXTIME(:date)
			WHERE source_id = :source_id
		`, {date, source_id})
	}
	return view.ret()
})

rest.addAction('set-source-clear', ['admin','checkstart'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const source = await Sources.getSource(db, source_id)
	if (source.date_start) return view.err('Нельзя очистить, когда идёт загрузка')

	
	await db.exec(`DELETE FROM sources_cells WHERE source_id = :source_id`, source)
	await db.exec(`DELETE FROM sources_cols WHERE source_id = :source_id`, source)
	await db.exec(`DELETE FROM sources_rows WHERE source_id = :source_id`, source)
	await db.exec(`DELETE FROM sources_sheets WHERE source_id = :source_id`, source)
	await db.exec(`
		UPDATE sources_sources
		SET date_check = null, date_content = null, date_load = null, date_mtime = null
		WHERE source_id = :source_id
	`, {source_id})
	await Sources.check(db, source, view.visitor)
	Sources.recalc(db, async () => {
		//await Consciousness.recalcEntitiesPropId(db)
		//await Consciousness.recalcMulti(db)
		//await Consciousness.recalcTexts_byProp(db, prop_id)
		//await Consciousness.recalcKeyIndex(db)
		//await Consciousness.recalcRowsKeyIdRepeatIndex(db)
		await Consciousness.insertItems(db) //insert items

		await Consciousness.recalcRepresentSheet_bySource(db, source_id)
		await Consciousness.recalcRepresentCol_bySource(db, source_id)
		await Consciousness.recalcRepresentRow_bySource(db, source_id)
		await Consciousness.recalcRepresentCell_bySource(db, source_id)
		await Consciousness.recalcRepresentCellRowKey_bySource(db, source_id)
		await Consciousness.recalcRepresentCellSummary_bySource(db, source_id)

		await Consciousness.recalcRepresentItemValue(db)
		await Consciousness.recalcRepresentItemSummary(db)
		await Consciousness.recalcRepresent(db)
		
		await Consciousness.recalcMaster_bySource(db, source_id)
		await Consciousness.recalcWinner_bySource(db, source_id)

		//await Consciousness.recalcAppear(db)
		await Consciousness.recalcRowSearch_bySource(db, source_id) //Асинхронно расчитывается, не зависит от расчёта represent
		await Consciousness.recalcItemSearch_bySource(db, source_id) //Асинхронно расчитывается, не зависит от расчёта represent
	})
	
	/*
		Если удалили данные источника, значит 
		удалилась часть свойств и изменились победители
		удалились ключи надо подчистить sources_items
	*/
	return view.ret('Данные из источника удалены')
})
rest.addAction('set-prop-delete', ['admin','checkstart'], async view => {
	const db = await view.get('db')
	const prop_id = await view.get('prop_id#required')

	const source_title = await Sources.getSourceTitleByKeyId(db, prop_id)
	if (source_title) return view.err('Свойство указано ключевым свойством у источика ' + source_title)
	

	await db.exec(`
		DELETE pr FROM sources_props pr
   		WHERE pr.prop_id = :prop_id
	`, {prop_id})

	Sources.recalc(db, async () => {
		// await Consciousness.recalcEntitiesPropId(db)
		// await Consciousness.recalcMulti(db)
		// await Consciousness.recalcTexts(db)
		// await Consciousness.recalcKeyIndex(db)
		// await Consciousness.recalcRowsKeyIdRepeatIndex(db)
		// await Consciousness.insertItems(db)

		// await Consciousness.recalcRepresentSheet(db)
		// await Consciousness.recalcRepresentCol(db)
		// await Consciousness.recalcRepresentRow(db)
		// await Consciousness.recalcRepresentCell(db)
		// await Consciousness.recalcRepresentCellRowKey(db)
		// await Consciousness.recalcRepresentCellSummary(db)
		// await Consciousness.recalcRepresentItemValue(db)
		// await Consciousness.recalcRepresentItemSummary(db)
		// await Consciousness.recalcRepresent(db)
		
		// await Consciousness.recalcMaster(db)
		// await Consciousness.recalcWinner(db)

		// await Consciousness.recalcAppear(db)
		await Consciousness.recalcRowSearch(db)
		await Consciousness.recalcItemSearch(db)
	})
	return view.ret()

})

rest.addAction('set-source-delete', ['admin','checkstart'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const source = await Sources.getSource(db, source_id)
	if (source.date_start) return view.err('Нельзя удалить, когда идёт загрузка')
	await db.exec(`DELETE FROM sources_sources WHERE source_id = :source_id`, {source_id})
	
	Sources.recalc(db, async () => {		

		// await Consciousness.recalcEntitiesPropId(db)
		// await Consciousness.recalcMulti(db)
		// await Consciousness.recalcTexts(db)
		// await Consciousness.recalcKeyIndex(db)
		// await Consciousness.recalcRowsKeyIdRepeatIndex(db)
		await Consciousness.insertItems(db)

		// await Consciousness.recalcRepresentSheet(db)
		// await Consciousness.recalcRepresentCol(db)
		// await Consciousness.recalcRepresentRow(db)
		// await Consciousness.recalcRepresentCell(db)
		// await Consciousness.recalcRepresentCellRowKey(db)
		// await Consciousness.recalcRepresentCellSummary(db)
		// await Consciousness.recalcRepresentItemValue(db)
		// await Consciousness.recalcRepresentItemSummary(db)
		// await Consciousness.recalcRepresent(db)
		
		await Consciousness.recalcMaster(db)
		await Consciousness.recalcWinner(db)

		// await Consciousness.recalcAppear(db)
		await Consciousness.recalcRowSearch(db)
		await Consciousness.recalcItemSearch(db)
	})
	
	return view.ret('Источник удалён')
})

rest.addAction('set-source-entity-reset', ['admin','checkstart'], async view => {
	const source_id = await view.get('source_id#required')
	const db = await view.get('db')
	await db.exec(`
		UPDATE sources_sources
		SET entity_id = null
		WHERE source_id = :source_id
	`, {source_id})
	view.data.entity_id = "не определено"

	Sources.recalc(db, async () => {		

		await Consciousness.recalcEntitiesPropId(db)
		// await Consciousness.recalcMulti(db)
		// await Consciousness.recalcTexts(db)
		await Consciousness.recalcKeyIndex(db)
		await Consciousness.recalcRowsKeyIdRepeatIndex(db)
		await Consciousness.insertItems(db)

		// await Consciousness.recalcRepresentSheet(db)
		// await Consciousness.recalcRepresentCol(db)
		// await Consciousness.recalcRepresentRow(db)
		// await Consciousness.recalcRepresentCell(db)
		// await Consciousness.recalcRepresentCellRowKey(db)
		await Consciousness.recalcRepresentCellSummary_bySource(db, source_id)
		await Consciousness.recalcRepresentItemValue(db)
		await Consciousness.recalcRepresentItemSummary_bySource(db, source_id)
		await Consciousness.recalcRepresent_bySource(db, source_id)
		
		//await Consciousness.recalcMaster(db)
		await Consciousness.recalcWinner_bySource(db, source_id)

		//await Consciousness.recalcAppear(db)
		//await Consciousness.recalcRowSearch(db)
		await Consciousness.recalcItemSearch_bySource(db, source_id)
	})
	return view.ret()
})
rest.addAction('set-sheet-entity-reset', ['admin','checkstart'], async view => {
	const source_id = await view.get('source_id#required')
	const sheet_title = await view.get('sheet_title#required')

	const db = await view.get('db')
	await db.exec(`
		UPDATE sources_custom_sheets
		SET entity_id = null
		WHERE source_id = :source_id and sheet_title = :sheet_title
	`, {source_id, sheet_title})
	Sources.recalc(db, async () => {		

		await Consciousness.recalcEntitiesPropId(db)
		// await Consciousness.recalcMulti(db)
		// await Consciousness.recalcTexts(db)
		await Consciousness.recalcKeyIndex(db)
		await Consciousness.recalcRowsKeyIdRepeatIndex(db)
		await Consciousness.insertItems(db)

		// await Consciousness.recalcRepresentSheet(db)
		// await Consciousness.recalcRepresentCol(db)
		await Consciousness.recalcRepresentRow(db)
		await Consciousness.recalcRepresentCell(db)
		await Consciousness.recalcRepresentCellRowKey(db)
		await Consciousness.recalcRepresentCellSummary_bySource(db, source_id)
		await Consciousness.recalcRepresentItemValue(db)
		await Consciousness.recalcRepresentItemSummary_bySource(db, source_id)
		await Consciousness.recalcRepresent_bySource(db, source_id)
		
		//await Consciousness.recalcMaster(db)
		await Consciousness.recalcWinner_bySource(db, source_id)

		//await Consciousness.recalcAppear(db)
		//await Consciousness.recalcRowSearch(db)
		await Consciousness.recalcItemSearch_bySource(db, source_id)
	})
	return view.ret()
})
rest.addAction('set-sheet-title', ['admin','checkstart'], async view => { //Показывается кнопка если есть непривязанные настройки
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const sheet_title = await view.get('sheet_title#required')
	const title = await view.get('title#required')
	if (!title) return view.err('Укажите имя')
	if (title == sheet_title) return view.err('Укажите новое имя')
	const old = await db.col(`
		SELECT 1 
		FROM sources_custom_sheets
		WHERE source_id = :source_id and sheet_title = :title
	`, {source_id, title})
	if (old) return view.err('Для указанного имени уже есть настройки, сначало удалите их')
	await db.exec(`
		UPDATE sources_custom_sheets
		SET sheet_title = :title
		WHERE source_id = :source_id and sheet_title = :sheet_title
	`, {source_id, title, sheet_title})
	Sources.recalc(db, async () => {		

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
		await Consciousness.recalcRepresentCellSummary_bySource(db, source_id)
		await Consciousness.recalcRepresentItemValue(db)
		await Consciousness.recalcRepresentItemSummary_bySource(db, source_id)
		await Consciousness.recalcRepresent_bySource(db, source_id)
		
		//await Consciousness.recalcMaster(db)
		await Consciousness.recalcWinner_bySource(db, source_id)

		await Consciousness.recalcAppear(db)
		await Consciousness.recalcRowSearch(db)
		await Consciousness.recalcItemSearch_bySource(db, source_id)
	})
	return view.ret()
})
rest.addAction('set-sheet-entity', ['admin','checkstart'], async view => {
	const source_id = await view.get('source_id#required')
	const db = await view.get('db')
	const source = await Sources.getSource(db, source_id)
	const entity_id = await view.get('entity_id#required')
	const sheet_title = await view.get('sheet_title#required')
	
	

	//А что если есть указанные prop_id у колонок
	// const ready = await db.col(`
	// 	SELECT prop_id
	// 	FROM sources_custom_cols co
	// 	WHERE co.prop_id is not null and co.source_id = :source_id and sheet_title = :sheet_title
	// 	LIMIT 1
	// `, {source_id, sheet_title})
	// if (ready && entity_id != source.entity_id) return view.err('У колонок есть определённые свойства, нельзя изменить сущность.')

	await db.exec(`
		INSERT INTO sources_custom_sheets (source_id, sheet_title, entity_id)
   		VALUES (:source_id, :sheet_title, :entity_id)
   		ON DUPLICATE KEY UPDATE entity_id = VALUES(entity_id)
	`, {entity_id, source_id, sheet_title})
	
	//const source = await Sources.getSource(db, source_id)
	//У листа новая сущность значит все col_title будут уже другими и с другими типами
	const sheet = await Sources.getSheetByTitle(db, source_id, sheet_title)
	if (!sheet) return view.ret()
	Sources.recalc(db, async () => {		

		await Consciousness.recalcEntitiesPropId_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcMulti_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcTexts_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcKeyIndex_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRowsKeyIdRepeatIndex_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.insertItems_bySheet(db, sheet.source_id, sheet.sheet_index)

		await Consciousness.recalcRepresentSheet_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresentCol_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresentRow_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresentCell_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresentCellRowKey_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresentCellSummary_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresentItemValue_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresentItemSummary_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresent_bySheet(db, sheet.source_id, sheet.sheet_index)
		
		await Consciousness.recalcMaster_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcWinner_bySheet(db, sheet.source_id, sheet.sheet_index)

		await Consciousness.recalcAppear_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRowSearch_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcItemSearch_bySheet(db, sheet.source_id, sheet.sheet_index)
	})

	return view.ret()
})
rest.addAction('set-source-entity', ['admin','checkstart'], async view => {
	const source_id = await view.get('source_id#required')
	const entity_id = await view.get('entity_id#required')
	const db = await view.get('db')
	await db.exec(`
		UPDATE sources_sources
		SET entity_id = :entity_id
		WHERE source_id = :source_id
	`, {entity_id, source_id})
	const entity = await Sources.getProp(db, entity_id)
	view.data.entity_id = entity.prop_title
	Sources.recalc(db, async () => {		

		await Consciousness.recalcEntitiesPropId_bySource(db, source_id)
		await Consciousness.recalcMulti_bySource(db, source_id)
		await Consciousness.recalcTexts_bySource(db, source_id)
		await Consciousness.recalcKeyIndex_bySource(db, source_id)
		await Consciousness.recalcRowsKeyIdRepeatIndex_bySource(db, source_id)
		await Consciousness.insertItems_bySource(db, source_id)

		await Consciousness.recalcRepresentSheet_bySource(db, source_id)
		await Consciousness.recalcRepresentCol_bySource(db, source_id)
		await Consciousness.recalcRepresentRow_bySource(db, source_id)
		await Consciousness.recalcRepresentCell_bySource(db, source_id)
		await Consciousness.recalcRepresentCellRowKey_bySource(db, source_id)
		await Consciousness.recalcRepresentCellSummary_bySource(db, source_id)
		await Consciousness.recalcRepresentItemValue_bySource(db, source_id)
		await Consciousness.recalcRepresentItemSummary_bySource(db, source_id)
		await Consciousness.recalcRepresent_bySource(db, source_id)
		
		await Consciousness.recalcMaster_bySource(db, source_id)
		await Consciousness.recalcWinner_bySource(db, source_id)

		await Consciousness.recalcAppear_bySource(db, source_id)
		await Consciousness.recalcRowSearch_bySource(db, source_id)
		await Consciousness.recalcItemSearch_bySource(db, source_id)
	})
	return view.ret()
})


rest.addAction('set-col-prop-create', ['admin','checkstart'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const sheet_index = await view.get('sheet_index#required')
	const col_index = await view.get('col_index#required')
	const sheet = await Sources.getSheetByIndex(db, source_id, sheet_index)
	if (!sheet) return view.err('Лист не найден')
	
	const prop_title = await view.get('search')
	const prop_nick = nicked(prop_title)
	if (!prop_nick) return view.err('Требуется название')
	
	const col = await Sources.getColByIndex(db, source_id, sheet.sheet_title, col_index)
	if (!col) return view.err('Колонка не найдена')
	
	const type = await view.get('type')	|| 'text'

	col.prop_id = view.ans.prop_id = await Sources.createProp(db, prop_title, type)
	await db.exec(`
		INSERT INTO sources_custom_cols (source_id, sheet_title, col_title, prop_id)
   		VALUES (:source_id, :sheet_title, :col_title, :prop_id)
   		ON DUPLICATE KEY UPDATE prop_id = VALUES(prop_id), noprop = null
	`, col)



	//const tpl = await import('/-sources/entity.html.js')
	view.ans.value = prop_title //tpl.showProp({prop_title, prop_nick, type: 'value', prop_id})

	Sources.recalc(db, async () => {		

		await Consciousness.recalcEntitiesPropId_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcMulti_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcTexts_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcKeyIndex_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRowsKeyIdRepeatIndex_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.insertItems_bySheet(db, sheet.source_id, sheet.sheet_index)

		await Consciousness.recalcRepresentSheet_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresentCol_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresentRow_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresentCell_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresentCellRowKey_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresentCellSummary_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresentItemValue_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresentItemSummary_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresent_bySheet(db, sheet.source_id, sheet.sheet_index)
		
		await Consciousness.recalcMaster_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcWinner_bySheet(db, sheet.source_id, sheet.sheet_index)

		await Consciousness.recalcAppear_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRowSearch_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcItemSearch_bySheet(db, sheet.source_id, sheet.sheet_index)
	})

	return view.ret()
})
rest.addAction('set-col-prop', ['admin','checkstart'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const sheet_index = await view.get('sheet_index#required')
	const col_index = await view.get('col_index#required')
	const sheet = await Sources.getSheetByIndex(db, source_id, sheet_index)
	if (!sheet) return view.err('Лист не найден')
	const col = await Sources.getColByIndex(db, source_id, sheet.sheet_title, col_index)
	if (!col) return view.err('Колонка не найдена')
	col.prop_id = await view.get('prop_id#required')
	const prop = await Sources.getProp(db, col.prop_id)
	if (prop.prop_nick == col.col_nick) {
		if (col.represent_custom_col == null) {
			await db.exec(`
				DELETE FROM sources_custom_cols
				WHERE source_id = :source_id
				and col_title = :col_title
				and sheet_title = :sheet_title
			`, col)
		} else {
			await db.exec(`
				INSERT INTO sources_custom_cols (source_id, sheet_title, col_title, prop_id)
				VALUES (:source_id, :sheet_title, :col_title, null)
				ON DUPLICATE KEY UPDATE prop_id = null, noprop = null
			`, col)
		}
	} else {
		await db.exec(`
			INSERT INTO sources_custom_cols (source_id, sheet_title, col_title, prop_id)
	   		VALUES (:source_id, :sheet_title, :col_title, :prop_id)
	   		ON DUPLICATE KEY UPDATE prop_id = VALUES(prop_id), noprop = null
		`, col)
	}

	
	// const tpl = await import('/-sources/entity.html.js')
	// view.ans.value = tpl.showProp(prop)
	view.ans.value = prop.prop_title

	Sources.recalc(db, async () => {		

		await Consciousness.recalcEntitiesPropId_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcMulti_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcTexts_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcKeyIndex_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRowsKeyIdRepeatIndex_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.insertItems_bySheet(db, sheet.source_id, sheet.sheet_index)

		await Consciousness.recalcRepresentSheet_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresentCol_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresentRow_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresentCell_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresentCellRowKey_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresentCellSummary_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresentItemValue_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresentItemSummary_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresent_bySheet(db, sheet.source_id, sheet.sheet_index)
		
		await Consciousness.recalcMaster_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcWinner_bySheet(db, sheet.source_id, sheet.sheet_index)

		await Consciousness.recalcAppear_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRowSearch_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcItemSearch_bySheet(db, sheet.source_id, sheet.sheet_index)
	})
	
	return view.ret()
})
rest.addAction('set-col-prop-reset', ['admin','checkstart'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const sheet_index = await view.get('sheet_index#required')
	const col_index = await view.get('col_index#required')
	const sheet = await Sources.getSheetByIndex(db, source_id, sheet_index)
	if (!sheet) return view.err('Лист не найден')
	const col = await Sources.getColByIndex(db, source_id, sheet.sheet_title, col_index)
	if (!col) return view.err('Колонка не найдена')

	await db.exec(`
		INSERT INTO sources_custom_cols (source_id, sheet_title, col_title, prop_id, noprop)
   		VALUES (:source_id, :sheet_title, :col_title, null, b'1')
   		ON DUPLICATE KEY UPDATE prop_id = null, noprop = b'1'
	`, col)

	
	// const tpl = await import('/-sources/entity.html.js')
	// view.ans.value = tpl.showProp(prop)
	view.ans.value = 'сброшено'

	Sources.recalc(db, async () => {		

		await Consciousness.recalcEntitiesPropId_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcMulti_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcTexts_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcKeyIndex_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRowsKeyIdRepeatIndex_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.insertItems_bySheet(db, sheet.source_id, sheet.sheet_index)

		await Consciousness.recalcRepresentSheet_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresentCol_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresentRow_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresentCell_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresentCellRowKey_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresentCellSummary_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresentItemValue_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresentItemSummary_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresent_bySheet(db, sheet.source_id, sheet.sheet_index)
		
		await Consciousness.recalcMaster_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcWinner_bySheet(db, sheet.source_id, sheet.sheet_index)

		await Consciousness.recalcAppear_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRowSearch_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcItemSearch_bySheet(db, sheet.source_id, sheet.sheet_index)
	})
	
	return view.ret()
})
rest.addAction('set-prop-create', ['admin','checkstart'], async view => {
	const db = await view.get('db')
	const prop_title = await view.get('search') || await view.get('title')
	const prop_nick = nicked(prop_title)
	if (!prop_nick) return view.err('Требуется название')
	
	
	
	const prop_id = view.ans.prop_id = await Sources.createProp(db, prop_title, 'text')

	

	
	Sources.recalc(db, async () => {		

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
	})
	return view.ret()
})


rest.addAction('set-source-title', ['admin','checkstart'], async view => {

	const db = await view.get('db')
	const title = await view.get('title')
	const source_id = await view.get('source_id#required')
	const source_title = title.replace(/\.js$/, '')
	const source_nick = nicked(source_title)

	await db.exec(`
		UPDATE sources_sources
   		SET source_title = :source_title, source_nick = :source_nick
   		WHERE source_id = :source_id
	`, {source_id, source_title, source_nick})
	
	const source = await Sources.getSource(db, source_id)
	await Sources.check(db, source, view.visitor)

	return view.ret()
})

rest.addAction('set-prop-title', ['admin'], async view => {

	const db = await view.get('db')
	const prop_id = await view.get('prop_id#required')
	const prop_title = await view.get('title')
	const prop_nick = nicked(prop_title)
	const prop = await Sources.getProp(db, prop_id)
	if (prop.prop_nick != prop_nick) return view.err('Изменить можно только регистр')

	await db.exec(`
		UPDATE sources_props
   		SET 
   			prop_title = :prop_title, 
   			prop_nick = :prop_nick
   		WHERE prop_id = :prop_id
	`, {prop_id, prop_title, prop_nick})
	Sources.recalc(db, async () => {		

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
	})
	return view.ret()
})

rest.addAction('set-source-add', ['admin','checkstart'], async view => {
	
	const db = await view.get('db')
	const title = await view.get('title')
	const source_title = title.replace(/\.js$/, '')
	const source_nick = nicked(source_title)

	const source_id = view.ans.source_id = await db.insertId(`
		INSERT INTO sources_sources (source_title, source_nick)
   		VALUES (:source_title, :source_nick)
   		ON DUPLICATE KEY UPDATE source_title = VALUES(source_title), source_id = VALUES(source_id)
	`, {source_title, source_nick})
	
	const source = await Sources.getSource(db, source_id)
	await Sources.check(db, source, view.visitor)

	await Sources.reorderSources(db)
	return view.ret()
})

export default rest

