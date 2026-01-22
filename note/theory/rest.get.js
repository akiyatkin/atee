import Rest from "@atee/rest"

const rest = new Rest()
import rest_db from "/-db/rest.db.js"
rest.extra(rest_db)
import rest_user from "/-user/rest.user.js"
rest.extra(rest_user)
import rest_funcs from "/-rest/rest.funcs.js"
rest.extra(rest_funcs)
import rest_theory from "/-note/theory/rest.theory.js"
rest.extra(rest_theory)

import rest_search from "/-dialog/search/rest.search.js"
rest.extra(rest_search)

import rest_note from "/-note/rest.note.js"
rest.extra(rest_note)

import User from "/-user/User.js"

// rest.addArgument('note_id', ['int#required'])
// rest.addArgument('token', ['string'])
// rest.addArgument('rev', ['int#required'])

import unique from "/-nicked/unique.js"
import Access from "/-controller/Access.js"

import NoteDB from "/-note/NoteDB.js"

import config from "@atee/config"



rest.addResponse('get-note-all', async view => {
	await view.get('manager#required')
	const db = await view.get('db')
	view.ans.list = await db.colAll(`
		SELECT text
		FROM note_notes
	`)
	return view.ret()
})



rest.addResponse('get-control', async (view) => {
	const user = await view.get('user#required')
	const note = await view.get('note#required')
	delete note.text
	view.ans.note = note
	view.ans.user = user
	return view.ret()
})



rest.addResponse('get-note-page', async (view) => {

	const note = await view.get('note#required')
	const db = await view.get('db')
	const theory = await db.fetch('SELECT note_id, published, ordain FROM theory_notes WHERE note_id = :note_id', note)
	

	note.next = await db.fetch(`
		SELECT nn.note_id, nn.nick, nn.title
		FROM theory_notes tn
			LEFT JOIN note_notes nn on nn.note_id = tn.note_id
		WHERE tn.ordain > :ordain and tn.published = 1
		ORDER BY tn.ordain 
		LIMIT 1
	`, {...note, ...theory})
	note.prev = await db.fetch(`
		SELECT nn.note_id, nn.nick, nn.title
		FROM theory_notes tn
			LEFT JOIN note_notes nn on nn.note_id = tn.note_id
		WHERE tn.ordain < :ordain and tn.published = 1
		ORDER BY tn.ordain DESC
		LIMIT 1
	`, {...note, ...theory})


	view.ans.note = note
	return view.ret()
})




rest.addResponse('get-note-edit', async (view) => {
	const manager = await view.get('manager#required')
	let note = await view.get('note#required')
	setTimeout(() => Access.setAccessTime(), 5000)
	const user = await view.get('user#required')
	const db = await view.get('db')
	await NoteDB.noteArea(db, note, user)
	view.ans.note = note
	return view.ret()
})


rest.addResponse('get-search', async view => {
	const db = await view.get('db')
	const manager = await view.get('manager')
	const hashs = await view.get('hashs')

	

	const where = ['n.note_id = t.note_id']
	if (hashs.length) {
		//where.push(`n.search like "% ${hashs.join('%" and n.search like "% ')}%"`)
		where.push(`(${hashs.map(hash => 'n.search like "%' + hash.join('%" and n.search like "%') + '%"').join(' or ') || '1 = 1'})`)
	}
	if (!manager) {
		where.push('t.published = 1')
	}
	view.ans.list = await db.all(`
		SELECT n.note_id, n.nick, n.title, t.published, t.ordain, UNIX_TIMESTAMP(date_edit) as date_edit
		FROM note_notes n, theory_notes t
		WHERE ${where.join(' and ')}
		ORDER BY t.ordain
	`)

	return view.ret()
})

rest.addResponse('get-sitemap', async view => {
	const db = await view.get('db')
	const list = await db.all(`
		SELECT n.note_id, n.nick, n.title
		FROM note_notes n, theory_notes t
		WHERE n.note_id = t.note_id and t.published = 1 and n.nick != ''
		ORDER BY t.ordain
	`)
	const childs = {}
	for (const row of list) {
		childs[row.note_id + '-' + row.nick] = {
			name: row.title
		}
	}
	view.ans.headings = []	
	view.ans.headings.push({
		title:'Философия сотрудничества',
		childs:childs
	})
	
	return view.ret()
})
rest.addResponse('get-head', async view => {
	const note = await view.get('note#required')
	if (!note) {
		view.ans.title = 'Заметка не найдена'
	} else {
		view.ans.title = note.title || 'Пустая заметка'
	}
})
rest.addResponse('get-page-sitemap', async view => {
	const db = await view.get('db')
	const conf = await config('notelic')
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
	return view.ret()
})

rest.addResponse('get-page', async view => {
	const page = await view.get('page')
	return {
		nostore: true,
		status: 200,
		ext: 'html',
		data: page.text
	}
})




rest.addResponse('get-note-check', async view => {
	const note = await view.get('note')
	const nick = note.nick || 'empty'
	if (nick != note.request_nick) {
		view.ans.redirect = `/theory/note/${note.note_id}-${nick}`
	}
	return view.ret()
})


// rest.addResponse('get-note', async (view) => {
// 	const note = await view.get('note#area')
// 	const user = await view.get('user')
// 	if (!note) return view.err('Заметка не найден')
// 	const db = await view.get('db')
// 	//view.ans.note2 = await NoteDB.getNoteArea(db, 71, user)
// 	view.ans.note = note
//  	return view.ret()
// })

export default rest