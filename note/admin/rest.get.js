import NoteDB from "/-note/NoteDB.js"
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

import rest_search from "/-dialog/search/rest.search.js" //аргументы hash, search 
rest.extra(rest_search)

import rest_admin from "/-note/admin/rest.admin.js"
rest.extra(rest_admin)

export default rest


// rest.addResponse('get-admin', async (view) => {
// 	await view.get('manager#required')
// 	const db = await view.get('db')

// 	view.ans.notes_count = await db.col(`SELECT count(*) FROM note_notes`)
// 	view.ans.notes_online_count = await db.col(`SELECT count(distinct note_id) FROM note_stats WHERE open = 1`)

// 	view.ans.users_count = await db.col(`SELECT count(*) FROM user_users`)
// 	view.ans.users_online_count = await db.col(`SELECT count(distinct user_id) FROM note_stats WHERE open = 1`)
	
// 	return view.ret()
// })

rest.addResponse('get-admin', async (view) => {
	await view.get('manager#required')
	const db = await view.get('db')

	view.data.notes_count = await db.col(`SELECT count(*) FROM note_notes`)
	view.data.notes_online_count = await db.col(`SELECT count(distinct note_id) FROM note_stats WHERE open = 1`)

	view.data.notes_count = await db.col(`SELECT count(*) FROM note_notes WHERE title != ''`)
	view.data.notes_month_count = await db.col(`SELECT count(*) FROM note_notes WHERE title != '' and date_edit BETWEEN NOW() - INTERVAL 30 DAY AND NOW()`)

	view.data.users_count = await db.col(`SELECT count(*) FROM user_users`)
	view.data.users_online_count = await db.col(`SELECT count(distinct user_id) FROM note_stats WHERE open = 1`)


	view.data.editors_24_count = await db.col(`SELECT count(distinct user_id) FROM note_stats WHERE date_change BETWEEN NOW() - INTERVAL 24 HOUR AND NOW()`)

	view.data.editors_old24_count = await db.col(`
		SELECT count(distinct s.user_id) 
		FROM note_stats s
			LEFT JOIN user_users u on (u.user_id = s.user_id)
		WHERE s.date_change BETWEEN NOW() - INTERVAL 24 HOUR AND NOW()
		and u.date_create < NOW() - INTERVAL 24 HOUR
	`)
	
	view.data.notes_24_count = await db.col(`SELECT count(*) FROM note_notes WHERE title != '' and date_edit BETWEEN NOW() - INTERVAL 24 HOUR AND NOW()`)

	
	return view.ret()
})
rest.addResponse('get-admin-notes', async (view) => {
	await view.get('manager#required')
	const db = await view.get('db')

	view.data.endorsements = await db.colAll(`select distinct endorsement from note_notes`)
	return view.ret()
})
rest.addResponse('get-admin-notes-list', async (view) => {
	await view.get('manager#required')
	const db = await view.get('db')
	const endorsement = await view.get('endorsement')
	const hashs = await view.get('hashs')


	if (endorsement) {
		view.data.notes = await db.all(`
			SELECT 
				n.title, n.note_id, n.rev, 
				SUM(s.open) as useronline, 
				COUNT(CASE WHEN s.accept = 'edit' THEN s.user_id END) as editors,
	    		COUNT(CASE WHEN s.accept = 'view' THEN s.user_id END) as viewers,
				COUNT(s.user_id) as usercount,
				UNIX_TIMESTAMP(n.date_create) as date_create,
				UNIX_TIMESTAMP(n.date_edit) as date_edit 
			FROM note_notes n
			LEFT JOIN note_stats s on s.note_id = n.note_id
			WHERE n.title != '' 
				and n.endorsement = :endorsement
				and (${hashs.map(hash => 'n.search like "%' + hash.join('%" and n.search like "%') + '%"').join(' or ') || '1 = 1'})
			GROUP BY n.note_id
			ORDER BY n.date_edit DESC
			LIMIT 0, 200
		`, {endorsement})
	} else {
		view.data.notes = await db.all(`
			SELECT 
				n.title, n.note_id, n.rev, 
				SUM(s.open) as useronline, 
				COUNT(CASE WHEN s.accept = 'edit' THEN s.user_id END) as editors,
	    		COUNT(CASE WHEN s.accept = 'view' THEN s.user_id END) as viewers,
				COUNT(s.user_id) as usercount,
				UNIX_TIMESTAMP(n.date_create) as date_create,
				UNIX_TIMESTAMP(n.date_edit) as date_edit 
			FROM note_notes n
			LEFT JOIN note_stats s on s.note_id = n.note_id
			WHERE n.title != ''
			GROUP BY n.note_id
			ORDER BY n.date_edit DESC
			LIMIT 0, 200
		`)
	}
	
	return view.ret()
})

rest.addResponse('get-admin-history', async view => {
	await view.get('manager#required')
	const db = await view.get('db')
	const note_id = await view.get('note_id')

	view.data.note = await NoteDB.getPropsNote(db, note_id)

	return view.ret()
})
rest.addResponse('get-admin-history-rev', async view => {
	await view.get('manager#required')
	const db = await view.get('db')
	const note_id = await view.get('note_id')
	const rev = await view.get('rev')

	view.data.note = await NoteDB.getPropsRev(db, note_id, rev)	

	return view.ret()
})
rest.addResponse('get-admin-note', async (view) => {
	await view.get('manager#required')
	const db = await view.get('db')
	const note_id = await view.get('note_id')
	view.ans.note = await db.fetch(`
		SELECT note_id, title, text, rev, UNIX_TIMESTAMP(date_create) as date_create
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
			un.count_opens,
			un.count_changes,
			un.open,
			un.accept,
			un.focus
		FROM 
			note_stats un
			LEFT JOIN user_uemails u ON (u.user_id = un.user_id and u.ordain = 1)
		WHERE note_id = :note_id
	`, {note_id})

	
	return view.ret()
})

