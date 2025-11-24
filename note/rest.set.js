import User from "/-user/User.js"
import config from "@atee/config"
import Rest from "@atee/rest"
const rest = new Rest(rest_db)
import rest_db from "/-db/rest.db.js"
rest.extra(rest_db)
import rest_user from "/-user/rest.user.js"
rest.extra(rest_user)
import rest_funcs from "/-rest/rest.funcs.js"
rest.extra(rest_funcs)
import rest_mail from "/-mail/rest.mail.js"
rest.extra(rest_mail)
import rest_note from "/-rest.note.js"
rest.extra(rest_note)

import Mail from "@atee/mail"

import NoteDB from "/-note/NoteDB.js"




rest.addResponse('set-user-hue', async view => {
	const user = await view.get('user#required')
	const db = await view.get('db')
	const hue = await view.get('hue')

	const old = await db.col('SELECT hue FROM note_users WHERE user_id = :user_id', user)
	if (old === null) {
		await db.query(`
			INSERT INTO note_users (user_id, hue)
			VALUES (:user_id, :hue)
		`, {user_id: user.user_id, hue})
	} else {
		await db.query(`
			UPDATE note_users
			SET hue = :hue
			WHERE user_id = :user_id
		`, {user_id: user.user_id, hue})
	}
	return view.ret()
})
rest.addResponse('set-create', async view => {
	const db = await view.get('db')
	let user = await view.get('user')
	if (!user) {
		user = await User.create(db)
		User.setCookie(view, user)
	}
	//Ищем существующую пустую заметку
	let note = await db.fetch(`
		SELECT nn.token, n.note_id, count(un.user_id) AS users
		FROM notelic_usernotes un, note_notes n, notelic_notes nn, notelic_usernotes un2
		WHERE 
			n.note_id = nn.note_id
			and n.note_id = un.note_id
			and un.user_id = :user_id
			and n.title = ''
			and n.note_id = un2.note_id
		GROUP BY un2.note_id
		ORDER BY users
		LIMIT 1
	`, user)
	
	if (!note || note.users > 1) {

		const limit = 10
		const limit2 = 100
		const count = await db.col(`
			SELECT count(*) FROM notelic_usernotes un
			WHERE un.user_id = :user_id
		`, user)
		if (!user.email && count > limit) return view.err('У вас больше '+limit+' заметок. Вы достигли ограничения для незарегистрированного пользорвателя. Будьте добры, удалите что-нибудь или зарегистрируйтесь. Для зарегистрированного пользователя ограничение '+limit2+' заметок.')
		if (count > limit2) return view.err('Ого, у вас больше '+limit2+' заметок. Вы достигли ограничения для зарегистрированных пользорвателей. Будьте добры, удалите что-нибудь.')


		note = {
			token: User.createToken()	
		}
		note.note_id = await NoteDB.create(db, user.user_id)
		await db.insertId(`
			INSERT INTO notelic_notes (token, note_id)
			VALUES (:token, :note_id)
		`, note)
		await db.exec(`
			INSERT INTO note_stats (note_id, user_id)
			VALUES (:note_id, :user_id)
		`, {...note, ...user})
		await db.exec(`
			INSERT INTO notelic_usernotes (note_id, user_id)
			VALUES (:note_id, :user_id)
		`, {...note, ...user})
	}
	view.ans.note = note
	return view.ret()
})

export default rest