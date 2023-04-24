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


const formatter = new Intl.DateTimeFormat('ru', { month: 'long' })
rest.addResponse('get-panel', async view => {
	const { db, active_id, user_id, user } = await view.gets(['db', 'active_id#required','user_id', 'user'])
	view.ans.user = user
	view.ans.order = await Cart.getOrder(view, active_id)
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


	view.ans.orders = await db.all(`
		SELECT o.order_nick, o.status, o.order_id,
			UNIX_TIMESTAMP(datecheck) as datecheck, 
			UNIX_TIMESTAMP(datewait) as datewait
		FROM cart_userorders uo, cart_orders o
		WHERE uo.user_id = :user_id and uo.order_id = o.order_id
	`, {user_id, active_id})
	for (const order of view.ans.orders) {
		const poss = await db.all(`
			SELECT count, cost 
			FROM cart_basket
			WHERE order_id = :order_id
		`, order)
		order.sum = 0
		for (const {count, cost} of poss) {
			order.sum += count * cost
		}
	}
	const years = {}
	for (const index in view.ans.orders) {
		const order = view.ans.orders[index]
		const date = new Date((order.datecheck || order.datewait) * 1000)
		const year = date.getFullYear()
		if (!years[year]) years[year] = {title: year, months: {}} 
		const month = formatter.format(date)	
		if (!years[year].months[month]) years[year].months[month] = {title: month, list: []}
		years[year].months[month].list.push(index)
	}
	view.ans.years = Object.values(years)
	for (const year of view.ans.years) {
		year.months = Object.values(year.months)
	}

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
		'cart_actives',
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