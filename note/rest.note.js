import config from "/-config"
import Rest from "/-rest"
const rest = new Rest(rest_db)
import rest_db from "/-db/rest.db.js"

import NoteDB from "/-note/NoteDB.js"

rest.extra(rest_db)



rest.addArgument('note_id', ['int'])

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


rest.addArgument('note', async (view, note) => {
	view.nostore = true
	if (!note) return false
	const db = await view.get('db')
	const r = note.split('-')
	const note_id = Number(r[0])
	if (!note_id) return false
	const real = await NoteDB.getNote(db, note_id)
	real.token = await db.col('SELECT token FROM notelic_notes WHERE note_id = :note_id', {note_id})
	const token = r[1] || ''
	if (!real) return false
	real.request_token = token
	if (real.token == token) return real
	const user_id = await view.get('user_id')
	if (!user_id) return false
	const access = await db.col('SELECT user_id FROM note_usernotes WHERE note_id = :note_id and user_id = :user_id', {user_id, note_id})
	if (!access) return false
	
	return real
})
rest.addVariable('note#area', async (view) => {
	const note = await view.get('note')
	const user = await view.get('user')
	const db = await view.get('db')
	const real = await NoteDB.getNoteArea(db, note.note_id, user)
	return real
})

rest.addArgument('hue', ['int'])

rest.addVariable('note#required', async (view) => {
	const note = await view.get('note')
	if (!note) return view.err('Заметка не найдена')
	return note
})

export default rest