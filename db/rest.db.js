import Rest from "/-rest"
import Db from "/-db/Db.js"

const rest = new Rest()
rest.addVariable('isdb', async view => {
	const db = await new Db().connect()
	if (!db) return false
	view.after(() => db.release())
	return db
})
rest.addVariable('db', async view => {
	const { isdb } = await view.gets(['isdb'])
	if (isdb) return isdb
	return view.err('Нет соединения с базой данных')
})

rest.addVariable('start', async view => {
	const { db } = await view.gets(['db'])
	await db.start()
	view.after(async () => {
		if (view.ans.result) {
			await db.commit()
		} else {
			await db.back()
		}
	})
})


export default rest