import Rest from "/-rest"
import Db from "/-db/Db.js"
import db_vars from "/-db/vars.js"

import Access from "/-controller/Access.js"


const rest = new Rest(db_vars)

rest.addHandler('admin', async (view) => {
	const { visitor } = await view.gets(['visitor'])
	if (!await Access.isAdmin(visitor.client.cookie)) {
		view.status = 403
		view.nostore = true
		return view.err('Access denied')
	}
})

rest.addResponse('get-state', async view => {
	const { visitor } = await view.gets(['visitor'])
	view.ans.admin = await Access.isAdmin(visitor.client.cookie)
	const db = await new Db().connect()
	view.ans.db = !!db
	db.release()
	return view.ret()
})
rest.addResponse('get-tables', async view => {
	const { db } = await view.gets(['db','admin'])
	const rows = await db.all(`
		SELECT 
		     table_name AS 'name', 
		     round(((data_length + index_length) / 1024 / 1024), 2) 'mb',
		     table_rows as length 
		FROM information_schema.TABLES 
		WHERE table_schema = :dbname
		ORDER BY mb DESC, length DESC
	`,{ dbname: db.conf.database })
	view.ans.list = rows
	return view.ret()
})
rest.addArgument('visitor')


export default rest
