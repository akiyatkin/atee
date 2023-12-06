import config from '@atee/config'
import nicked from '/-nicked'
const NoteDB = {}

NoteDB.getPropsRev = async (db, note_id, rev) => {
	const note = await db.fetch(`
		SELECT
			UNIX_TIMESTAMP(n.date_edit) as date_edit,
			n.rev, 
			n.note_id,
			n.title,
			n.text,
			e.email as editor_email
		FROM note_history n
		LEFT JOIN user_uemails e on (e.user_id = n.editor_id and e.ordain = 1)
		WHERE note_id = :note_id
	`, {note_id})

	return note
}
NoteDB.getProps = async (db, note_id) => {
	const note = await db.fetch(`
		SELECT
			UNIX_TIMESTAMP(n.date_edit) as date_edit,
			UNIX_TIMESTAMP(n.date_create) as date_create,
			n.rev, 
			n.note_id,
			n.title,
			n.nick,
			c.email as create_email, 
			e.email as editor_email
		FROM note_notes n
		LEFT JOIN user_uemails c on (c.user_id = n.creater_id and c.ordain = 1)
		LEFT JOIN user_uemails e on (e.user_id = n.editor_id and e.ordain = 1)
		WHERE note_id = :note_id
	`, {note_id})

	note.users = await db.all(`
		SELECT
			u.email,
			un.user_id, 
			wu.hue,
			un.open,
			un.focus,
			un.count_opens,
			un.count_changes,
			UNIX_TIMESTAMP(un.date_close) as date_close,
			UNIX_TIMESTAMP(un.date_change) as date_change
		FROM 
			note_stats un
			LEFT JOIN user_uemails u ON (u.user_id = un.user_id and u.ordain = 1)
			LEFT JOIN note_users wu ON (u.user_id = wu.user_id)
		WHERE note_id = :note_id
	`, note)
	note.usercount = note.users.length
	note.useronline = note.users.filter(user => user.open).length
	note.userguests = note.users.filter(user => !user.email).length
	note.useremails = note.users.filter(user => user.email).length

	note.history = await db.all(`
		SELECT
			UNIX_TIMESTAMP(n.date_edit) as date_edit,
			e.email as editor_email, 
			n.rev,
			wu.hue
		FROM 
			note_history n
			LEFT JOIN user_uemails e on (e.user_id = n.editor_id and e.ordain = 1)
			LEFT JOIN note_users wu ON (wu.user_id = n.editor_id)
		WHERE note_id = :note_id
	`, {note_id})

	return note
}
NoteDB.create = (db, user_id, title = '') => {
	const nick = nicked(title)
	return db.insertId(`
		INSERT INTO note_notes (text, editor_id, creater_id, title, nick) 
		VALUES (:title, :user_id, :user_id, :title, :nick)
	`, {title, nick, user_id})
}

NoteDB.getNote = async (db, note_id) => {
	const note = await db.fetch(`
		SELECT 
			nick, text, title, rev, note_id, 
			UNIX_TIMESTAMP(now()) as now, 
			UNIX_TIMESTAMP(date_create) as date_create, 
			UNIX_TIMESTAMP(date_edit) as date_edit
		FROM 
			note_notes 
		WHERE 
			note_id = :note_id
	`, {note_id})
	return note
}
NoteDB.getNoteArea = async (db, note_id, user) => {
	const note = await NoteDB.getNote(db, note_id)
	if (!note) return false
	const conf = await config('note')
	note.wshost = conf.wshost
	note.cursors = await db.all(`
		SELECT
			un.user_id,
			c.hue,
			un.cursor_base as base,
			un.cursor_start as start,
			un.cursor_size as size,
			un.cursor_direction as direction
		FROM note_stats un 
		LEFT JOIN note_users c on c.user_id = un.user_id
		WHERE un.note_id = :note_id
		and un.open = 1 
		-- and date_focus > date_blur
	`, {note_id})
	//При нажатии F5 мгновенный date_close, а затем новый date_open и при равенстве открыто

	if (user) {
		//view.ans.name = await db.col("SELECT name FROM note_users WHERE user_id = :user_id", user)
		const user_id = note.user_id = user.user_id
		note.user_token = user.token
		const more = await db.fetch(`
			SELECT 
				un.cursor_base, 
				un.cursor_start, 
				un.cursor_size, 
				un.cursor_direction,
				c.hue
			FROM note_stats un
			LEFT JOIN note_users c on c.user_id = un.user_id
			WHERE un.user_id = :user_id and un.note_id = :note_id
		`, {note_id, user_id}) || {}
		if (!more.hue) more.hue = 0
		Object.assign(note, more)
	
		note.cursors = note.cursors.filter(cur => {
			if (cur.user_id != user_id) return true
		})
	}
	
	
	note.cursors.map(cur => cur.base = note.rev)
	note.cursors = note.cursors.reduce((ak, cur) => {
		ak[cur.user_id] = cur
		return ak
	}, {})
	return note
}


export default NoteDB