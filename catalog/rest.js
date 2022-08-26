import { Meta } from "/-controller/Meta.js"
import { nicked } from "/-nicked/nicked.js"
import { unique } from "/-nicked/unique.js"
import { Access } from "/-controller/Access.js"
import { Db } from "/-db/Db.js"

import { rest_live } from './rest_live.js'
export const meta = new Meta()
rest_live(meta)

const wait = delay => new Promise(resolve => setTimeout(resolve, delay))


meta.addVariable('isdb', async view => {
	const db = await new Db().connect()
	if (!db) return false
	view.after(() => db.release())
	return db
})
meta.addVariable('db', async view => {
	const { isdb } = await view.gets(['isdb'])
	if (isdb) return isdb
	return view.err('Нет соединения с базой данных')
})


export const rest = async (...args) => {
	const [query, get, { host, cookie, ip }] = args 
	const ans = await meta.get(query, { ...get, host, ip } )
	return { ans, 
		ext: 'json', 
		status: ans.status ?? 200, 
		nostore: false 
	}
}
