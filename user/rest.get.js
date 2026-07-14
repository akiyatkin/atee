//get для интерфейса
import Rest from "@atee/rest"
import rest_user from '/-user/rest.user.js'
import rest_db from '/-db/rest.db.js'
const rest = new Rest(rest_db, rest_user)

import rest_admin from '/-controller/rest.admin.js'
rest.extra(rest_admin)

import rest_search from "/-dialog/search/rest.search.js" //аргументы hash, search 
rest.extra(rest_search)

export default rest

rest.addResponse('get-user', async view => {
	const user = view.ans.user = await view.get('user')
	return view.ret()
})
rest.addResponse('get-user-search', ['admin'], async view => {
	const hashs = await view.get('hashs')	
	const db = await view.get('db')
	const list = await db.all(`
		SELECT u.user_id, e.email
		from user_users u
		LEFT JOIN user_uemails e on (e.user_id = u.user_id and e.ordain = 1)
		WHERE (${hashs.map(hash => 'e.search like "%' + hash.join('%" and e.search like "%') + '%"').join(' or ') || '1 = 1'})
	`)

	list.map(row => {
		row['right'] = `<small style="margin-top:3px" class="mute">${row.user_id}</small>`
		row['left'] = row.email
		return row
	})
	list.push({
		right: "",
		left: "Сбросить"
	})
	view.ans.list = list

	return view.ret()
})
rest.addResponse('get-user-emails', async view => {
	const user = view.ans.user = await view.get('user#signup')
	const db = await view.get('db')
	view.ans.list = user ? await db.all(`
		SELECT 
			e.email, 
			e.ordain, 
			UNIX_TIMESTAMP(date_verify) as date_verify, 
			UNIX_TIMESTAMP(date_verified) as date_verified, 
			UNIX_TIMESTAMP(date_add) as date_add
		FROM user_uemails e 
		WHERE e.user_id = :user_id
		ORDER by e.ordain
	`, user) : []
	return view.ret()
})
rest.addResponse('get-settings', async view => {
	await view.get('admin')
	const db = await view.get('db')
	const tables = [
		'user_users',	
		'user_uemails'
	]
	for (const i in tables) {
		const table = tables[i]
		const obj = {}
		obj.count = await db.col('select count(*) from ' + table).catch(e => '-')
		obj.name = table
		tables[i] = obj
	}
	view.ans.tables = tables
	return view.ret()
})
rest.addResponse('get-list', async view => {
	await view.get('admin')
	const db = await view.get('db')
	view.ans.list = await db.all(`
		SELECT u.*, e.email
		from user_users u
		LEFT JOIN user_uemails e on (e.user_id = u.user_id and e.ordain = 1)
	`)
	return view.ret()
})
