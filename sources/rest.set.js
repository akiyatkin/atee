import fs from "fs/promises"

import nicked from '/-nicked/nicked.js'
import unique from '/-nicked/unique.js'
import words from '/-words/words.js'
import Access from '/-controller/Access.js'
import date from '/-words/date.html.js'
import eye from "/-sources/represent.js"
import PerformanceMonitor from "./PerformanceMonitor.js"
import Sources from "/-sources/Sources.js"
import Recalc from "/-sources/Recalc.js"
import Consciousness from "/-sources/Consciousness.js"

import { whereisit } from '/-controller/whereisit.js'
const { FILE_MOD_ROOT, IMPORT_APP_ROOT } = whereisit(import.meta.url)

import Rest from "@atee/rest"
const rest = new Rest()

import rest_admin from '/-controller/rest.admin.js'
rest.extra(rest_admin)

import rest_sources from '/-sources/rest.sources.js'
rest.extra(rest_sources)

import rest_search from "/-dialog/search/rest.search.js" //аргументы hash, search 
rest.extra(rest_search)
export default rest

rest.addAction('set-recalc-publicate', ['admin','checkrecalc'], async view => {
	const db = await view.get('db')
	Recalc.recalc(async (db) => { //Чтобы подсветился процесс
		await Recalc.publicate(db) //Запустятся зарегистрированные функции в /rest.js
	})
	return view.ret()
})
// rest.addResponse('set-reset', ['admin'], async view => {	
// 	const db = await view.get('db')

// 	const res = await db.exec(`DROP TABLE IF EXISTS 
// 		${rest_sources.TABLES.join(',')}
// 	`)
	
// 	const src = FILE_MOD_ROOT + '/update.sql'
// 	const sql = await fs.readFile(src).then(buffer => buffer.toString())
// 	const sqls = sql.split(';')
	

// 	await Promise.all(sqls.map((sql,i) => {
// 		sql = sql.trim()
// 		if (!sql) return Promise.resolve()
// 		return db.exec(sql)
// 	}))
	
// 	return view.ret('База обновлена')
// })
rest.addAction('set-reset-start', ['admin'], async (view) => {
	const db = await rest.data('db') //База данных могла не перезапуститься и процесс загрузки ещё идёт
	await Recalc.reset(db)
	await db.exec(`UPDATE sources_sources SET date_start = null`)
	return view.ret()
})
rest.addAction('set-recalc', ['admin','checkrecalc'], async view => {
	const db = await view.get('db')
	//const monitor = new PerformanceMonitor()
	Recalc.recalc(async (db) => {
		await Sources.recalcAllChangesWithoutRowSearch(db)
		// await Consciousness.recalcRowSearch(db)
		// monitor.start('recalcEntitiesPropId')
		// await Consciousness.recalcEntitiesPropId(db) //11.14ms
		// monitor.start('recalcMulti')
		// await Consciousness.recalcMulti(db) //1 646.26ms // 1 494.82ms
		// monitor.start('recalcTexts')
		// await Consciousness.recalcTexts(db) //2 875.27ms
		// monitor.start('recalcKeyIndex')
		// await Consciousness.recalcKeyIndex(db) // 3.24ms
		// monitor.start('insertItems') 
		// await Consciousness.insertItems(db) // 408.64ms


		// monitor.start('recalcRepresentSheet')
		// await Consciousness.recalcRepresentSheet(db) // 0.90ms
		// monitor.start('recalcRepresentCol')
		// await Consciousness.recalcRepresentCol(db) // 3.63ms
			
		// monitor.start('recalcMaster')
		
		//await Consciousness.recalcMaster(db) // 236.70ms
		// monitor.start('recalcWinner')
		// await Consciousness.recalcWinner(db) //1 165.87ms
		

		// monitor.start('recalcAppear')
		// await Consciousness.recalcAppear(db) // 456.06ms
		// monitor.start('recalcRowSearch')
		// await Consciousness.recalcRowSearch(db)
		// monitor.start('recalcItemSearch')
		// await Consciousness.recalcItemSearch(db)

		//monitor.stop()
		//console.log(monitor.getReport())
	})
	
	return view.ret()
})

rest.addAction('set-source-prop', ['admin','checkrecalc'], async view => {
	
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
		Recalc.recalc(async (db) => {
			//await Consciousness.recalcEntitiesPropId(db)
			//await Consciousness.recalcMulti(db)
			//await Consciousness.recalcTexts_byProp(db, prop_id)
			//await Consciousness.recalcKeyIndex(db)
			//await Consciousness.insertItems(db) //insert items

			//await Consciousness.recalcRepresentSheet_bySheet(db, sheet.source_id, sheet.sheet_index)
			//await Consciousness.recalcRepresentCol(db)
			await Consciousness.recalcMaster_bySource(db, source_id)
			return

			// await Consciousness.recalcWinner_bySource(db, source_id)

			// //await Consciousness.recalcAppear(db)
			// //await Consciousness.recalcRowSearch(db) //Асинхронно расчитывается, не зависит от расчёта represent
			// await Consciousness.recalcItemSearch_bySource(db, source_id) //Асинхронно расчитывается, не зависит от расчёта represent
		}, true)
	}
	
	return view.ret()
})


rest.addAction('set-prop-prop', ['admin','checkrecalc'], async view => {
	
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
		Recalc.recalc(async (db) => {
			//await Consciousness.recalcEntitiesPropId(db)
			await Consciousness.recalcMulti_byProp(db, prop_id)
			await Consciousness.recalcTexts_byProp(db, prop_id)
			//await Consciousness.recalcKeyIndex(db)
			//await Consciousness.insertItems(db) //insert items

			//await Consciousness.recalcRepresentSheet_bySheet(db, sheet.source_id, sheet.sheet_index)
			//await Consciousness.recalcRepresentCol(db)
			await Consciousness.recalcMaster(db)
			return
			
			
			// await Consciousness.recalcWinner(db)

			// //await Consciousness.recalcAppear(db)
			// //await Consciousness.recalcRowSearch(db) //Асинхронно расчитывается, не зависит от расчёта represent
			// //await Consciousness.recalcItemSearch(db, source_id) //Асинхронно расчитывается, не зависит от расчёта represent
		}, true)
	}

	return view.ret()
})

