import config from "/-config"
import Rest from "/-rest"
const rest = new Rest()

import rest_funcs from "/-rest/rest.funcs.js"
rest.extra(rest_funcs)

import rest_db from "/-db/rest.db.js"
rest.extra(rest_db)

import rest_user from "/-user/rest.user.js"
rest.extra(rest_user)

import NoteDB from "/-note/NoteDB.js"



rest.addFunction('accept', async (view, note_id) => {
	const db = await view.get('db')
	const user_id = await view.get('user_id')
	const r = await WS.isAccept(db, note_id, user_id)
	if (!r) return view.err('Нет доступа к ноте', 403)
	return note_id
})

rest.addArgument('note', async (view, note) => {
	view.nostore = true
	if (!note) return null
	const db = await view.get('db')
	const r = note.split('-')
	const note_id = parseInt(r.shift())
	if (!note_id) return null
	
	const real = await NoteDB.getNote(db, note_id)
	if (!real) return null

	const nick = r.join('-')
	real.request_nick = nick

	const user_id = await view.get('user_id')
	const rr = await WS.isAccept(db, note_id, user_id)
	if (!rr) return view.err('Нет доступа к ноте', 403)
	
	return real
})
rest.addFunction('area', async (view, note) => {
	if (!note) return
	const user = await view.get('user')
	const db = await view.get('db')
	const real = await NoteDB.getNoteArea(db, note.note_id, user)
	return real
})

rest.addVariable('note#required', ['note', 'required'])
rest.addVariable('note#area', ['note', 'area'])
rest.addVariable('note#area#required', ['note', 'area', 'required'])


rest.addArgument('id', ['int#required'])
rest.addArgument('next_id', ['int'])

rest.addArgument('note_id', ['int','unsigned'])
rest.addVariable('note_id#accept', ['note_id','accept'])

rest.addArgument('page', async (view, name) => {
	const conf = await config('note')

	if (!conf.pages[name]) return view.err('Страница не найдена', 404)
	const db = await view.get('db')
	const page = await db.fetch(`
		SELECT title, text
		FROM note_notes WHERE note_id = :note_id
	`, {note_id: conf.pages[name]})
	if (!page) return view.err('Страница не найдена', 404)
	return page
})
rest.addArgument('hue', ['int'])

rest.addArgument('rev', ['int'])

export default rest