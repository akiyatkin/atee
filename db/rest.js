import { Meta } from "/-controller/Meta.js"
import { Db } from "/-db/Db.js"

import { Access } from "/-controller/Access.js"


export const meta = new Meta()

meta.addHandler('admin', async (view) => {
	const { cookie } = await view.gets(['cookie'])
	if (!await Access.isAdmin(cookie)) {
		view.ans.status = 403
		view.ans.nostore = true
		return view.err('Access denied')
	}
})
meta.addVariable('db', async view => {
	const db = await new Db().connect()
	if (!db) return view.err('Нет соединения с базой данных')
	view.after(() => db.release())
	return db
})
meta.addAction('get-state', async view => {
	const { cookie } = await view.gets(['cookie'])
	view.ans.admin = await Access.isAdmin(cookie)
	view.ans.db = !!await new Db().connect()
	db.release()
	return view.ret()
})
meta.addAction('get-tables', async view => {
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
meta.addArgument('cookie')


export const rest = async (query, get, visitor) => {
	const req = {...get, ...visitor.client}
	const ans = await meta.get(query, req)
	const { status = 200, nostore = true} = ans
	delete ans.status
	delete ans.nostore
	return { ans, status, nostore, ext: 'json' }
}
