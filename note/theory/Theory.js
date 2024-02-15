const Theory = {}

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