rest.addAction('set-sheet-custom-delete', ['admin','checkrecalc'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const sheet_title = await view.get('title#required')
	
	await db.exec(`
		DELETE FROM sources_custom_sheets 
   		WHERE source_id = :source_id and sheet_title = :sheet_title
	`, {source_id, sheet_title})
	// await db.exec(`
	// 	DELETE FROM sources_custom_rows 
   	// 	WHERE source_id = :source_id and sheet_title = :sheet_title
	// `, {source_id, sheet_title})
	// await db.exec(`
	// 	DELETE FROM sources_custom_cells 
   	// 	WHERE source_id = :source_id and sheet_title = :sheet_title
	// `, {source_id, sheet_title})
	await db.exec(`
		DELETE FROM sources_custom_cols
   		WHERE source_id = :source_id and sheet_title = :sheet_title
	`, {source_id, sheet_title})

	const sheet = await Sources.getSheetByTitle(db, source_id, sheet_title)
	if (sheet) {
		Recalc.recalc(async (db) => {
			//await Consciousness.recalcEntitiesPropId(db)
			//await Consciousness.recalcMulti_byProp(db, prop_id)
			//await Consciousness.recalcTexts_byProp(db, prop_id)
			//await Consciousness.recalcKeyIndex(db)			
			//await Consciousness.insertItems(db) //insert items

			await Consciousness.recalcRepresentSheet_bySheet(db, sheet.source_id, sheet.sheet_index)
			await Consciousness.recalcRepresentCol_bySheet(db, sheet.source_id, sheet.sheet_index)
			await Consciousness.recalcMaster_bySheet(db, sheet.source_id, sheet.sheet_index)
			return
			
			
			// await Consciousness.recalcWinner_bySheet(db, sheet.source_id, sheet.sheet_index)

			// //await Consciousness.recalcAppear(db)
			// //await Consciousness.recalcRowSearch(db) //Асинхронно расчитывается, не зависит от расчёта represent
			// await Consciousness.recalcItemSearch(db, source_id) //Асинхронно расчитывается, не зависит от расчёта represent
		}, true)
	}

	return view.ret()
})


rest.addAction('set-prop-type', ['admin','checkrecalc'], async view => {
	
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

	Recalc.recalc(async (db) => {
		//await Consciousness.recalcEntitiesPropId(db)
		//await Consciousness.recalcMulti(db)
		await Consciousness.recalcTexts_byProp(db, prop_id)
		//await Consciousness.recalcKeyIndex(db)		
		//await Consciousness.insertItems(db) //insert items

		//await Consciousness.recalcRepresentSheet_bySheet(db, sheet.source_id, sheet.sheet_index)
		//await Consciousness.recalcRepresentCol(db)
		await Consciousness.recalcMaster(db)
		return
		
		
		// await Consciousness.recalcWinner(db)//await Consciousness.recalcWinner(db)

		// //await Consciousness.recalcAppear(db)
		// //await Consciousness.recalcRowSearch(db) //Асинхронно расчитывается, не зависит от расчёта represent
		// //await Consciousness.recalcItemSearch_bySheet(db, sheet.source_id, sheet.sheet_index) //Асинхронно расчитывается, не зависит от расчёта represent
	}, true)
	
	return view.ret()
})
rest.addAction('set-prop-scale', ['admin','checkrecalc'], async view => { 
	/* 
		setaccess не обязательно, всё равно надо сайт перепубликовать, чтобы новые значения применились. 
		Свойство scale изменится. Данные начнут новые доставаться на сайте. Нужно сразу перепубликовать уже с новыми значениями
	*/
	
	const db = await view.get('db')
	const prop_id = await view.get('prop_id#required') 
	const scale = await view.get('scale#required') 
	
	
	
	// const issource = await db.col(`select 1 from sources_sources where entity_id = :prop_id`, {prop_id})
	// const iscol = await db.col(`select 1 from sources_sheets where entity_id = :prop_id`, {prop_id})
	// if ((iscol || issource) && type != 'value') return view.err('Нельзя изменить тип ключевого свойства')
	const oldprop = await Sources.getProp(db, prop_id)
	await db.exec(`
		UPDATE sources_props
		SET scale = :scale
		WHERE prop_id = :prop_id
	`, {prop_id, scale})
	view.ans.scale = scale

	Recalc.recalc(async (db) => {
		//await Consciousness.recalcEntitiesPropId(db)
		//await Consciousness.recalcMulti(db)
		await Consciousness.recalcTexts_byProp(db, prop_id, oldprop)
		//await Consciousness.recalcKeyIndex(db)		
		//await Consciousness.insertItems(db) //insert items

		//await Consciousness.recalcRepresentSheet_bySheet(db, sheet.source_id, sheet.sheet_index)
		//await Consciousness.recalcRepresentCol(db)
		//await Consciousness.recalcMaster(db)
		
		return
		
		//await Consciousness.recalcWinner(db)//await Consciousness.recalcWinner(db)
		//await Consciousness.recalcAppear(db)
		//await Consciousness.recalcRowSearch(db) //Асинхронно расчитывается, не зависит от расчёта represent
		//await Consciousness.recalcItemSearch_bySheet(db, sheet.source_id, sheet.sheet_index) //Асинхронно расчитывается, не зависит от расчёта represent
	}, true)
	
	return view.ret()
})

