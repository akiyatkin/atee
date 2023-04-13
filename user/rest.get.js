//get для интерфейса
import Rest from '/-rest'
import rest_user from '/-user/rest.user.js'
import rest_db from '/-db/rest.db.js'
const rest = new Rest(rest_db, rest_user)

export default rest

rest.addResponse('get-user', async view => {
	const { user } = await view.gets(['user'])
	view.ans.user = user
	return view.ret()
})
rest.addResponse('get-settings', async view => {
	await view.get('admin')
	const { db } = await view.gets(['db'])
	const tables = [
		'user_users',	
		'user_uemails', 
		'user_uphones'
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
	const { db } = await view.gets(['db'])
	view.ans.list = await db.all(`
		SELECT u.*, e.email, p.phone 
		from user_users u
		LEFT JOIN user_uemails e on (e.user_id = u.user_id and e.ordain = 1)
		LEFT JOIN user_uphones p on (p.user_id = u.user_id and e.ordain = 1)
	`)
	return view.ret()
})
