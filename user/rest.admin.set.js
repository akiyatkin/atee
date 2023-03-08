//set для интерфейса
import Rest from '/-rest'
import rest_admin from '/-controller/rest.admin.js'
import { whereisit } from '/-controller/whereisit.js'
import fs from "fs/promises"
const { FILE_MOD_ROOT, IMPORT_APP_ROOT } = whereisit(import.meta.url)

const rest = new Rest(rest_admin)
export default rest


rest.addResponse('set-admin-reset', async view => {
	await view.gets(['admin'])
	const { db } = await view.gets(['db'])

	const res = await db.exec(`DROP TABLE IF EXISTS 
		user_users,
		user_uemails,
		user_uphones
	`)
	
	const src = FILE_MOD_ROOT + '/update.sql'
	const sql = await fs.readFile(src).then(buffer => buffer.toString())
	const sqls = sql.split(';')

	await Promise.all(sqls.map(sql => {
		sql = sql.trim()
		if (!sql) return Promise.resolve()
		return db.exec(sql)
	}))
	
	return view.ret('База пересоздана')
})