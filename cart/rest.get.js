//get для интерфейса
import Rest from '/-rest'
import rest_db from '/-db/rest.db.js'
import rest_admin from '/-controller/rest.admin.js'
import rest_user from '/-user/rest.user.js'
import rest_vars from '/-catalog/rest.vars.js'
import rest_cart from '/-cart/rest.cart.js'
import Catalog from "/-catalog/Catalog.js"
import Cart from "/-cart/Cart.js"
const rest = new Rest(rest_db, rest_admin, rest_user, rest_cart, rest_vars)
export default rest

rest.addResponse('get-panel', async view => {
	const { db, active_id } = await view.gets(['db', 'active_id#required'])
	const list = await db.all(`
		SELECT model_nick, brand_nick, count, item_num 
		FROM cart_basket 
		WHERE order_id = :active_id
		ORDER by dateedit DESC
	`, {active_id})

	view.ans.list = (await Promise.all(list.map(async pos => {
		const item = await Cart.getItem(view, active_id, pos.brand_nick, pos.model_nick, pos.item_num)
		item.count = pos.count
		return item
		
	}))).filter(item => !!item || !item['Цена'])

	view.ans.sum = 0
	view.ans.list.forEach(mod => {
		mod.sum = (mod['Цена'] || 0) * (mod.count || 0)
		view.ans.sum += mod.sum
	})

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