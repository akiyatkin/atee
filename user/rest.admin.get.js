//get для интерфейса
import Rest from '/-rest'
import rest_db from '/-db/rest.db.js'
const rest = new Rest(rest_db)
export default rest

rest.addResponse('get-admin-check', async view => {
	await view.get('admin')
	return view.ret()
})
rest.addResponse('get-admin-list', async view => {
	await view.get('admin')
	view.ans.data = []
	return view.ret()
})

rest.addResponse('get-admin-settings', async view => {
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
		obj.count = await db.col('select count(*) from '+table).catch(e => '-')
		obj.name = table
		tables[i] = obj
	}
	view.ans.tables = tables
	return view.ret()
})