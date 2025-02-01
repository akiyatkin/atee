import fs from "fs/promises"

import nicked from '/-nicked/nicked.js'
import unique from '/-nicked/unique.js'
import words from '/-words/words.js'
import date from '/-words/date.html.js'
import eye from "/-sources/represent.js"

import Sources from "/-sources/Sources.js"
import Consequences from "/-sources/Consequences.js"

import Rest from "/-rest"
const rest = new Rest()

import rest_admin from '/-controller/rest.admin.js'
rest.extra(rest_admin)

import rest_sources from '/-sources/rest.sources.js'
rest.extra(rest_sources)

import rest_search from "/-dialog/search/rest.search.js" //аргументы hash, search 
rest.extra(rest_search)



rest.addAction('set-source-prop', ['admin'], async view => {
	
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
	await Consequences.represent(db)
	
	return view.ret()
})


rest.addAction('set-prop-prop', ['admin'], async view => {
	
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
	
	await Consequences.all(db)

	return view.ret()
})
rest.addAction('set-prop-switch-prop', ['admin'], async view => {
	
	const db = await view.get('db')
	const prop_id = await view.get('prop_id#required') 
	const propname = await view.get('propprop#required')

	const prop = await Sources.getProp(db, prop_id)
	const entity = await Sources.getEntity(db, prop_id)
	const entity_id = prop_id
	if (propname == 'multi') {
		const value = await db.col(`
			SELECT ${propname} + 0 FROM sources_props
			WHERE prop_id = :prop_id
		`, {prop_id})
		if (entity.prop_id == prop.prop_id && !value) return view.err('Ключевое свойство может быть только с одним значением')
	}
	await db.exec(`
		UPDATE sources_props
		SET ${propname} = IF(${propname},0,1)
		WHERE prop_id = :prop_id
	`, {prop_id})

	view.ans.value = await db.col(`
		SELECT ${propname} + 0 FROM sources_props
		WHERE prop_id = :prop_id
	`, {prop_id})
	//if (propname == 'multi') return view.ret('Чтобы изменения применились необходимо заного загрузить данные из всех источников с этим свойством')
	await Consequences.changed(db, entity_id)

	return view.ret()
})
rest.addAction('set-sheet-delete', ['admin'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const sheet_title = await view.get('title#required')
	const sheet = {source_id, sheet_title}
	
	await db.exec(`
		DELETE FROM sources_custom_sheets 
   		WHERE source_id = :source_id and sheet_title = :sheet_title
	`, sheet)
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

	
	await Consequences.loaded(db, source_id)

	return view.ret()
})
rest.addAction('set-inter-delete', ['admin'], async view => {
	const db = await view.get('db')
	const id = await view.get('id#required')
	const entity_master_id = await db.col('select entity_id from sources_entities where entity_id=:id', {id})
	const entity_slave_id = await view.get('entity_id#required')	
	
	await db.exec(`
		DELETE FROM sources_intersections 
   		WHERE entity_master_id = :entity_master_id
   			and entity_slave_id = :entity_slave_id
	`, {entity_master_id, entity_slave_id})

	await Consequences.represent(db)

	return view.ret()
})

