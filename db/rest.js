import Rest from "/-rest"
import Db from "/-db/Db.js"
import rest_db from "/-db/rest.db.js"
import rest_admin from "/-controller/rest.admin.js"

import Access from "/-controller/Access.js"


const rest = new Rest(rest_db, rest_admin)

rest.addResponse('get-state', async view => {
	const visitor = view.visitor
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
//rest.addArgument('visitor')


export default rest
