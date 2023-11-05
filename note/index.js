import config from "/-config"
const Note = {}


Note.getNote = async (db, note_id) => {
	const note = await db.fetch('SELECT UNIX_TIMESTAMP(now()) as now, token, text, title, rev, note_id FROM ws_notes WHERE note_id = :note_id', {note_id})
	return note
}
Note.getNoteArea = async (db, note_id, user) => {
	const note = await Note.getNote(db, note_id)
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
		FROM ws_usernotes un 
		LEFT JOIN ws_users c on c.user_id = un.user_id
		WHERE un.note_id = :note_id
		and un.open = 1 
		-- and date_focus > date_blur
	`, {note_id})
	//При нажатии F5 мгновенный date_close, а затем новый date_open и при равенстве открыто

	if (user) {
		//view.ans.name = await db.col("SELECT name FROM ws_users WHERE user_id = :user_id", user)
		const user_id = note.user_id = user.user_id
		note.user_token = user.token
		const more = await db.fetch(`
			SELECT 
				un.cursor_base, 
				un.cursor_start, 
				un.cursor_size, 
				un.cursor_direction,
				c.hue
			FROM ws_usernotes un
			LEFT JOIN ws_users c on c.user_id = un.user_id
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


export default Note