rest.addAction('set-prop-type', ['admin'], async view => {
	
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
	await Consequences.all(db)	
	return view.ret()
})
const loadSources = async (db, visitor, list, callback) => {
	const proms1 = list.filter(callback).map(source => Sources.load(db, source, visitor))
	await Promise.all(proms1)
}
const loadSourcesAll = async (db, visitor) => {
	const list = await Sources.getSources(db)
	/*
		1 независимые данные
		2 независимый прайс
		3 зависимые данные
		4 зависимый прайс
	*/
	await loadSources(db, visitor, list, source => !source.dependent && source.master)
	await loadSources(db, visitor, list, source => !source.dependent && !source.master)
	await loadSources(db, visitor, list, source => source.dependent && source.master)
	await loadSources(db, visitor, list, source => source.dependent && !source.master)
}
const checkSourcesAll = async (db, visitor) => {
	const list = await Sources.getSources(db)
	/*
		1 независимые данные
		2 независимый прайс
		3 зависимые данные
		4 зависимый прайс
	*/
	await checkSources(db, visitor, list, source => !source.dependent && source.master)
	await checkSources(db, visitor, list, source => !source.dependent && !source.master)
	await checkSources(db, visitor, list, source => source.dependent && source.master)
	await checkSources(db, visitor, list, source => source.dependent && !source.master)
}
const checkSources = async (db, visitor, list, callback) => {
	const proms1 = list.filter(callback).map(source => Sources.check(db, source, visitor))
	await Promise.all(proms1)
}
const renovateSourcesAll = async (db, visitor) => {
	const list = await Sources.getSources(db)
	await renovateSources(db, visitor, list, source => !source.dependent && source.master)
	await renovateSources(db, visitor, list, source => !source.dependent && !source.master)
	await renovateSources(db, visitor, list, source => source.dependent && source.master)
	await renovateSources(db, visitor, list, source => source.dependent && !source.master)
}
const renovateSources = async (db, visitor, list, callback) => {
	const proms1 = list.filter(callback).map(source => Sources.renovate(db, source, visitor))
	await Promise.all(proms1)
	for await (const end of proms1) {
		if (!end) continue
		await Consequences.loaded(db, end.source.source_id)
		await end()
	}
}
rest.addAction('set-sources-check', ['admin'], async view => {
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
rest.addAction('set-sources-renovate', ['admin'], async view => {
	const db = await view.get('db')
	await renovateSourcesAll(db, view.visitor)
	
	const go = await view.get('go')
	if (!go) return view.ret()
	view.headers.Location = encodeURI(go)
	return view.ret('', 301)
})
rest.addAction('set-sources-load', ['admin'], async view => {
	const db = await view.get('db')
	await loadSourcesAll(db, view.visitor)

	const go = await view.get('go')
	if (!go) return view.ret()
	view.headers.Location = encodeURI(go)
	return view.ret('', 301)
})
rest.addAction('set-source-ordain', ['admin'], async view => {
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
	
	await Consequences.represent(db)

	return view.ret()
})
rest.addAction('set-entity-ordain', ['admin'], async view => {
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
rest.addAction('set-prop-ordain', ['admin'], async view => {
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
rest.addAction('set-reset-values', async (view) => {
	const db = await rest.data('db') //База данных могла не перезапуститься и процесс загрузки ещё идёт
	
	
	await db.exec(`DELETE FROM sources_appears`)
	await db.exec(`DELETE FROM sources_cells`)
	await db.exec(`DELETE FROM sources_cols`)
	await db.exec(`DELETE FROM sources_rows`)
	await db.exec(`DELETE FROM sources_sheets`)
	await db.exec(`DELETE FROM sources_items`)
	await db.exec(`DELETE FROM sources_values`)

	await db.exec(`
		UPDATE sources_sources
		SET date_check = null, date_content = null, date_load = null, date_mtime = null
	`)
	await checkSourcesAll(db, view.visitor)
	
	return view.ret('Данные очищены')
})
rest.addAction('set-reset-start', async (view) => {
	const db = await rest.data('db') //База данных могла не перезапуститься и процесс загрузки ещё идёт
	await db.exec(`UPDATE sources_sources SET date_start = null`)
	//await Consequences если данные источника были победителями, то просто ничего не прокажется, так как старые были удалены при внесении и победителя не будет
	return view.ret()
})
rest.addAction('set-source-renovate', ['admin'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const source = await Sources.getSource(db, source_id)
	await Sources.check(db, source, view.visitor)
	if (source.error) return view.ret('Для загрузки необходимо устранить ошибку')
	if (!source.renovate) return view.ret('Актуализация запрещена')
	if (!source.need) return view.ret(source.status)
	
	Sources.load(db, source, view.visitor).then(async end => {
		await Consequences.loaded(db, source_id)
		end()
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
	if (source.error) return view.err('Для загрузки необходимо устранить ошибку')
	
	Sources.load(db, source, view.visitor).then(async end => {
		await Consequences.loaded(db, source_id)
		end()
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
rest.addAction('set-source-check', ['admin'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const source = await Sources.getSource(db, source_id)
	const ans = await Sources.check(db, source, view.visitor)
	
	// let news
	// if (source.date_load) news = source.date_mtime > source.date_load ? 'могут быть изменения, требуется загрузка' : 'изменений нет, загрузка не требуется'
	// else news = 'необходимо загрузить данные'
	return view.ret(`${source.error || source.status}<br>${ans?.msg || ''}`)
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

rest.addAction('set-source-clear', ['admin'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const source = await Sources.getSource(db, source_id)
	if (source.date_start) return view.err('Нельзя очистить, когда идёт загрузка')

	
	await db.exec(`DELETE FROM sources_cells WHERE source_id = :source_id`, source)
	await db.exec(`DELETE FROM sources_cols WHERE source_id = :source_id`, source)
	await db.exec(`DELETE FROM sources_rows WHERE source_id = :source_id`, source)

	await db.exec(`
		UPDATE sources_sources
		SET date_check = null, date_content = null, date_load = null, date_mtime = null
		WHERE source_id = :source_id
	`, {source_id})
	await Sources.check(db, source, view.visitor)
	await Consequences.loaded(db, source_id)
	await db.exec(`DELETE FROM sources_sheets WHERE source_id = :source_id`, source)
	/*
		Если удалили данные источника, значит 
		удалилась часть свойств и изменились победители
		удалились ключи надо подчистить sources_items
	*/
	return view.ret('Данные из источника удалены')
})
rest.addAction('set-prop-delete', ['admin'], async view => {
	const db = await view.get('db')
	const prop_id = await view.get('prop_id#required')

	const source_title = await Sources.getSourceTitleByPropId(db, prop_id)
	if (source_title) return view.err('Свойство указано ключевым свойством у источика ' + source_title)
	

	await db.exec(`
		DELETE pr FROM sources_props pr
   		WHERE pr.prop_id = :prop_id
	`, {prop_id})

	//await Consequences удаляется свойство, которое нигде не используется
	return view.ret()

})
rest.addAction('set-entity-delete', ['admin'], async view => {
	const db = await view.get('db')
	const entity_id = await view.get('entity_id#required')
	const is_sources = await db.col(`
		SELECT source_id 
		FROM sources_sources 
		WHERE entity_id = :entity_id 
		LIMIT 1
	`, {entity_id})
	if (is_sources) return view.err('Есть источники с этой сущностью')

	const is_sheets = await db.col(`
		SELECT source_id 
		FROM sources_custom_sheets 
		WHERE entity_id = :entity_id 
		LIMIT 1
	`, {entity_id})
	if (is_sheets) return view.err('Есть листы с этой сущностью')

	const is_intersections = await db.col(`
		SELECT count(*) 
		FROM sources_intersections
		WHERE entity_master_id = :entity_id or entity_slave_id = :entity_id
		LIMIT 1
	`, {entity_id})
	if (is_intersections) return view.err('Есть листы с этой сущностью')

	await db.exec(`DELETE FROM sources_entities WHERE entity_id = :entity_id`, {entity_id})
	await db.exec(`DELETE FROM sources_props WHERE entity_id = :entity_id`, {entity_id})
	await db.exec(`DELETE FROM sources_custom_values WHERE entity_id = :entity_id`, {entity_id})
	await db.exec(`DELETE FROM sources_appears WHERE entity_id = :entity_id`, {entity_id})

	//await Consequences сущность удаляется если её нет, пересчитывать нечего
	return view.ret('Сущность удалена')
})
rest.addAction('set-source-delete', ['admin'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const source = await Sources.getSource(db, source_id)
	if (source.date_start) return view.err('Нельзя удалить, когда идёт загрузка')
	await db.exec(`DELETE FROM sources_sources WHERE source_id = :source_id`, {source_id})
	
	await Consequences.represent(db)
	
	return view.ret('Источник удалён')
})
rest.addAction('set-entity-prop-reset', ['admin'], async view => {
	const entity_id = await view.get('entity_id#required')
	const db = await view.get('db')
	await db.exec(`
		UPDATE sources_entities
		SET prop_id = null
		WHERE entity_id = :entity_id
	`, {entity_id})
	

	//const tpl = await import('/-sources/entity.html.js')
	view.ans.value = 'не назначено'//tpl.showProp({})
	await Consequences.changed(db, entity_id)
	return view.ret()
})
rest.addAction('set-source-entity-reset', ['admin'], async view => {
	const source_id = await view.get('source_id#required')
	const db = await view.get('db')
	await db.exec(`
		UPDATE sources_sources
		SET entity_id = null
		WHERE source_id = :source_id
	`, {source_id})

	await Consequences.loaded(db, source_id)
	return view.ret()
})
rest.addAction('set-sheet-entity-reset', ['admin'], async view => {
	const source_id = await view.get('source_id#required')
	const db = await view.get('db')
	await db.exec(`
		UPDATE sources_custom_sheets
		SET entity_id = null
		WHERE source_id = :source_id
	`, {source_id})
	await Consequences.loaded(db, source_id)
	return view.ret()
})
rest.addAction('set-sheet-title', ['admin'], async view => { //Показывается кнопка если есть непривязанные настройки
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
	await Consequences.loaded(db, source_id)
	return view.ret()
})
rest.addAction('set-sheet-entity', ['admin'], async view => {
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

	await Consequences.loaded(db, source_id) //entity_id, prop_id

	return view.ret()
})
rest.addAction('set-source-entity', ['admin'], async view => {
	const source_id = await view.get('source_id#required')
	const entity_id = await view.get('entity_id#required')
	const db = await view.get('db')
	await db.exec(`
		UPDATE sources_sources
		SET entity_id = :entity_id
		WHERE source_id = :source_id
	`, {entity_id, source_id})
	await Consequences.loaded(db, source_id)
	return view.ret()
})
rest.addAction('set-source-entity-create', ['admin'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id')
	const entity_title = await view.get('search')
	const entity_nick = nicked(entity_title)

	const entity_id = view.ans.entity_id = await db.insertId(`
		INSERT INTO sources_entities (entity_title, entity_nick)
   		VALUES (:entity_title, :entity_nick)
   		ON DUPLICATE KEY UPDATE entity_title = VALUES(entity_title), entity_id = VALUES(entity_id)
	`, {entity_title, entity_nick})

	await Sources.reorderEntities(db)

	
	await db.exec(`
		UPDATE sources_sources
		SET entity_id = :entity_id
		WHERE source_id = :source_id
	`, {entity_id, source_id})
	

	await Consequences.loaded(db, source_id)
	return view.ret()
})
rest.addAction('set-sheet-entity-create', ['admin'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id')
	const entity_title = await view.get('search')
	const entity_nick = nicked(entity_title)

	const entity_id = view.ans.entity_id = await db.insertId(`
		INSERT INTO sources_entities (entity_title, entity_nick)
   		VALUES (:entity_title, :entity_nick)
   		ON DUPLICATE KEY UPDATE entity_title = VALUES(entity_title), entity_id = VALUES(entity_id)
	`, {entity_title, entity_nick})

	await Sources.reorderEntities(db)

	await db.exec(`
		UPDATE sources_custom_sheets
		SET entity_id = :entity_id
		WHERE source_id = :source_id
	`, {entity_id, source_id})
	await Consequences.loaded(db, source_id)
	return view.ret()
})
rest.addAction('set-entity-prop', ['admin'], async view => {
	const db = await view.get('db')
	const entity_id = await view.get('entity_id#required')
	const prop_id = await view.get('prop_id#required')
	const prop = await Sources.getProp(db, prop_id)
	if (prop.type != 'value') return view.err('Тип свойства для ключа может быть только value')
	if (prop.multi) return view.err('Ключевое свойство может быть только с одним значением, выбрано свойство которое может быть с несколькими значениями.')
	await db.exec(`
		UPDATE sources_entities
		SET prop_id = :prop_id
		WHERE entity_id = :entity_id
	`, {entity_id, prop_id})

	
	// const tpl = await import('/-sources/entity.html.js')
	// view.ans.value = tpl.showProp(prop)
	view.ans.value = prop.prop_title
	await Consequences.changed(db, entity_id)
	
	return view.ret()
})

rest.addAction('set-col-prop-create', ['admin'], async view => {
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
	
	
	col.prop_id = view.ans.prop_id = await Sources.createProp(db, prop_title, 'text')


	await db.exec(`
		INSERT INTO sources_custom_cols (source_id, sheet_title, col_title, prop_id)
   		VALUES (:source_id, :sheet_title, :col_title, :prop_id)
   		ON DUPLICATE KEY UPDATE prop_id = VALUES(prop_id), noprop = null
	`, col)



	//const tpl = await import('/-sources/entity.html.js')
	view.ans.value = prop_title //tpl.showProp({prop_title, prop_nick, type: 'value', prop_id})
	await Consequences.loaded(db, source_id)
	return view.ret()
})
rest.addAction('set-col-prop', ['admin'], async view => {
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

	await Consequences.loaded(db, source_id)
	
	return view.ret()
})
rest.addAction('set-col-prop-reset', ['admin'], async view => {
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

	await Consequences.loaded(db, source_id)
	
	return view.ret()
})
rest.addAction('set-prop-create', ['admin'], async view => {
	const db = await view.get('db')
	const prop_title = await view.get('search') || await view.get('title')
	const prop_nick = nicked(prop_title)
	if (!prop_nick) return view.err('Требуется название')
	
	
	
	const prop_id = view.ans.prop_id = await Sources.createProp(db, prop_title, 'text')

	

	
	//await Consequences.changed(db, entity_id) у созданного свойства нет источников и данных, так как у данных всегда свойства уже есть
	return view.ret()
})


rest.addAction('set-source-title', ['admin'], async view => {

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
rest.addAction('set-entity-title', ['admin'], async view => {

	const db = await view.get('db')
	const title = await view.get('title')
	const entity_id = await view.get('entity_id#required')
	const entity_title = title.replace(/\.js$/, '')
	const entity_nick = nicked(entity_title)

	await db.exec(`
		UPDATE sources_entities
   		SET entity_title = :entity_title, entity_nick = :entity_nick
   		WHERE entity_id = :entity_id
	`, {entity_id, entity_title, entity_nick})

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

	return view.ret()
})
rest.addAction('set-entity-plural', ['admin'], async view => {

	const db = await view.get('db')
	const title = await view.get('title')
	const entity_id = await view.get('entity_id#required')
	const entity_plural = title.replace(/\.js$/, '')	

	await db.exec(`
		UPDATE sources_entities
   		SET entity_plural = :entity_plural
   		WHERE entity_id = :entity_id
	`, {entity_id, entity_plural})

	return view.ret()
})
rest.addAction('set-entity-add', ['admin'], async view => {
	const db = await view.get('db')
	const title = await view.get('title')
	const entity_title = title.replace(/\.js$/, '')
	const entity_nick = nicked(entity_title)
	const entity_plural = entity_title

	const entity_id = view.ans.entity_id = await db.insertId(`
		INSERT INTO sources_entities (entity_title, entity_nick, entity_plural)
   		VALUES (:entity_title, :entity_nick, :entity_plural)
   		ON DUPLICATE KEY UPDATE entity_title = VALUES(entity_title), entity_id = VALUES(entity_id)
	`, {entity_title, entity_nick, entity_plural})
	
	await Sources.reorderEntities(db)
	return view.ret()
})
rest.addAction('set-source-add', ['admin'], async view => {
	
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

