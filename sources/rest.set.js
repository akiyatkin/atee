import fs from "fs/promises"

import nicked from '/-nicked/nicked.js'
import unique from '/-nicked/unique.js'


import Sources from "/-sources/Sources.js"

import Rest from "/-rest"
const rest = new Rest()

import rest_admin from '/-controller/rest.admin.js'
rest.extra(rest_admin)

import rest_sources from '/-sources/rest.sources.js'
rest.extra(rest_sources)

rest.before(view => view.get('admin'))


rest.addAction('set-main-check-all', async view => {
	const db = await view.get('db')
	const list = await Sources.getAll(db)
	const proms = list.map(source => Sources.check(db, source))
	await Promise.all(proms)

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

