import Shop from "/-shop/Shop.js"
import Cart from "/-shop/cart/Cart.js"
import Rest from '/-rest'
const rest = new Rest()
export default rest


import rest_funcs from '/-rest/rest.funcs.js'
rest.extra(rest_funcs)

import rest_db from '/-db/rest.db.js'
rest.extra(rest_db)

import rest_shop from '/-shop/rest.shop.js'
rest.extra(rest_shop)

import rest_user from '/-user/rest.user.js'
rest.extra(rest_user)

rest.addArgument('year', ['int#required'])
rest.addArgument('month', ['int#required'])

rest.addArgument('source', ['escape'])
rest.addArgument('content', ['escape'])
rest.addArgument('campaign', ['escape'])
rest.addArgument('medium', ['escape'])
rest.addArgument('term', ['escape'])
rest.addArgument('referrer_host', ['escape'])
rest.addVariable('getutms', view => view.gets(['referrer_host', 'source', 'content', 'campaign', 'medium', 'term']))

rest.addArgument('quantity', ['sint','unsigned','0'])

rest.addArgument('nocopy', ['int'])
rest.addArgument('brendart_nick', ['nicked'])
rest.addVariable('brendart_nick#required', ['brendart_nick', 'required'])

rest.addVariable('item', async (view) => {
	const db = await view.get('db')
	const brendart_nick = await view.get('brendart_nick#required')
	const partner = await view.get('partner')

	const item = await Shop.getItemByBrendart(db, brendart_nick, partner)
	
	return item
})

rest.addVariable('item#required', async (view) => {
	const item = await view.get('item')

	if (!item) return view.err('Позиция не найдена', 404)
	return item
})



rest.addArgument('order_id', ['int'], async (view, order_id) => {
	const db = await view.get('db')
	const user = await view.get('user')
	if (user.manager) return order_id
	if (!order_id) return false
	const check_id = await db.col(`
		SELECT uo.order_id 
		FROM shop_userorders uo
		WHERE uo.order_id = :order_id and uo.user_id = :user_id
	`, {order_id, user_id: user.user_id})
	if (!check_id) return view.err('Недостаточно прав ' + user.email, 403)
	return check_id
})
rest.addVariable('order_id#required', async (view) => {
	const order_id = await view.get('order_id')
	if (!order_id) return view.err('Заказ не найден', 422)
	return order_id
})

rest.addVariable('active_id', async view => {
	const db = await view.get('db')
	
	const user_id = await view.get('user_id')
	if (!user_id) return false

	const order_id = await view.get('order_id')
	if (order_id) {
		const active_id = await db.col(`
			SELECT order_id 
			FROM shop_actives 
			WHERE user_id = :user_id and order_id = :order_id
		`, {user_id, order_id})
		return active_id //Является ли текущай заявка активной - вот в чём вопрос
	}
	const active_id = await db.col(`
		SELECT order_id 
		FROM shop_actives
		WHERE user_id = :user_id
	`, {user_id})
	return active_id
})
rest.addVariable('active_id#required', ['active_id'], async (view, active_id) => {
	if (!active_id) return view.err('Заказ не найден')
	return active_id
})











rest.addArgument('fieldvalue', ['string'])
rest.addArgument('field', ['string'], (view, val) => {
 	if (!~['name', 'phone','email','address','commentuser'].indexOf(val)) return view.err('Некорректный запрос, такого поля нет.')
 	return val
})


// rest.addArgument('modification', ['escape'])




rest.addArgument('status', (view, status) => {
	if (status && !~['check','complete','wait','cancel'].indexOf(status)) return view.err('Некорректный статус', 422)
	return status
})
rest.addVariable('status#required', async (view) => {
	const { status } = await view.gets(['status'])
	if (!status) return view.err('Требуется указать статус', 422)
	return status
})




// rest.addVariable('order', async (view) => {
// 	const order_id = await view.get('order_id')
// 	if (!order_id) return false
// 	return Cart.getOrder(view, order_id)
// })
// rest.addVariable('order#required', async (view) => {
// 	const order = await view.get('order')
// 	if (!order) return view.err('Заказ не найден', 422)
// 	return order
// })





