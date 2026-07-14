const Theory = {}

Theory.get = async (db, note_id) => {
	const theory = await db.fetch('SELECT note_id, published, ordain FROM theory_notes WHERE note_id = :note_id', {note_id})
	theory.next = await db.fetch(`
		SELECT nn.note_id, nn.nick, nn.title
		FROM theory_notes tn
			LEFT JOIN note_notes nn on nn.note_id = tn.note_id
		WHERE tn.ordain > :ordain
		-- and tn.published = 1
		ORDER BY tn.ordain 
		LIMIT 1
	`, theory)
	theory.prev = await db.fetch(`
		SELECT nn.note_id, nn.nick, nn.title
		FROM theory_notes tn
			LEFT JOIN note_notes nn on nn.note_id = tn.note_id
		WHERE tn.ordain < :ordain
		-- and tn.published = 1
		ORDER BY tn.ordain DESC
		LIMIT 1
	`, theory)
	return theory
}
Theory.delete = async (db, note_id) => {
	await db.exec(`
		DELETE FROM theory_notes
		WHERE note_id = :note_id
	`, {note_id})
}
Theory.reorder = async (db) => {
	const list = await db.all(`
		SELECT t.note_id, t.ordain
		FROM theory_notes t
		ORDER BY t.ordain
	`)
	let ordain = 0
	const promises = []
	for (const {note_id} of list) {
		ordain = ordain + 2
		const r = db.exec(`
			UPDATE theory_notes
			SET ordain = :ordain
			WHERE note_id = :note_id
		`, {ordain, note_id})
		promises.push(r)
	}
	return Promise.all(promises)
}

export default Theory