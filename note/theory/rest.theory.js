import config from "/-config"
import Rest from "/-rest"
const rest = new Rest(rest_db)

import rest_db from "/-db/rest.db.js"
rest.extra(rest_db)

import NoteDB from "/-note/NoteDB.js"




rest.addArgument('search', ['nicked'], (view, search) => {
	//if (search) view.nostore = true
	return search
})
rest.addArgument('note_id', ['int#required'])
rest.addArgument('id', ['int#required'])
rest.addArgument('next_id', ['int'])

rest.addArgument('page', async (view, name) => {
	const conf = await config('notelic')
	view.nostore = true
	if (!conf.pages[name]) return view.err('Страница не найдена', 404)
	const db = await view.get('db')
	const page = await db.fetch(`
		SELECT title, text
		FROM note_notes WHERE note_id = :note_id
	`, {note_id: conf.pages[name]})
	if (!page) return view.err('Страница не найдена', 404)
	return page
})
rest.addArgument('editor_id', ['int'])


export default rest