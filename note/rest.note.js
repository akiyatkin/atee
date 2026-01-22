import config from "@atee/config"
import Rest from "@atee/rest"
import WS from "/-note/WS.js"
const rest = new Rest()

import rest_funcs from "/-rest/rest.funcs.js"
rest.extra(rest_funcs)

import rest_db from "/-db/rest.db.js"
rest.extra(rest_db)

import rest_user from "/-user/rest.user.js"
rest.extra(rest_user)

import NoteDB from "/-note/NoteDB.js"

rest.addArgument('bit', ['int'], (view, value) => {
		if (value == null) return null
		return value ? 1 : 0
})
rest.addVariable('bit#required', ['bit','required'])


rest.addFunction('accept', async (view, note_id) => {
	const db = await view.get('db')
	const user_id = await view.get('user_id')
	const r = await WS.isAccept(db, note_id, user_id)
	if (!r) return view.err('Нет доступа к ноте', 403)
	return note_id
})

rest.addArgument('note', async (view, request_note) => { //можно так note=12
	const user_id = await view.get('user_id')
	if (!request_note) return null

	const db = await view.get('db')	
	const r = request_note.split('-')
	const note_id = parseInt(r.shift())
	if (!note_id) return null

	const note = await NoteDB.getNote(db, note_id)
	if (!note) return null

	const nick = r.join('-')
	note.request_nick = nick //1-ASDFSADFASDF-ASDFASDFA

	
	const rr = await WS.isAccept(db, note_id, user_id) //будет проверен токен, но не админ
	note.accept = rr
	//if (!rr) return view.err('Нет доступа к ноте', 403)
	
	return note
})


rest.addVariable('note#required', ['note', 'required']) //Требуется админу, когда доступ не проверяется
rest.addVariable('note#view', ['note#required'], (view, note) => {
	if (!note.accept) return view.err('Нет доступа', 403)
	return note
})
rest.addVariable('note#edit', ['note#required'], (view, note) => {
	if (note.accept != 'edit') return view.err('Доступен только просмотр ноты', 403)
	return note
})


// rest.addFunction('area', async (view, note) => {
// 	if (!note) return
// 	const user = await view.get('user')
// 	const db = await view.get('db')
// 	await NoteDB.noteArea(db, note, user)
// 	return note
// })
// rest.addVariable('note#area', ['note', 'area']) //depricated
// rest.addVariable('note#area#required', ['note#required', 'area']) //depricated
// rest.addVariable('note#area#view', ['note#view', 'area']) //depricated
// rest.addVariable('note#area#edit', ['note#edit', 'area']) //depricated

rest.addVariable('area', ['note'], async (view, note) => {
	if (!note) return null
	const user = await view.get('user')
	const db = await view.get('db')
	await NoteDB.noteArea(db, note, user)
	return note
})
rest.addVariable('area#required', ['note#required', 'area']) //Требуется админу, когда доступ не проверяется
rest.addVariable('area#view', ['note#view', 'area'])
rest.addVariable('area#edit', ['note#edit', 'area'])


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