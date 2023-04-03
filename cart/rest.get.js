//get для интерфейса
import Rest from '/-rest'
import rest_db from '/-db/rest.db.js'
import rest_admin from '/-controller/rest.admin.js'
import rest_user from '/-user/rest.user.js'
const rest = new Rest(rest_db, rest_admin, rest_user)
export default rest

rest.addResponse('get-cart', async view => {
	const { user } = await view.gets(['user#required'])
	view.ans.list = [{model_title:'Модель'}]
	return view.ret()
})
rest.addResponse('get-list', async view => {
	await view.get('admin')
	const { db } = await view.gets(['db'])
	view.ans.list = await db.all(`
		SELECT distinct u.*, e.email, p.phone 
		from cart_userorders o, user_users u
		LEFT JOIN user_uemails e on (e.user_id = u.user_id and e.ordain = 1)
		LEFT JOIN user_uphones p on (p.user_id = u.user_id and e.ordain = 1)
		WHERE o.user_id = u.user_id
	`)
	return view.ret()
})
rest.addResponse('get-settings', async view => {
	await view.get('admin')
	const { db } = await view.gets(['db'])
	const tables = [
		'cart_orders',
		'cart_transports',
		'cart_basket',
		'cart_userorders'
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