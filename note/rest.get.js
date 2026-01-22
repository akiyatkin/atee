import Rest from "@atee/rest"

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

import config from "@atee/config"

rest.addResponse('get-note-props', async (view) => {
	
	const note = await view.get('note#edit')
	const db = await view.get('db')

	view.ans.note = await NoteDB.getProps(db, note.note_id)
	Object.assign(view.ans.note, note) //Из-за специфических данных после подмены в note#required
	
 	return view.ret()
})
rest.addResponse('get-note-rev', async (view) => {
	const note = await view.get('note#edit')

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
	} else if (note.accept) {
		view.ans.title = note.title || 'Пустая заметка'
	} else {
		view.ans.title = 'Нет доступа к заметке'
	}
})
rest.addResponse('get-sitemap', async view => { 
	//Механизм, когда регистрируем страницы в конфиге, типа contacts, company.
	//Надо использовать theory и показывать так неопубликованные в теории зметки.
	//Типа в новостях написаны контакты, но в новостях не опубликованы.
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
	const page = await view.get('page') //page это имя из config.pages.contacts а получаем page:{title, text}
	return {
		nostore: true,
		status: 200,
		ext: 'html',
		data: page.text
	}
})














// rest.addResponse('get-note-footer', async (view) => {
// 	const note = await view.get('note#required')
// 	const db = await view.get('db')
	
// 	note.usercount = await db.col(`SELECT count(*) FROM note_stats where note_id = :note_id`, note)
// 	note.useronline = await db.col(`SELECT count(*) FROM note_stats where note_id = :note_id and open = 1`, note)
	
// 	view.ans.note = note

//  	return view.ret()
// })
// let maxonline = 0
// rest.addResponse('get-stat', async view => {
// 	const db = await view.get('db')
// 	const stat = {}
// 	stat.usercount = await db.col(`SELECT count(distinct user_id) FROM note_stats`)
// 	stat.useronline = await db.col(`SELECT count(distinct user_id) FROM note_stats WHERE open = 1`)
// 	stat.notecount = await db.col(`SELECT count(*) FROM note_notes WHERE title != ''`)
// 	stat.maxonline = maxonline = Math.max(stat.useronline, maxonline)

// 	view.ans.stat = stat
// 	return view.ret()
// })









// rest.addResponse('get-note-check', async view => {
// 	const note = await view.get('note')
// 	if (note && note.token != note.request_token) {
// 		view.ans.redirect = `/note/${note.note_id}-${note.token}`
// 		//json.headers['Location'] = `/note/${note.note_id}-${note.token}`
// 	}
// 	return view.ret()
// })




rest.addResponse('get-note', async (view) => {
	view.ans.note = await view.get('area#view')
 	return view.ret()
})

// rest.addResponse('get-notes', async (view) => {
// 	const db = await view.get('db')
// 	const user = await view.get('user')
// 	view.ans.user_id = user.user_id
// 	let notes = []
// 	if (user) { 
// 		notes = await db.all(`
// 			SELECT n.title, n.note_id, nn.token
// 			FROM note_stats un, note_notes n, notelic_notes nn
// 			WHERE
// 				nn.note_id = n.note_id
// 				and un.note_id = n.note_id
// 				and un.user_id = :user_id
// 			ORDER BY un.date_appointment DESC
// 		`, user)

// 		for (const note of notes) {
// 			note.usercount = await db.col(`SELECT count(*) FROM notelic_usernotes where note_id = :note_id`, note)
// 			note.useronline = await db.col(`
// 				SELECT count(*) 
// 				FROM notelic_usernotes un, note_stats ns 
// 				WHERE un.note_id = ns.user_id and un.note_id = :note_id and ns.open = 1
// 			`, note)
// 		}
// 	}
// 	view.ans.notes = notes
// })

export default rest