import User from '/-user/User.js'
import Cart from "/-shop/cart/Cart.js"
import Shop from "/-shop/Shop.js"
import Rest from '/-rest'

const rest = new Rest()
export default rest

import rest_cart from '/-shop/cart/rest.cart.js'
rest.extra(rest_cart)

rest.addResponse('set-status', ['manager#required'], async view => {
	const {db, status, order_id, user_id} = await view.gets(['status#required','db', 'order_id#required', 'user_id#required'])
	view.ans.active_id = await db.col(`
		SELECT order_id 
		FROM shop_actives 
		WHERE user_id = :user_id
	`, { user_id })
	const order = await Cart.getOrder(db, order_id)

	if (!order['date' + status]) {
		if (status == 'check' && order['date' + status]) {

		} else if (status == 'wait') {

		} else {
			await Cart.setDate(db, order_id, status)
		}
	}

	if (status == 'wait') {
		await db.exec(`
			UPDATE 
				shop_orders
			SET
				freeze = 0
			WHERE order_id = :order_id
		`, { order_id })
	} else {
		const json = await db.col(`
			SELECT json
			FROM shop_basket 
			WHERE order_id = :order_id
		`, {order_id})
		const item = json ? JSON.parse(json) : false
		if (!item) { //Замораживаем если там там нет данных. Иначе, заморозка сохраняется оригинальная (туда-сюда действия менеджера не должны изменить заявку).
			const order = await Cart.getOrder(db, order_id)
			await Cart.basket.freeze(db, order_id, order.partner)
		} else {
			await db.exec(`
				UPDATE 
					shop_orders
				SET
					freeze = 1
				WHERE order_id = :order_id
			`, { order_id })
		}
	}
	await Cart.setStatus(db, order_id, status, order)
	view.ans.status = status
	return view.ret()
})
rest.addResponse('set-delete', ['manager#required'], async view => {
	const { db, order_id, active_id } = await view.gets(['db', 'order_id#required', 'active_id'])
	view.ans.active_id = active_id
	const user_ids = await db.colAll(`
		SELECT user_id 
		FROM shop_actives
		WHERE order_id = :order_id
	`, { order_id })


	await db.affectedRows('DELETE from shop_orders where order_id = :order_id', {order_id})
	await db.affectedRows('DELETE from shop_basket where order_id = :order_id', {order_id})
	await db.affectedRows('DELETE from shop_transports where order_id = :order_id', {order_id})
	await db.affectedRows('DELETE from shop_userorders where order_id = :order_id', {order_id})
	await db.affectedRows('DELETE from shop_actives where order_id = :order_id', {order_id})
	
	for (const user_id of user_ids) {
		const order_id = await db.col(`
			SELECT uo.order_id
			FROM shop_userorders uo, shop_orders o
			WHERE uo.user_id = :user_id and o.order_id = uo.order_id
			ORDER by o.dateedit DESC
		`, { user_id })
		if (!order_id) continue
		await db.exec(`
			REPLACE INTO shop_actives (user_id, order_id) VALUES(:user_id, :order_id)
		`, {user_id, order_id})
	}
	return view.ret('Заказ удалён')
	// const order = await Cart.getOrder(db, order_id)
	// const actives_id = await db.colAll(`
	// 	SELECT user_id
	// 	FROM shop_actives 
	// 	WHERE order_id = :order_id
	// `, { order_id })
})

rest.addResponse('set-manager-refresh', ['manager#required'], async view => { //depricated зачем?
	const db = await view.get('db')

	const orders = await db.allto('order_id', `
		SELECT 
			order_id, 
			freeze + 0 as freeze, 
			partnerjson 
		FROM 
			shop_orders
	`)

	for (const order_id in orders) {
		const order = orders[order_id]
		const partner = order.partnerjson ? JSON.parse(order.partnerjson) : false
		order.list = await Cart.basket.get(db, order, partner)
		for (const pos of order.list) {
			const {brendart_nick, quantity, item} = pos
			const order = orders[order_id]
			order.sum += item.cena[0] * pos.quantity
			order.count++
		}
	}

	const res = []
	for (const order_id in orders) {
		const order = orders[order_id]
		const r = await db.affectedRows(`
			UPDATE shop_orders 
			SET sum = :sum, count = :count
			WHERE order_id = :order_id
		`, order).catch(r => false)
		if (!r) {
			const order_nick = await db.col('select order_nick from shop_orders where order_id = :order_id', order)
			res.push('Слишком большая сумма или количество в заказе ' + order_nick + ':' + order_id)
		}
	}
	
	
	return view.ret('Суммы пересчитаны.<br>' + res.join('<br>'))
})