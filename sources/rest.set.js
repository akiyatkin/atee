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

rest.before(view => view.get('admin'))


rest.addAction('set-sources-check', async view => {
	const db = await view.get('db')
	const list = await Sources.getAll(db)
	const proms = list.map(source => Sources.check(db, source, view.visitor))
	await Promise.all(proms)
	return view.ret()
})


rest.addAction('set-source-load', async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	
	const source = await Sources.getSource(db, source_id)
	const res = await Sources.load(db, source, view.visitor)
	
	if (source.error) return view.err('Ошибка: ' + source.error)
	return view.err(`
		${words(res.count_sheets,'Загружен','Загружено','Загружено')} 
		${res.count_sheets} ${words(res.count_sheets,'лист','листа','листов')}, 
		${res.count_rows} ${words(res.count_rows,'строка','строки','строк')},
		актуальность ${date.dmy(source.date_content) || 'не указана'}
	`)
		
})


rest.addAction('set-source-check', async view => {
	const db = await view.get('db')
	const source_id = await view.get('source_id#required')
	const source = await Sources.getSource(db, source_id)
	await Sources.check(db, source, view.visitor)
	const error = source.error ? source.error + ', ' : ''
	let news
	if (source.date_load) news = source.date_mtime > source.date_load ? 'могут быть изменения, требуется загрузка' : 'изменений нет, загрузка не требуется'
	else news = 'необходимо загрузить данные'
	return view.ret(`
		Проверено, 
		${error} 
		${news}.`
	)
})

rest.addAction('set-source-exam', async view => {
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
rest.addAction('set-main-add-source', async view => {
	
	const db = await view.get('db')
	const title = await view.get('title')
	const source_title = title.replace(/\.js$/, '')


	view.ans.source_id = await db.insertId(`
		INSERT INTO sources_sources (source_title)
   		VALUES (:source_title)
   		ON DUPLICATE KEY UPDATE source_title = VALUES(source_title)
	`, {source_title})

	
	return view.ret('', 200, true)
})

export default rest

