import NoteDB from "/-note/NoteDB.js"
import Rest from "@atee/rest"
import User from "/-user/User.js"

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

import rest_admin from "/-note/rest.admin.js"
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

rest.addResponse('get-admin', ['manager#required'], async (view) => {
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
rest.addResponse('get-admin-notes-root', ['manager#required'], async (view) => {
	const db = await view.get('db')
	const id = await view.get('id')
	view.data.endorsements = await db.colAll(`select distinct endorsement from note_notes`)
	view.data.user = await User.getUserById(db, id)
	return view.ret()
})
const formatDate = (name, change) => {
	if (!change) return '1=1';

	const d = new Date();
	if (change === 'yes') {
		d.setDate(d.getDate() - 1);
		const dateStr = d.toISOString().split('T')[0];
		return `DATE(${name}) = '${dateStr}'`;
	} else if (change === 'tod') {
		const dateStr = d.toISOString().split('T')[0];
		return `DATE(${name}) = '${dateStr}'`;
	} else if (change === 28) {
		const end = new Date(d);
		end.setDate(d.getDate() - 1);
		const start = new Date(d);
		start.setDate(d.getDate() - 28);
		return `DATE(${name}) BETWEEN '${start.toISOString().split('T')[0]}' AND '${end.toISOString().split('T')[0]}'`;
	}
	return '1=1';
}
rest.addResponse('get-admin-notes-list', ['manager#required'], async (view) => {
	const db = await view.get('db')
	const endorsement = await view.get('endorsement')
	const inside = await view.get('inside')
	const change = await view.get('inside')
	const create = await view.get('create')
	const sort = await view.get('sort')

	const id = await view.get('id')
	const hashs = await view.get('hashs')

	const sql_endorsement = endorsement ? `n.endorsement = '${endorsement}'` : "1=1"
	const sql_change = formatDate('n.date_edit', change)
	const sql_create = formatDate('n.date_create', create)
	const sql_id = id ? `(u.user_id = ${id} or u2.user_id = ${id})` : "1=1"
	const sql_sort = sort == 'create' ? "n.date_create DESC" : "n.date_edit DESC"
	
	
	view.data.notes = await db.all(`
		SELECT 
			n.title, n.note_id, n.rev, 
			COALESCE(u.email) as creater_email,
			COALESCE(u2.email) as editor_email,
			SUM(s.open) as useronline, 
			COUNT(CASE WHEN s.accept = 'edit' THEN s.user_id END) as editors,
    		COUNT(CASE WHEN s.accept = 'view' THEN s.user_id END) as viewers,
			COUNT(s.user_id) as usercount,
			UNIX_TIMESTAMP(n.date_create) as date_create,
			UNIX_TIMESTAMP(n.date_edit) as date_edit 
		FROM note_notes n
		LEFT JOIN note_stats s on s.note_id = n.note_id
		LEFT JOIN user_uemails u on (u.user_id = n.creater_id and u.ordain = 1)
		LEFT JOIN user_uemails u2 on (u2.user_id = n.editor_id and u2.ordain = 1)
		WHERE ${inside == 'notempty' ? "n.title != ''" : "1=1"}
			and ${sql_endorsement}
			and ${sql_change}
			and ${sql_create}
			and ${sql_id}
			and (${hashs.map(hash => 'n.search like "%' + hash.join('%" and n.search like "%') + '%"').join(' or ') || '1 = 1'})
		GROUP BY n.note_id
		ORDER BY ${sql_sort}
		LIMIT 0, 200
	`)
	
	return view.ret()
})

rest.addResponse('get-admin-history', ['manager#required'], async view => {
	const db = await view.get('db')
	
	const note_id = await view.get('note_id#required')
	
	view.data.note = await NoteDB.getPropsNote(db, note_id)

	return view.ret()
})
rest.addResponse('get-admin-history-rev', ['manager#required'], async view => {	
	const db = await view.get('db')
	const note_id = await view.get('note_id')
	const rev = await view.get('rev')

	view.data.note = await NoteDB.getPropsRev(db, note_id, rev)	

	return view.ret()
})
rest.addResponse('get-admin-note', ['manager#required'], async (view) => {
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