rest.addAction('set-prop-lettercase', ['admin'], async view => {
	
	const db = await view.get('db')
	const prop_id = await view.get('prop_id#required') 
	const lettercase = await view.get('lettercase#required') 
	
	const prop = await Sources.getProp(db, prop_id)
	
	await db.exec(`
		UPDATE sources_props
		SET lettercase = :lettercase
		WHERE prop_id = :prop_id
	`, {prop_id, lettercase})
	prop.lettercase = lettercase
	view.ans.lettercase = lettercase
	
	
	Recalc.recalc(async (db) => { //Должен появится отсчёт, публикация не требуется
		if (lettercase == 'firstup') {
			await db.exec(`
				UPDATE sources_cols co, sources_cells ce, sources_values va
				SET va.value_title = CONCAT(UPPER(SUBSTRING(va.value_title, 1, 1)), LOWER(SUBSTRING(va.value_title, 2)))
				WHERE co.source_id = ce.source_id 
					and va.value_id = ce.value_id
					and co.sheet_index = ce.sheet_index 
					and co.col_index = ce.col_index
					and co.prop_id = :prop_id
			`, {prop_id})
		} else if (lettercase == 'lower') {
			await db.exec(`
				UPDATE sources_cols co, sources_cells ce, sources_values va
				SET va.value_title = LOWER(va.value_title)
				WHERE co.source_id = ce.source_id 
					and va.value_id = ce.value_id
					and co.sheet_index = ce.sheet_index 
					and co.col_index = ce.col_index
					and co.prop_id = :prop_id
			`, {prop_id})
		} else if (lettercase == 'upper') {
			await db.exec(`
				UPDATE sources_cols co, sources_cells ce, sources_values va
				SET va.value_title = UPPER(va.value_title)
				WHERE co.source_id = ce.source_id 
					and va.value_id = ce.value_id
					and co.sheet_index = ce.sheet_index 
					and co.col_index = ce.col_index
					and co.prop_id = :prop_id
			`, {prop_id})
		} else if (lettercase == 'ignore') {
			await db.exec(`
				UPDATE sources_cols co, sources_cells ce, sources_values va
				SET va.value_title = ce.text
				WHERE co.source_id = ce.source_id 
					and va.value_id = ce.value_id
					and co.sheet_index = ce.sheet_index 
					and co.col_index = ce.col_index
					and co.prop_id = :prop_id
			`, {prop_id})
		}


		Access.setAccessTime()
		// await Consciousness.recalcEntitiesPropId(db)
		// await Consciousness.recalcMulti(db)
		// await Consciousness.recalcTexts(db)
		// await Consciousness.recalcKeyIndex(db)
		// await Consciousness.insertItems(db)

		// await Consciousness.recalcRepresentSheet(db)
		// await Consciousness.recalcRepresentCol(db)
		// await Consciousness.recalcMaster(db)
		return
		
		// await Consciousness.recalcWinner(db)

		// await Consciousness.recalcAppear(db)
		// await Consciousness.recalcRowSearch(db)
		// await Consciousness.recalcItemSearch(db)
	}) //, Sources.recalcIndex индекс не требуется

	return view.ret()
})
rest.addAction('set-known', ['admin','checkrecalc'], async view => {
	
	const db = await view.get('db')
	const prop_id = await view.get('prop_id#required') 
	const known = await view.get('known#required') 
	
	const prop = await Sources.getProp(db, prop_id)
	
	await db.exec(`
		UPDATE sources_props
		SET known = :known
		WHERE prop_id = :prop_id
	`, {prop_id, known})
	prop.known = known
	view.ans.known = known
	
	Recalc.recalc(async (db) => { //Должна появится метка что требуется публикация так как копируется sources_wprops

		// await Consciousness.recalcEntitiesPropId(db)
		// await Consciousness.recalcMulti(db)
		// await Consciousness.recalcTexts(db)
		// await Consciousness.recalcKeyIndex(db)
		// await Consciousness.insertItems(db)

		// await Consciousness.recalcRepresentSheet(db)
		// await Consciousness.recalcRepresentCol(db)
		// await Consciousness.recalcMaster(db)
		return
		
		// await Consciousness.recalcWinner(db)

		// await Consciousness.recalcAppear(db)
		// await Consciousness.recalcRowSearch(db)
		// await Consciousness.recalcItemSearch(db)
	}, true)

	return view.ret()
})
const loadSources = async (db, visitor, list, callback) => {
	const mylist = list.filter(callback)
	const res = []
	for (const source of mylist) {
		const end = await Sources.load(db, source, visitor)
		//if (end) await end()
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
	const proms1 = list.filter(callback).map(source => {
		if (!source.represent_source) return
		return Sources.renovate(db, source, visitor)
	})
	await Promise.all(proms1)
	// for await (const end of proms1) {
	// 	if (!end) continue
	// 	await end()
	// }
}
rest.addAction('set-sources-check', ['admin','checkrecalc'], async view => { //setaccess нужен, только после индексации
	const db = await view.get('db')
	Recalc.recalc(async (db) => {
		await checkSourcesAll(db, view.visitor)
	}) //, Sources.recalcIndex индекс не требуется
	
	// Recalc.recalc(async (db) => {
		
	// }, true)
	return view.ret()
})
rest.addAction('set-sources-renovate', ['checkrecalc'], async view => { //Нет admin может любой выполнить | go=/shop/group/catalog
	const db = await view.get('db')
	const go = await view.get('go')

	const promise = Recalc.recalc(async (db) => {
		await renovateSourcesAll(db, view.visitor)
		await Sources.recalcAllChanges(db)
	}, !go)
	
	if (!go) return view.ret()

	console.time('set-sources-renovate')
	
	await promise
	await Recalc.publicate(db)

	console.timeEnd('set-sources-renovate')
	view.headers.Location = encodeURI(go)
	return view.ret('', 301)
})
rest.addAction('set-sources-load', ['checkrecalc'], async view => { //Нет admin может любой выполнить
	const db = await view.get('db')
	
	const promise = Recalc.recalc(async (db) => {
		await loadSourcesAll(db, view.visitor)
		await Consciousness.recalcEntitiesPropId(db)
		await Consciousness.recalcMulti(db)
		await Consciousness.recalcTexts(db)
		await Consciousness.recalcKeyIndex(db)		
		await Consciousness.insertItems(db)

		await Consciousness.recalcRepresentSheet(db)
		await Consciousness.recalcRepresentCol(db)
		await Consciousness.recalcMaster(db)
		
		// return
		// await Consciousness.recalcWinner(db)

		// await Consciousness.recalcAppear(db)
		// await Consciousness.recalcRowSearch(db)
		// await Consciousness.recalcItemSearch(db)
	}, true)
	const go = await view.get('go')
	if (!go) return view.ret()
	
	await promise
	await Recalc.publicate(db)

	view.headers.Location = encodeURI(go)
	return view.ret('', 301)
})
rest.addAction('set-source-ordain', ['admin','checkrecalc'], async view => {
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
	
	Recalc.recalc(async (db) => {
		// await Consciousness.recalcEntitiesPropId(db)
		// await Consciousness.recalcMulti(db)
		// await Consciousness.recalcTexts(db)
		// await Consciousness.recalcKeyIndex(db)		
		// await Consciousness.insertItems(db)

		// await Consciousness.recalcRepresentSheet(db)
		// await Consciousness.recalcRepresentCol(db)
		// await Consciousness.recalcMaster(db)
		return
		
		
		// await Consciousness.recalcWinner(db)

		// // Consciousness.recalcAppear(db)
		// // Consciousness.recalcRowSearch(db)
		// await Consciousness.recalcItemSearch(db)
	}, true)

	return view.ret()
})
// rest.addAction('set-entity-ordain', ['admin','checkrecalc'], async view => {
// 	const next_id = await view.get('next_id')
// 	const id = await view.get('id')
// 	const db = await view.get('db')

// 	let ordain
// 	if (!next_id) ordain = await db.col('SELECT max(ordain) FROM sources_entities') + 1
// 	if (next_id) ordain = await db.col('SELECT ordain FROM sources_entities WHERE entity_id = :next_id', {next_id}) - 1
// 	if (ordain < 0) ordain = 0
// 	await db.exec(`
// 		UPDATE sources_entities 
// 		SET ordain = :ordain 
// 		WHERE entity_id = :id
// 	`, {ordain, id})

// 	await Sources.reorderEntities(db)	
// 	//await Consequences порядок сущностей никак не влияет на выдачу data или сразу влияет если сортируется
// 	return view.ret()
// })
rest.addAction('set-prop-synonym-create', ['admin','checkrecalc'], async view => {
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



	Recalc.recalc(async (db) => {
		await Consciousness.recalcEntitiesPropId(db)
		await Consciousness.recalcMulti_byProp(db, prop_id)
		await Consciousness.recalcTexts_byProp(db, prop_id)
		await Consciousness.recalcKeyIndex(db)		
		await Consciousness.insertItems(db)

		// await Consciousness.recalcRepresentSheet(db)
		// await Consciousness.recalcRepresentCol(db)
		await Consciousness.recalcMaster(db)
		return
		
		
		// await Consciousness.recalcWinner(db)

		// await Consciousness.recalcAppear(db)
		// await Consciousness.recalcRowSearch(db)
		// await Consciousness.recalcItemSearch(db)
	}, true)


	return view.ret()
})
rest.addAction('set-prop-synonym-delete', ['admin','checkrecalc'], async view => {
	const db = await view.get('db')
	const col_nick = await view.get('col_nick#required')
	const prop_id = await view.get('prop_id#required')
	if (!col_nick) return view.err('Укажите корректное имя')
	
	await db.exec(`DELETE FROM sources_synonyms WHERE prop_id = :prop_id and col_nick = :col_nick`, {prop_id, col_nick})
	
	

	Recalc.recalc(async (db) => {
		await Consciousness.recalcEntitiesPropId(db)
		await Consciousness.recalcMulti_byProp(db, prop_id)
		await Consciousness.recalcTexts_byProp(db, prop_id)
		await Consciousness.recalcKeyIndex(db)		
		await Consciousness.insertItems(db)

		// await Consciousness.recalcRepresentSheet(db)
		// await Consciousness.recalcRepresentCol(db)
		await Consciousness.recalcMaster(db)
		return
		
		
		// await Consciousness.recalcWinner(db)

		// await Consciousness.recalcAppear(db)
		// await Consciousness.recalcRowSearch(db)
		// await Consciousness.recalcItemSearch(db)
	}, true)


	return view.ret()
})
rest.addAction('set-prop-ordain', ['admin','checkrecalc'], async view => {
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
	//await Consequences порядок свойств ничего не меняет НО требуется публикация
	Recalc.recalc(async (db) => {
		await Sources.reorderProps(db)
	}, true)
	return view.ret()
})
rest.addAction('set-reset-values', ['admin','checkrecalc'], async (view) => {
	const db = await rest.data('db')
	const conn = await db.pool.getConnection()
	try {
		// await db.exec(`DELETE FROM sources_appears`)
		// await db.exec(`DELETE FROM sources_cells`)
		// await db.exec(`DELETE FROM sources_cols`)
		// await db.exec(`DELETE FROM sources_rows`)
		// await db.exec(`DELETE FROM sources_sheets`)
		// await db.exec(`DELETE FROM sources_items`)
		// await db.exec(`DELETE FROM sources_values`)
		
		await conn.query(`SET FOREIGN_KEY_CHECKS = 0`) //truncate быстрей, но с FK не работает
		console.log('sources_appears')
		await conn.query(`TRUNCATE TABLE sources_appears`)
		console.log('sources_cells')
		await conn.query(`TRUNCATE TABLE sources_cells`)
		console.log('sources_cols')
		await conn.query(`TRUNCATE TABLE sources_cols`)
		console.log('sources_rows')
		await conn.query(`TRUNCATE TABLE sources_rows`)
		console.log('sources_sheets')
		await conn.query(`TRUNCATE TABLE sources_sheets`)
		console.log('sources_items')
		await conn.query(`TRUNCATE TABLE sources_items`)
		console.log('sources_values')
		await conn.query(`TRUNCATE TABLE sources_values`)
		await conn.query(`SET FOREIGN_KEY_CHECKS = 1`)
	} finally {
		await conn.release()
	}

	await db.exec(`
		UPDATE sources_sources
		SET date_check = null, date_content = null, date_load = null, date_mtime = null, date_msource = null, date_mrest = null
	`)
	await checkSourcesAll(db, view.visitor)
	Recalc.recalc(async (db) => {
		await Consciousness.recalcEntitiesPropId(db)
		await Consciousness.recalcMulti(db)
		await Consciousness.recalcTexts(db)
		await Consciousness.recalcKeyIndex(db)		
		await Consciousness.insertItems(db)

		await Consciousness.recalcRepresentSheet(db)
		await Consciousness.recalcRepresentCol(db)
		await Consciousness.recalcMaster(db)

		//return если очищена таблица sources_values надо сразу перепубликовать
		await Recalc.publicate(db)
		// await Consciousness.recalcWinner(db)

		// await Consciousness.recalcAppear(db)
		// await Consciousness.recalcRowSearch(db)
		// await Consciousness.recalcItemSearch(db)
	})
	
	return view.ret('Данные очищены')
})

rest.addAction('set-source-renovate', ['admin','checkrecalc'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const source = await Sources.getSource(db, source_id)
	await Sources.check(db, source, view.visitor)
	if (source.error) return view.ret('Для загрузки необходимо устранить ошибку')
	if (!source.renovate) return view.ret('Актуализация запрещена')
	if (!source.need) return view.ret(source.status)
	
	
	Recalc.recalc(async (db) => {
		await Sources.load(db, source, view.visitor)

		await Consciousness.recalcEntitiesPropId(db)
		await Consciousness.recalcMulti(db)
		await Consciousness.recalcTexts(db)
		await Consciousness.recalcKeyIndex(db)		
		await Consciousness.insertItems(db)

		await Consciousness.recalcRepresentSheet(db)
		await Consciousness.recalcRepresentCol(db)
		await Consciousness.recalcMaster(db)
		
		// return
		// await Consciousness.recalcWinner(db)

		// await Consciousness.recalcAppear(db)
		// await Consciousness.recalcRowSearch(db)
		// await Consciousness.recalcItemSearch(db)
	}, true)
	//return view.ret('Загрузка запущена!')
	return view.ret()
})

rest.addAction('set-source-load', ['admin','checkrecalc'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const source = await Sources.getSource(db, source_id)
	if (source.date_start) return view.err('Загрузка уже запущена!')

	if (!source.date_check) await Sources.check(db, source, view.visitor)
	//if (source.error) return view.err('Для загрузки необходимо устранить ошибку')
		

	Recalc.recalc(async (db) => {
		await Sources.load(db, source, view.visitor)
		
		const timer_recalc = Date.now()

		await Consciousness.recalcEntitiesPropId_bySource(db, source_id) //0 19.38ms
		await Consciousness.recalcMulti_bySource(db, source_id) //2 221.87ms
		await Consciousness.recalcTexts_bySource(db, source_id) //69 968.40ms 	= 13 805.85ms
		await Consciousness.recalcKeyIndex_bySource(db, source_id) //0 1.89ms		
		await Consciousness.insertItems_bySource(db, source_id) //0 358.99ms		

		await Consciousness.recalcRepresentSheet_bySource(db, source_id) //0 1.68ms
		await Consciousness.recalcRepresentCol_bySource(db, source_id) //0 6.08ms		
		
		await Consciousness.recalcMaster_bySource(db, source_id) //0 224.85ms

		// await Consciousness.recalcWinner_bySource(db, source_id) //40 946.25ms		
		// await Consciousness.recalcAppear_bySource(db, source_id) //0 371.52ms		
		// await Consciousness.recalcRowSearch_bySource(db, source_id)
		// await Consciousness.recalcItemSearch_bySource(db, source_id)

		source.duration_recalc = Date.now() - timer_recalc

		source.duration_load = source.duration_insert + source.duration_rest + source.duration_recalc
		await Sources.setSource(db, `
			duration_recalc = :duration_recalc,
			duration_load = :duration_load
		`, source)
	}, true)
	
	
	//return view.ret('Загрузка запущена!')
	return view.ret()	
})

rest.addAction('set-comment', ['admin'], async view => {
	const db = await view.get('db')
	const comment = await view.get('comment')
	view.ans.comment = 'Обновлено'
	await db.exec(`
		UPDATE sources_settings
		SET comment = :comment
	`, {comment})
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
	await Sources.setSource(db, `comment = :comment`, {source_id, comment})
	return view.ret()
})
rest.addAction('set-source-params', ['admin'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const comment = await view.get('comment')
	await Sources.setSource(db, `params = :comment`, {source_id, comment})
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
rest.addAction('set-source-check', ['admin','checkrecalc'], async view => {
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

rest.addAction('set-source-clear', ['admin','checkrecalc'], async view => {
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
	Recalc.recalc(async (db) => {
		//await Consciousness.recalcEntitiesPropId(db)
		//await Consciousness.recalcMulti(db)
		//await Consciousness.recalcTexts_byProp(db, prop_id)
		//await Consciousness.recalcKeyIndex(db)		
		await Consciousness.insertItems(db) //insert items

		await Consciousness.recalcRepresentSheet_bySource(db, source_id)
		await Consciousness.recalcRepresentCol_bySource(db, source_id)
		await Consciousness.recalcMaster_bySource(db, source_id)
		return
		
		
		//await Consciousness.recalcWinner_bySource(db, source_id)

		//await Consciousness.recalcAppear(db)
		//await Consciousness.recalcRowSearch_bySource(db, source_id) //Асинхронно расчитывается, не зависит от расчёта represent
		//await Consciousness.recalcItemSearch_bySource(db, source_id) //Асинхронно расчитывается, не зависит от расчёта represent
	}, true)
	
	/*
		Если удалили данные источника, значит 
		удалилась часть свойств и изменились победители
		удалились ключи надо подчистить sources_items
	*/
	return view.ret('Данные из источника удалены')
})
rest.addAction('set-prop-delete', ['admin','checkrecalc'], async view => {
	const db = await view.get('db')
	const prop_id = await view.get('prop_id#required')

	const source_title = await Sources.getSourceTitleByKeyId(db, prop_id)
	if (source_title) return view.err('Свойство указано ключевым свойством у источика ' + source_title)
	

	await db.exec(`
		DELETE pr FROM sources_props pr
   		WHERE pr.prop_id = :prop_id
	`, {prop_id})

	Recalc.recalc(async (db) => {
		await Consciousness.recalcEntitiesPropId(db) //Вместо оригинального свойства колонке может назначиться другое по синониму
		await Consciousness.recalcMulti_byProp(db, prop_id)
		await Consciousness.recalcTexts_byProp(db, prop_id)
		await Consciousness.recalcKeyIndex(db)		
		await Consciousness.insertItems(db)
		
		// await Consciousness.recalcRepresentSheet(db)
		// await Consciousness.recalcRepresentCol(db)
		await Consciousness.recalcMaster(db)
		return
		
		
		// await Consciousness.recalcWinner(db)

		// await Consciousness.recalcAppear(db)
		// await Consciousness.recalcRowSearch(db)
		// await Consciousness.recalcItemSearch(db)
	}, true)
	return view.ret()

})

rest.addAction('set-source-delete', ['admin','checkrecalc'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const source = await Sources.getSource(db, source_id)
	if (source.date_start) return view.err('Нельзя удалить, когда идёт загрузка')
	await db.exec(`DELETE FROM sources_sources WHERE source_id = :source_id`, {source_id})
	
	Recalc.recalc(async (db) => {		

		// await Consciousness.recalcEntitiesPropId(db)
		// await Consciousness.recalcMulti(db)
		// await Consciousness.recalcTexts(db)
		// await Consciousness.recalcKeyIndex(db)		
		await Consciousness.insertItems(db)
		
		// await Consciousness.recalcRepresentSheet(db)
		// await Consciousness.recalcRepresentCol(db)
		await Consciousness.recalcMaster(db)
		return
		
		
		// await Consciousness.recalcWinner(db)

		// // await Consciousness.recalcAppear(db)
		// await Consciousness.recalcRowSearch(db)
		// await Consciousness.recalcItemSearch(db)
	}, true)
	
	return view.ret('Источник удалён')
})

rest.addAction('set-source-entity-reset', ['admin','checkrecalc'], async view => {
	const source_id = await view.get('source_id#required')
	const db = await view.get('db')
	await db.exec(`
		UPDATE sources_sources
		SET entity_id = null
		WHERE source_id = :source_id
	`, {source_id})
	view.data.entity_id = "не определено"

	Recalc.recalc(async (db) => {		

		await Consciousness.recalcEntitiesPropId(db)
		// await Consciousness.recalcMulti(db)
		// await Consciousness.recalcTexts(db)
		await Consciousness.recalcKeyIndex(db)		
		await Consciousness.insertItems(db)

		// await Consciousness.recalcRepresentSheet(db)
		// await Consciousness.recalcRepresentCol(db)
		//await Consciousness.recalcMaster(db)
		return
		
		
		//await Consciousness.recalcWinner_bySource(db, source_id)

		//await Consciousness.recalcAppear(db)
		//await Consciousness.recalcRowSearch(db)
		//await Consciousness.recalcItemSearch_bySource(db, source_id)
	}, true)
	return view.ret()
})
rest.addAction('set-sheet-entity-reset', ['admin','checkrecalc'], async view => {
	const source_id = await view.get('source_id#required')
	const sheet_title = await view.get('sheet_title#required')

	const db = await view.get('db')
	await db.exec(`
		UPDATE sources_custom_sheets
		SET entity_id = null
		WHERE source_id = :source_id and sheet_title = :sheet_title
	`, {source_id, sheet_title})
	Recalc.recalc(async (db) => {		

		await Consciousness.recalcEntitiesPropId(db)
		// await Consciousness.recalcMulti(db)
		// await Consciousness.recalcTexts(db)
		await Consciousness.recalcKeyIndex(db)		
		await Consciousness.insertItems(db)

		// await Consciousness.recalcRepresentSheet(db)
		// await Consciousness.recalcRepresentCol(db)
		//await Consciousness.recalcMaster(db)
		return
		
		
		// await Consciousness.recalcWinner_bySource(db, source_id)

		//await Consciousness.recalcAppear(db)
		//await Consciousness.recalcRowSearch(db)
		// await Consciousness.recalcItemSearch_bySource(db, source_id)
	}, true)
	return view.ret()
})

rest.addAction('set-sheet-title', ['admin','checkrecalc'], async view => { //Показывается кнопка если есть непривязанные настройки
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
	Recalc.recalc(async (db) => {		

		await Consciousness.recalcEntitiesPropId(db)
		await Consciousness.recalcMulti(db)
		await Consciousness.recalcTexts(db)
		await Consciousness.recalcKeyIndex(db)		
		await Consciousness.insertItems(db)		

		await Consciousness.recalcRepresentSheet(db)
		await Consciousness.recalcRepresentCol(db)
		//await Consciousness.recalcMaster(db)
		return
		
		
		// await Consciousness.recalcWinner_bySource(db, source_id)

		// await Consciousness.recalcAppear(db)
		// await Consciousness.recalcRowSearch(db)
		// await Consciousness.recalcItemSearch_bySource(db, source_id)
	}, true)
	return view.ret()
})
rest.addAction('set-sheet-entity', ['admin','checkrecalc'], async view => {
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
	Recalc.recalc(async (db) => {		

		await Consciousness.recalcEntitiesPropId_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcMulti_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcTexts_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcKeyIndex_bySheet(db, sheet.source_id, sheet.sheet_index)		
		await Consciousness.insertItems_bySheet(db, sheet.source_id, sheet.sheet_index)		

		await Consciousness.recalcRepresentSheet_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresentCol_bySheet(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcMaster_bySheet(db, sheet.source_id, sheet.sheet_index)
		return
		
		
		// await Consciousness.recalcWinner_bySheet(db, sheet.source_id, sheet.sheet_index)

		// await Consciousness.recalcAppear_bySheet(db, sheet.source_id, sheet.sheet_index)
		// await Consciousness.recalcRowSearch_bySheet(db, sheet.source_id, sheet.sheet_index)
		// await Consciousness.recalcItemSearch_bySheet(db, sheet.source_id, sheet.sheet_index)
	}, true)

	return view.ret()
})
rest.addAction('set-source-entity', ['admin','checkrecalc'], async view => {
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
	Recalc.recalc(async (db) => {		

		await Consciousness.recalcEntitiesPropId_bySource(db, source_id)
		await Consciousness.recalcMulti_bySource(db, source_id)
		await Consciousness.recalcTexts_bySource(db, source_id)
		await Consciousness.recalcKeyIndex_bySource(db, source_id)
		await Consciousness.insertItems_bySource(db, source_id)		

		await Consciousness.recalcRepresentSheet_bySource(db, source_id)
		await Consciousness.recalcRepresentCol_bySource(db, source_id)
		await Consciousness.recalcMaster_bySource(db, source_id)
		return
		
		
		// await Consciousness.recalcWinner_bySource(db, source_id)

		// await Consciousness.recalcAppear_bySource(db, source_id)
		// await Consciousness.recalcRowSearch_bySource(db, source_id)
		// await Consciousness.recalcItemSearch_bySource(db, source_id)
	}, true)
	return view.ret()
})


rest.addAction('set-col-prop-create', ['admin','checkrecalc'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const sheet_index = await view.get('sheet_index#required')
	const col_index = await view.get('col_index#required')
	const sheet = await Sources.getSheetByIndex(db, source_id, sheet_index)
	if (!sheet) return view.err('Лист не найден')
	
	const prop_title = await view.get('query')
	const prop_nick = nicked(prop_title)
	if (!prop_nick) return view.err('Требуется название')
	
	const col = await Sources.getColByIndex(db, source_id, sheet.sheet_title, col_index)
	if (!col) return view.err('Колонка не найдена')
	
	const type = await view.get('type')	|| 'text'

	col.prop_id = view.ans.prop_id = await Sources.createProp(db, prop_title, type)
	if (!col.prop_id) return view.err('Не бывает таких длинных единиц измерений ' + prop_title)
	await db.exec(`
		INSERT INTO sources_custom_cols (source_id, sheet_title, col_title, prop_id)
   		VALUES (:source_id, :sheet_title, :col_title, :prop_id)
   		ON DUPLICATE KEY UPDATE prop_id = VALUES(prop_id), noprop = null
	`, col)



	//const tpl = await import('/-sources/entity.html.js')
	view.ans.value = prop_title //tpl.showProp({prop_title, prop_nick, type: 'value', prop_id})


	Recalc.recalc(async (db) => {		
		//Когда колонке на листе добавляется новое свойство, оно может автоматически применится к такимже колонкам на других листах
		await Consciousness.recalcEntitiesPropId_bySource(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcMulti_bySource(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcTexts_bySource(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcKeyIndex_bySource(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.insertItems_bySource(db, sheet.source_id, sheet.sheet_index)		

		await Consciousness.recalcRepresentSheet_bySource(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresentCol_bySource(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcMaster_bySource(db, sheet.source_id, sheet.sheet_index)
		return
				
		
		// await Consciousness.recalcWinner_bySource(db, sheet.source_id, sheet.sheet_index)

		// await Consciousness.recalcAppear_bySource(db, sheet.source_id, sheet.sheet_index)
		// await Consciousness.recalcRowSearch_bySource(db, sheet.source_id, sheet.sheet_index)
		// await Consciousness.recalcItemSearch_bySource(db, sheet.source_id, sheet.sheet_index)
	}, true)

	return view.ret()
})
rest.addAction('set-col-prop', ['admin','checkrecalc'], async view => {
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

	Recalc.recalc(async (db) => {
		
		await Consciousness.recalcEntitiesPropId_bySource(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcMulti_bySource(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcTexts_bySource(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcKeyIndex_bySource(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.insertItems_bySource(db, sheet.source_id, sheet.sheet_index)

		await Consciousness.recalcRepresentSheet_bySource(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresentCol_bySource(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcMaster_bySource(db, sheet.source_id, sheet.sheet_index)
		return

		
		// await Consciousness.recalcWinner_bySource(db, sheet.source_id, sheet.sheet_index)

		// await Consciousness.recalcAppear_bySource(db, sheet.source_id, sheet.sheet_index)
		// await Consciousness.recalcRowSearch_bySource(db, sheet.source_id, sheet.sheet_index)
		// await Consciousness.recalcItemSearch_bySource(db, sheet.source_id, sheet.sheet_index)
	}, true)
	
	return view.ret()
})
rest.addAction('set-col-prop-reset', ['admin','checkrecalc'], async view => {
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

	Recalc.recalc(async (db) => {		

		await Consciousness.recalcEntitiesPropId_bySource(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcMulti_bySource(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcTexts_bySource(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcKeyIndex_bySource(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.insertItems_bySource(db, sheet.source_id, sheet.sheet_index)
		

		await Consciousness.recalcRepresentSheet_bySource(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcRepresentCol_bySource(db, sheet.source_id, sheet.sheet_index)
		await Consciousness.recalcMaster_bySource(db, sheet.source_id, sheet.sheet_index)
		return
		
		
		// await Consciousness.recalcWinner_bySource(db, sheet.source_id, sheet.sheet_index)

		// await Consciousness.recalcAppear_bySource(db, sheet.source_id, sheet.sheet_index)
		// await Consciousness.recalcRowSearch_bySource(db, sheet.source_id, sheet.sheet_index)
		// await Consciousness.recalcItemSearch_bySource(db, sheet.source_id, sheet.sheet_index)
	}, true)
	
	return view.ret()
})
rest.addAction('set-prop-create', ['admin','checkrecalc'], async view => {
	const db = await view.get('db')
	const prop_title = await view.get('query') || await view.get('title')
	const prop_nick = nicked(prop_title)
	if (!prop_nick) return view.err('Требуется название')
	
	
	
	const prop_id = view.ans.prop_id = await Sources.createProp(db, prop_title, 'text')
	if (!prop_id) return view.err('Не бывает таких длинных единиц измерений ' + prop_title)
	

	
	Recalc.recalc(async (db) => {		

		await Consciousness.recalcEntitiesPropId(db)
		await Consciousness.recalcMulti(db)
		await Consciousness.recalcTexts(db)
		await Consciousness.recalcKeyIndex(db)
		await Consciousness.insertItems(db)

		await Consciousness.recalcRepresentSheet(db)
		await Consciousness.recalcRepresentCol(db)
		await Consciousness.recalcMaster(db)
		return
		
		// await Consciousness.recalcWinner(db)

		// await Consciousness.recalcAppear(db)
		// await Consciousness.recalcRowSearch(db)
		// await Consciousness.recalcItemSearch(db)
	}, true)
	return view.ret()
})


rest.addAction('set-source-title', ['admin','checkrecalc'], async view => {

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

rest.addAction('set-value-title', ['admin'], async view => {
	const db = await view.get('db')
	const value_id = await view.get('value_id#required')
	const value_title = await view.get('title')
	const value_nick = nicked(value_title)

	const value = await Sources.getValueById(db, value_id)
	if (value.value_nick != value_nick) return view.err('Изменить можно только регистр')

	view.data.title = value_title
	await db.exec(`
		UPDATE sources_values
   		SET 
   			value_title = :value_title
   		WHERE value_id = :value_id
	`, {value_id, value_title})

	Recalc.recalc(async (db) => { //Должна появится метка что требуется публикация		

		// await Consciousness.recalcEntitiesPropId(db)
		// await Consciousness.recalcMulti(db)
		// await Consciousness.recalcTexts(db)
		// await Consciousness.recalcKeyIndex(db)
		// await Consciousness.insertItems(db)

		// await Consciousness.recalcRepresentSheet(db)
		// await Consciousness.recalcRepresentCol(db)
		// await Consciousness.recalcMaster(db)
		return
		
		// await Consciousness.recalcWinner(db)

		// await Consciousness.recalcAppear(db)
		// await Consciousness.recalcRowSearch(db)
		// await Consciousness.recalcItemSearch(db)
	})
	
	return view.ret()
})
rest.addAction('set-prop-title', ['admin'], async view => {

	const db = await view.get('db')
	const prop_id = await view.get('prop_id#required')
	const prop_title = await view.get('title')
	const prop_nick = nicked(prop_title)
	const prop = await Sources.getProp(db, prop_id)
	if (prop.prop_nick != prop_nick) return view.err('Изменить можно только регистр')

	const {name, unit} = Sources.getNameUnit(prop_title)
	if (unit.lenght > 10) return view.err('Не бывает таких длинных единиц измерений ' + unit)
	await db.exec(`
		UPDATE sources_props
   		SET 
   			prop_title = :prop_title,
   			name = :name, 
   			unit = :unit
   		WHERE prop_id = :prop_id
	`, {prop_id, prop_title, name, unit})

	Recalc.recalc(async (db) => { //Должна появится метка что требуется публикация		

		// await Consciousness.recalcEntitiesPropId(db)
		// await Consciousness.recalcMulti(db)
		// await Consciousness.recalcTexts(db)
		// await Consciousness.recalcKeyIndex(db)
		// await Consciousness.insertItems(db)

		// await Consciousness.recalcRepresentSheet(db)
		// await Consciousness.recalcRepresentCol(db)
		// await Consciousness.recalcMaster(db)
		return
		
		// await Consciousness.recalcWinner(db)

		// await Consciousness.recalcAppear(db)
		// await Consciousness.recalcRowSearch(db)
		// await Consciousness.recalcItemSearch(db)
	}, true)
	
	return view.ret()
})

rest.addAction('set-source-add', ['admin','checkrecalc'], async view => {
	
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



import ImpExp from "/-sources/ImpExp.js"
rest.addResponse('set-import', ['admin'], async view => {
	const db = await view.get('db')
	const json = await view.get('json#required')
	if (!json) return view.err('Укажите данные')
		console.log('asdf')
	const msg = await ImpExp.import(db, json, rest_sources.exporttables)
	if (msg) return view.err(msg)


	Recalc.recalc(async (db) => { //Должна появится метка что требуется публикация		

		await Consciousness.recalcEntitiesPropId(db)
		await Consciousness.recalcMulti(db)
		await Consciousness.recalcTexts(db)
		await Consciousness.recalcKeyIndex(db)
		await Consciousness.insertItems(db)

		await Consciousness.recalcRepresentSheet(db)
		await Consciousness.recalcRepresentCol(db)
		await Consciousness.recalcMaster(db)
		return
		
		// await Consciousness.recalcWinner(db)

		// await Consciousness.recalcAppear(db)
		// await Consciousness.recalcRowSearch(db)
		// await Consciousness.recalcItemSearch(db)
	}, true)

	return view.ret()
})
