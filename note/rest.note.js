import config from "/-config"
import Rest from "/-rest"
const rest = new Rest()
import rest_db from "/-db/rest.db.js"
rest.extra(rest_db)
import NoteDB from "/-note/NoteDB.js"


rest.addArgument('note_id', ['int'])

rest.addArgument('page', async (view, name) => {
	const conf = await config('note')

	if (!conf.pages[name]) return view.err('Страница не найдена', 404)
	const db = await view.get('db')
	const page = await db.fetch(`
		SELECT title, text
		FROM note_notes WHERE note_id = :note_id
	`, {note_id: conf.pages[name]})
	if (!page) return view.err('Страница не найдена', 404)
	return page
})
rest.addArgument('hue', ['int'])

export default rest