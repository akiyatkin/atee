import Cart from "/-shop/cart/Cart.js"
import Shop from "/-shop/Shop.js"
import Rest from "@atee/rest"
import User from '/-user/User.js'
import config from "@atee/config"
const rest = new Rest()
export default rest


import rest_db from '/-db/rest.db.js'
rest.extra(rest_db)

import rest_cart from '/-shop/cart/rest.cart.js'
rest.extra(rest_cart)

import rest_get_manager from '/-shop/cart/rest.get.manager.js'
rest.extra(rest_get_manager)


rest.addResponse('get-tocheck', async view => {
	const order_id = await view.get('active_id#required')
	const partner = await view.get('partner')
	const db = await view.get('db')
	const data = await Cart.getMailData(db, 'tocheck', order_id, view.visitor, partner)
	Object.assign(view.data, data)
	await Shop.prepareModelsPropsValuesGroups(db, view.data, data.list)
	return view.ret()
})
rest.addResponse('get-added', async view => {
	const db = await view.get('db')

	const brendart_nick = await view.get('brendart_nick')
	const user_id = view.data.user_id = await view.get('user_id')
	
	view.data.quantity = 0

	if (!user_id) return view.ret()

	const wait_id = view.data.wait_id = await db.col(`
	 	SELECT order_id 
	 	FROM shop_actives 
	 	WHERE user_id = :user_id
	`, {user_id})
	if (!wait_id) return view.ret()

	view.data.quantity = await db.col(`
		SELECT quantity FROM shop_basket 
		WHERE order_id = :wait_id and brendart_nick = :brendart_nick 
	`, { wait_id, brendart_nick })
	

	return view.ret()
})
rest.addResponse('get-modification', async view => {
	const order_id = await view.get('active_id#required')
	const item = await view.get('item#required')
	const db = await view.get('db')
	const brendart_nick = await view.get('brendart_nick')
	const user_id = view.data.user_id = await view.get('user_id')

	const modification = await db.col(`
		SELECT modification
		FROM shop_basket
		WHERE order_id = :order_id 
			and brendart_nick = :brendart_nick
	`, {order_id, brendart_nick })

	const pos = {item, modification}
	view.data.pos = pos
	
	return view.ret()
})
const formatter = new Intl.DateTimeFormat("ru-RU", { month: 'long' })
rest.addResponse('get-panel', async view => {
	const db = await view.get('db')
	const partner = await view.get('partner')
	const conf = view.data.conf = await config('shop', true)
	const order_id = await view.get('active_id#required')
	const user_id = await view.get('user_id')

	const user = view.data.user = await view.get('user')

	const order = view.data.order = await Cart.getOrder(db, order_id)
	const list = await Cart.basket.get(db, order, partner)

	if (!order.freeze && (!user.email || user.email == order.email)) { //Только тот на кого заявка обновляет партнёрский ключ при просмотре		
		await Cart.recalcOrder(db, order_id, list, partner)
	}
	
	
	const ouser = await User.getUserByEmail(db, order.email) || await User.getUserById(db, order.user_id) || user
	view.ans.ouser = ouser
	view.ans.list = list

	const orders = await db.all(`
		SELECT o.order_nick, o.status, o.order_id, sum, count,
			UNIX_TIMESTAMP(datecheck) as datecheck, 
			UNIX_TIMESTAMP(datewait) as datewait
		FROM shop_userorders uo, shop_orders o
		WHERE uo.user_id = :user_id and uo.order_id = o.order_id
	`, { user_id })
	//{user_id: (user.manager ? ouser.user_id : user_id)})
	const years = {}
	for (const index in orders) {
		const order = orders[index]
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
	view.ans.orders = orders
	await Shop.prepareModelsPropsValuesGroups(db, view.data, list)
	//await Cart.prepareBasketListPropsValuesGroups(db, view.data, list)
	
	return view.ret()
})