import Rest from "/-rest"

const rest = new Rest()
import rest_db from "/-db/rest.db.js"
rest.extra(rest_db)
import rest_user from "/-user/rest.user.js"
rest.extra(rest_user)
import rest_funcs from "/-rest/rest.funcs.js"
rest.extra(rest_funcs)
import rest_note from "/-note/rest.note.js"
rest.extra(rest_note)

// rest.addArgument('note_id', ['int#required'])
// rest.addArgument('token', ['string'])
// rest.addArgument('rev', ['int#required'])

import NoteDB from "/-note/NoteDB.js"

import config from "/-config"


rest.addResponse('get-note-props', async (view) => {
	
	const note = await view.get('note#required')
	const db = await view.get('db')

	view.ans.note = await NoteDB.getProps(db, note.note_id)
	Object.assign(view.ans.note, note) //Из-за специфических данных после подмены в note#required
	
 	return view.ret()
})
rest.addResponse('get-note-rev', async (view) => {
	const note = await view.get('note#required')

	const rev = await view.get('rev')	

	const db = await view.get('db')
	view.ans.note = await NoteDB.getPropsRev(db, note.note_id, rev)
	Object.assign(note, view.ans.note)  //Из-за специфических данных после подмены в note#required
	
 	return view.ret()
})




rest.addResponse('get-head', async view => {
	const note = await view.get('note')
	if (!note) {
		view.ans.title = 'Заметка не найдена'
	} else {
		view.ans.title = note.title || 'Пустая заметка'
	}
})
rest.addResponse('get-sitemap', async view => {
	const db = await view.get('db')
	const conf = await config('note')
	const childs = {}
	for (const page in conf.pages) {
		const note_id = conf.pages[page]
		const note = await NoteDB.getNote(db, note_id)
		const title = note.title || 'Пустая заметка'
		childs[page] = {name: title}
	}
	view.ans = {
		headings:[{
			title: 'Страницы',
			childs: childs
		}]
	}
	return view.ret()
})
rest.addResponse('get-page-head', async view => {
	const page = await view.get('page')
	view.ans.title = page.title
	return view.err()
})

rest.addResponse('get-page', async view => {
	const page = await view.get('page')
	return {
		nostore: true,
		status: 200,
		ext: 'html',
		ans: page.text
	}
})
rest.addResponse('get-admin', async (view) => {
	await view.get('manager#required')
	const db = await view.get('db')

	view.ans.notes_count = await db.col(`SELECT count(*) FROM note_notes`)
	view.ans.notes_online_count = await db.col(`SELECT count(distinct note_id) FROM note_stats WHERE open = 1`)

	view.ans.users_count = await db.col(`SELECT count(*) FROM user_users`)
	view.ans.users_online_count = await db.col(`SELECT count(distinct user_id) FROM note_stats WHERE open = 1`)
	
	return view.ret()
})

rest.addResponse('get-admin-notes', async (view) => {
	await view.get('manager#required')
	const db = await view.get('db')

	view.ans.notes = await db.all(`
		SELECT title, note_id, rev, UNIX_TIMESTAMP(date_create) as date_create FROM note_notes 
		WHERE title != ''
		ORDER BY date_create DESC
	`)
	for (const note of view.ans.notes) {
		note.useronline = await db.col(`SELECT count(*) FROM note_stats WHERE note_id = :note_id and open = 1`, note)
		note.usercount = await db.col(`SELECT count(*) FROM note_stats WHERE note_id = :note_id`, note)
	}
	
	return view.ret()
})


rest.addResponse('get-admin-note', async (view) => {
	await view.get('manager#required')
	const db = await view.get('db')
	const note_id = await view.get('note_id')
	view.ans.note = await db.fetch(`
		SELECT title, text, rev, UNIX_TIMESTAMP(date_create) as date_create
		FROM note_notes WHERE note_id = :note_id
	`, {note_id})



	view.ans.users = await db.all(`
		SELECT
			u.email,
			un.user_id, 
			UNIX_TIMESTAMP(un.date_load) as date_load,
			UNIX_TIMESTAMP(un.date_change) as date_change,
			UNIX_TIMESTAMP(un.date_cursor) as date_cursor,
			UNIX_TIMESTAMP(un.date_close) as date_close,
			UNIX_TIMESTAMP(un.date_open) as date_open,
			UNIX_TIMESTAMP(un.date_appointment) as date_appointment,
			UNIX_TIMESTAMP(un.date_focus) as date_focus,
			UNIX_TIMESTAMP(un.date_blur) as date_blur,
			un.open,
			un.focus
		FROM 
			note_stats un
			LEFT JOIN user_uemails u ON (u.user_id = un.user_id and un.ordain = 1)
		WHERE note_id = :note_id
	`, {note_id})

	
	return view.ret()
})




rest.addResponse('get-note-footer', async (view) => {
	const note = await view.get('note#required')
	const db = await view.get('db')
	
	note.usercount = await db.col(`SELECT count(*) FROM note_stats where note_id = :note_id`, note)
	note.useronline = await db.col(`SELECT count(*) FROM note_stats where note_id = :note_id and open = 1`, note)
	
	view.ans.note = note

 	return view.ret()
})
let maxonline = 0
rest.addResponse('get-stat', async view => {
	const db = await view.get('db')
	const stat = {}
	stat.usercount = await db.col(`SELECT count(distinct user_id) FROM note_stats`)
	stat.useronline = await db.col(`SELECT count(distinct user_id) FROM note_stats WHERE open = 1`)
	stat.notecount = await db.col(`SELECT count(*) FROM note_notes WHERE title != ''`)
	stat.maxonline = maxonline = Math.max(stat.useronline, maxonline)

	view.ans.stat = stat
	return view.ret()
})








rest.addResponse('get-user', async (view) => {
	const user = await view.get('user')
	const db = await view.get('db')
	if (user) {
		const more = await db.fetch("SELECT nu.hue, nn.name FROM note_users nu, notelic_users nn WHERE nn.user_id = nu.user_id and nn.user_id = :user_id", user) || {}

		user.hue = more.hue || 0
		user.name = more.name || ''
		
	}
	view.ans.user = user


	return view.ret()
})
rest.addResponse('get-note-check', async view => {
	const note = await view.get('note')
	if (note && note.token != note.request_token) {
		view.ans.redirect = `/note/${note.note_id}-${note.token}`
		//json.headers['Location'] = `/note/${note.note_id}-${note.token}`
	}
	return view.ret()
})




rest.addResponse('get-note', async (view) => {
	
	const user = await view.get('user')
	const db = await view.get('db')

	const note = await view.get('note#area')
	view.ans.note = note
	if (!note) return view.err('Заметка не найден')
	
 	return view.ret()
})

rest.addResponse('get-notes', async (view) => {
	const db = await view.get('db')
	const user = await view.get('user')
	view.ans.user_id = user.user_id
	let notes = []
	if (user) { 
		notes = await db.all(`
			SELECT n.title, n.note_id, nn.token
			FROM note_stats un, note_notes n, notelic_notes nn
			WHERE
				nn.note_id = n.note_id
				and un.note_id = n.note_id
				and un.user_id = :user_id
			ORDER BY un.date_appointment DESC
		`, user)

		for (const note of notes) {
			note.usercount = await db.col(`SELECT count(*) FROM notelic_usernotes where note_id = :note_id`, note)
			note.useronline = await db.col(`
				SELECT count(*) 
				FROM notelic_usernotes un, note_stats ns 
				WHERE un.note_id = ns.user_id and un.note_id = :note_id and ns.open = 1
			`, note)
		}
	}
	view.ans.notes = notes
})

export default rest