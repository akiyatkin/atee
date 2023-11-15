import config from '@atee/config'

const NoteDB = {}


NoteDB.create = db => db.insertId(`INSERT INTO note_notes (text) values ('')`)

NoteDB.getNote = async (db, note_id) => {
	const note = await db.fetch('SELECT UNIX_TIMESTAMP(now()) as now, nick, text, UNIX_TIMESTAMP(date_create) as date_create, title, rev, note_id FROM note_notes WHERE note_id = :note_id', {note_id})
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