import User from "/-user/User.js"
import config from "@atee/config"
import Rest from "@atee/rest"
const rest = new Rest()
import rest_db from "/-db/rest.db.js"
rest.extra(rest_db)
import rest_user from "/-user/rest.user.js"
rest.extra(rest_user)
import rest_funcs from "/-rest/rest.funcs.js"
rest.extra(rest_funcs)
import rest_mail from "/-mail/rest.mail.js"
rest.extra(rest_mail)
import rest_note from "/-note/rest.note.js"
rest.extra(rest_note)
import rest_theory from "/-note/theory/rest.theory.js"
rest.extra(rest_theory)

import Theory from "/-note/theory/Theory.js"
import Mail from "@atee/mail"
import NoteDB from "/-note/NoteDB.js"
import Access from "/-controller/Access.js"

rest.addResponse('set-note-delete', async view => {
	await view.get('manager#required')
	const note_id = await view.get('note_id')
	const db = await view.get('db')
	await db.exec('DELETE FROM note_notes WHERE note_id = :note_id', {note_id})
	await db.exec('DELETE FROM theory_notes WHERE note_id = :note_id', {note_id})
	await db.exec('DELETE FROM note_stats WHERE note_id = :note_id', {note_id})
	Access.setAccessTime()
	return view.ret()
})
rest.addResponse('set-note-ordain', async view => {
	const note_id = await view.get('id')
	const next_id = await view.get('next_id')
	const db = await view.get('db')

	let ordain
	if (!next_id) ordain = await db.col('SELECT max(ordain) FROM theory_notes') + 1
	if (next_id) ordain = await db.col('SELECT max(ordain) FROM theory_notes WHERE note_id = :next_id', {next_id}) - 1

	await db.exec(`
		UPDATE theory_notes 
		SET ordain = :ordain 
		WHERE note_id = :note_id
	`, {ordain, note_id})
	Theory.reorder(db)
	Access.setAccessTime()
	return view.ret()
})

rest.addResponse('set-switch-published', async view => {
	await view.get('manager#required')
	const db = await view.get('db')
	const note_id = await view.get('note_id')
	let published = await db.col(`
		SELECT published 
		FROM theory_notes 
		WHERE note_id = :note_id
	`, {note_id})
	if (published === null) return view.err('Запись не найдена')
	published = published ? 0 : 1
	await db.exec(`
		UPDATE theory_notes 
		SET published = :published 
		WHERE note_id = :note_id
	`, {published, note_id})

	view.ans.published = published
	Access.setAccessTime()
	return view.ret()
})

rest.addResponse('set-note-create', async view => {
	const db = await view.get('db')
	await view.get('manager#required')
	let user = await view.get('user')
	// if (!user) { менеджер же обязательно должен быть
	// 	user = await User.create(db)
	// 	User.setCookie(view, user)
	// }
	//Ищем существующую пустую заметку
	let note_id = await db.col(`
		SELECT n.note_id
		FROM note_notes n, theory_notes t
		WHERE n.title = '' and t.note_id = n.note_id
		LIMIT 1
	`)
	if (!note_id) {
		note_id = await NoteDB.create(db, user.user_id, 'theory')
		await db.exec(`
			INSERT INTO theory_notes (note_id, published, ordain) 
			VALUES (:note_id, 0, 1)
		`, {note_id})
		Theory.reorder(db)
		Access.setAccessTime()
	}
	view.ans.note_id = note_id
	return view.ret()
})



rest.addResponse('set-user-hue', async view => {
	const user = await view.get('user#required')
	const db = await view.get('db')
	const hue = await view.get('hue')

	const old = await db.col('SELECT hue FROM ws_users WHERE user_id = :user_id', user)
	if (old === null) {
		await db.query(`
			INSERT INTO ws_users (user_id, hue)
			VALUES (:user_id, :hue)
		`, {user_id: user.user_id, hue})
	} else {
		await db.query(`
			UPDATE ws_users
			SET hue = :hue
			WHERE user_id = :user_id
		`, {user_id: user.user_id, hue})
	}
	return view.ret()
})

export default rest