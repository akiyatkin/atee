import fs from "fs/promises"

import nicked from '/-nicked/nicked.js'
import unique from '/-nicked/unique.js'
import words from '/-words/words.js'
import date from '/-words/date.html.js'


import Sources from "/-sources/Sources.js"

import Rest from "/-rest"
const rest = new Rest()

import rest_admin from '/-controller/rest.admin.js'
rest.extra(rest_admin)

import rest_sources from '/-sources/rest.sources.js'
rest.extra(rest_sources)

import rest_search from "/-dialog/search/rest.search.js" //аргументы hash, search 
rest.extra(rest_search)

rest.addAction('set-source-switch-prop', ['admin'], async view => {
	
	const db = await view.get('db')
	const source_id = await view.get('source_id#required') 
	const prop = await view.get('sourceprop#required')

	
	await db.exec(`
		UPDATE sources_sources
		SET ${prop} = IF(${prop},0,1)
		WHERE source_id = :source_id
	`, {source_id})

	view.ans.value = await db.col(`
		SELECT ${prop} + 0 FROM sources_sources
		WHERE source_id = :source_id
	`, {source_id})	
	
	return view.ret()
})
rest.addAction('set-entity-switch-prop', ['admin'], async view => {
	
	const db = await view.get('db')
	const entity_id = await view.get('entity_id#required') 
	const prop = await view.get('entityprop#required')

	
	await db.exec(`
		UPDATE sources_entities
		SET ${prop} = IF(${prop},0,1)
		WHERE entity_id = :entity_id
	`, {entity_id})

	view.ans.value = await db.col(`
		SELECT ${prop} + 0 FROM sources_entities
		WHERE entity_id = :entity_id
	`, {entity_id})	
	
	return view.ret()
})
rest.addAction('set-prop-switch-prop', ['admin'], async view => {
	
	const db = await view.get('db')
	const prop_id = await view.get('prop_id#required') 
	const propname = await view.get('propprop#required')
	if (propname == 'multi') {
		const value = await db.col(`
			SELECT ${propname} + 0 FROM sources_props
			WHERE prop_id = :prop_id
		`, {prop_id})

		const prop = await Sources.getProp(db, prop_id)
		const entity = await Sources.getEntity(db, prop.entity_id)
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
	
	return view.ret()
})
rest.addAction('set-custom-sheet-delete', ['admin'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const sheet_title = await view.get('title#required')
	
	
	await db.exec(`
		DELETE FROM sources_custom_sheets 
   		WHERE source_id = :source_id
   			and sheet_title = :sheet_title
	`, {source_id, sheet_title})

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

	return view.ret()
})
rest.addAction('set-inter-prop', ['admin'], async view => {
	const db = await view.get('db')
	const id = await view.get('id#required')
	const entity_master_id = await db.col('select entity_id from sources_entities where entity_id=:id', {id})
	const entity_slave_id = await view.get('entity_id#required')
	const prop_master_id = await view.get('prop_id#required')
	const prop = await Sources.getProp(db, prop_master_id)
	if (prop.type != 'value') return view.err('Тип свойства обязательно value')
	if (prop.entity_id != entity_master_id) return view.err('Подходит только свойства текущей сущности')
	
	const tpl = await import('/-sources/entity.html.js')
	view.data.value = tpl.showInterProp(prop)
	//view.data.value = prop.prop_title
	await db.exec(`
		UPDATE sources_intersections 
		SET prop_master_id = :prop_master_id
   		WHERE entity_master_id = :entity_master_id
   			and entity_slave_id = :entity_slave_id
	`, {entity_master_id, entity_slave_id, prop_master_id})

	return view.ret()
})
rest.addAction('set-entity-intersection', ['admin'], async view => {
	const db = await view.get('db')
	const id = await view.get('id#required')
	const entity_master_id = await db.col('select entity_id from sources_entities where entity_id=:id', {id})
	if (!entity_master_id) return view.err('Не найдена сущность')
	const entity_slave_id = await view.get('entity_id#required')
	const prop_master_id = await db.col(`
		SELECT prop_id
		FROM sources_props
		WHERE type = 'value' and entity_id = :entity_master_id
	`, {entity_master_id})
	if (!prop_master_id) return view.err('Требуется хотябы одно свойство value, которое можно было бы использовать для связи')
	await db.exec(`
		INSERT IGNORE INTO sources_intersections (entity_master_id, entity_slave_id, prop_master_id)
   		VALUES (:entity_master_id, :entity_slave_id, :prop_master_id)
	`, {entity_master_id, entity_slave_id, prop_master_id})
	return view.ret()
})
rest.addAction('set-prop-type', ['admin'], async view => {
	
	const db = await view.get('db')
	const prop_id = await view.get('prop_id#required') 
	const type = await view.get('type#required') 
	
	const prop = await Sources.getProp(db, prop_id)
	const entity = await Sources.getEntity(db, prop.entity_id)
	if (entity.prop_id == prop.prop_id && type != 'value') return view.err('Нельзя изменить тип ключевого свойства')
	const is_used_title = await db.col(`
		SELECT en.entity_title
		FROM sources_intersections i, sources_entities en
		where i.prop_master_id = :prop_id and i.entity_master_id = en.entity_id
	`, prop)
	if (is_used_title && type != 'value') return view.err(`Свойство определяет дополнение у ${is_used_title}, должно быть обязательно volume.`)

	await db.exec(`
		UPDATE sources_props
		SET type = :type
		WHERE prop_id = :prop_id
	`, {prop_id, type})
	
	return view.ret()
})

rest.addAction('set-sources-check', ['admin'], async view => {
	const db = await view.get('db')
	const list = await Sources.getSources(db)

	const proms1 = list.filter(source => !source.dependent).map(source => Sources.check(db, source, view.visitor))
	await Promise.all(proms1)
	const proms2 = list.filter(source => source.dependent).map(source => Sources.check(db, source, view.visitor))
	await Promise.all(proms2)

	return view.ret()
})
rest.addAction('set-sources-renovate', ['admin'], async view => {
	const db = await view.get('db')
	const list = await Sources.getSources(db)
	const proms1 = list.filter(source => !source.dependent).map(source => Sources.renovate(db, source, view.visitor))
	await Promise.all(proms1)
	const proms2 = list.filter(source => source.dependent).map(source => Sources.renovate(db, source, view.visitor))
	await Promise.all(proms2)
	return view.ret()
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
	await Sources.reorderProps(db, prop.entity_id)
	return view.ret()
})
rest.addAction('set-reset-start', async (view) => {
	const db = await rest.data('db') //База данных могла не перезапуститься и процесс загрузки ещё идёт
	await db.exec(`UPDATE sources_sources SET date_start = null`)
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
	await Sources.load(db, source, view.visitor)
	return view.ret('Загрузка запущена!')
})
rest.addAction('set-source-load', ['admin'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const source = await Sources.getSource(db, source_id)
	if (source.date_start) return view.err('Загрузка уже запущена!')

	if (!source.date_check) await Sources.check(db, source, view.visitor)
	if (source.error) return view.err('Для загрузки необходимо устранить ошибку')
	const res = Sources.load(db, source, view.visitor)
	return view.ret('Загрузка запущена!')
	//return view.ret()	
})

rest.addAction('set-prop-comment', ['admin'], async view => {
	const db = await view.get('db')
	const prop_id = await view.get('prop_id#required')
	const comment = await view.get('comment')
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
	await db.exec(`
		DELETE sh, co, ro, ce
		FROM sources_sources so
			LEFT JOIN sources_sheets sh on sh.source_id = so.source_id
			LEFT JOIN sources_cols co on co.source_id = so.source_id
			LEFT JOIN sources_rows ro on ro.source_id = so.source_id
			LEFT JOIN sources_cells ce on ce.source_id = so.source_id
   		WHERE so.source_id = :source_id
	`, {source_id})
	await db.exec(`
		UPDATE sources_sources
		SET date_check = null, date_content = null, date_load = null, date_mtime = null
		WHERE source_id = :source_id
	`, {date, source_id})

	
	await Sources.check(db, source, view.visitor)
	return view.ret('Данные из источника удалены')
})
rest.addAction('set-prop-delete', ['admin'], async view => {
	const db = await view.get('db')
	const prop_id = await view.get('prop_id#required')
	const entity_title = await db.col(`
		SELECT entity_title
		FROM sources_entities
		WHERE prop_id = :prop_id
		LIMIT 1
	`, {prop_id})
	if (entity_title) return view.err('Свойство указано ключём у сущности ' + entity_title)
	const source_title = await db.col(`
		SELECT so.source_title
		FROM sources_cols co, sources_sources so
		WHERE co.prop_id = :prop_id and co.source_id = so.source_id
		LIMIT 1
	`, {prop_id})
	if (source_title) return view.err('Свойство есть в данных источика ' + source_title)

	const intersections = await db.fetch(`
		SELECT men.entity_title, sen.entity_title
		FROM sources_intersections i, 
			sources_props mpr, 
			sources_entities men, 
			sources_entities sen
		WHERE i.prop_master_id = :prop_id
			and mpr.prop_id = i.prop_master_id
			and men.entity_id = mpr.entity_id
			and sen.entity_id = i.entity_slave_id
		LIMIT 1
	`, {prop_id})
	if (intersections) return view.err('Свойство связывает источики ' + intersections.join(' и '))

	await db.exec(`
		DELETE pr, cva
		FROM sources_props pr, sources_custom_values cva
   		WHERE pr.prop_id = :prop_id and pr.prop_id = cva.prop_id
	`, {prop_id})

	await db.exec(`
		UPDATE sources_custom_cols
		SET prop_id = null
   		WHERE prop_id = :prop_id
	`, {prop_id})
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

	
	await db.exec(`
		DELETE en, pr
		FROM sources_entities en
			LEFT JOIN sources_props pr on pr.entity_id = en.entity_id
   		WHERE en.entity_id = :entity_id
	`, {entity_id})

	return view.ret('Сущность удалена')
})
rest.addAction('set-source-delete', ['admin'], async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const source = await Sources.getSource(db, source_id)
	if (source.date_start) return view.err('Нельзя удалить, когда идёт загрузка')
	await db.exec(`
		DELETE so, csh, cco, cro, sh, co, ro, ce
		FROM sources_sources so
			LEFT JOIN sources_custom_sheets csh on csh.source_id = so.source_id
			LEFT JOIN sources_custom_cols cco on cco.source_id = so.source_id
			LEFT JOIN sources_custom_rows cro on cro.source_id = so.source_id

			LEFT JOIN sources_sheets sh on sh.source_id = so.source_id
			LEFT JOIN sources_cols co on co.source_id = so.source_id
			LEFT JOIN sources_rows ro on ro.source_id = so.source_id
			LEFT JOIN sources_cells ce on ce.source_id = so.source_id
			
   		WHERE so.source_id = :source_id
	`, {source_id})

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
	

	const tpl = await import('/-sources/entity.html.js')
	view.ans.value = tpl.showProp({})

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
	return view.ret()
})
rest.addAction('set-entity-prop-create', ['admin'], async view => {
	const db = await view.get('db')
	const entity_id = await view.get('entity_id#required')
	const prop_title = await view.get('search')
	const prop_nick = nicked(prop_title)
	if (!prop_nick) return view.err('Требуется название')

	const prop_id = view.ans.prop_id = await db.insertId(`
		INSERT INTO sources_props (entity_id, prop_title, prop_nick, type)
   		VALUES (:entity_id, :prop_title, :prop_nick, 'value')
   		ON DUPLICATE KEY UPDATE prop_title = VALUES(prop_title), prop_id = VALUES(prop_id)
	`, {entity_id, prop_title, prop_nick})

	await Sources.reorderProps(db, entity_id)

	await db.exec(`
		UPDATE sources_entities
		SET prop_id = :prop_id
		WHERE entity_id = :entity_id
	`, {prop_id, entity_id})

	const tpl = await import('/-sources/entity.html.js')
	view.ans.value = tpl.showProp({prop_title, prop_nick, type: 'value', prop_id})

	return view.ret()
})
rest.addAction('set-prop-create', ['admin'], async view => {
	const db = await view.get('db')
	const entity_id = await view.get('entity_id#required')
	const prop_title = await view.get('search')
	const prop_nick = nicked(prop_title)
	if (!prop_nick) return view.err('Требуется название')

	const prop_id = view.ans.prop_id = await db.insertId(`
		INSERT INTO sources_props (entity_id, prop_title, prop_nick, type)
   		VALUES (:entity_id, :prop_title, :prop_nick, 'value')
   		ON DUPLICATE KEY UPDATE prop_title = VALUES(prop_title), prop_id = VALUES(prop_id)
	`, {entity_id, prop_title, prop_nick})

	await Sources.reorderProps(db, entity_id)

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
   		SET prop_title = :prop_title, prop_nick = :prop_nick
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

