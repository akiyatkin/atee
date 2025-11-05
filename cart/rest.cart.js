import Rest from "/-rest"
import rest_funcs from '/-rest/rest.funcs.js'
import rest_vars from '/-catalog/rest.vars.js'
import rest_user from '/-user/rest.user.js'
import Cart from "/-cart/Cart.js"
const rest = new Rest(rest_funcs, rest_vars, rest_user)

rest.addArgument('ip', view => view.visitor.client.ip)
rest.addArgument('host', view => view.visitor.client.host)

rest.addArgument('source', ['escape'])
rest.addArgument('content', ['escape'])
rest.addArgument('campaign', ['escape'])
rest.addArgument('medium', ['escape'])
rest.addArgument('term', ['escape'])
rest.addArgument('referrer_host', ['escape'])
rest.addArgument('nocopy', ['int'])
rest.addArgument('modification', ['escape'])

rest.addVariable('utms', view => view.gets(['referrer_host', 'source', 'content', 'campaign', 'medium', 'term']))

rest.addArgument('order_id', ['int'], async (view, order_id) => {
	const { user, db } = await view.gets(['user', 'db'])
	if (user.manager) return order_id
	if (!order_id) return false
	const check_id = await db.col(`
		SELECT uo.order_id 
		FROM cart_userorders uo
		WHERE uo.order_id = :order_id and uo.user_id = :user_id
	`, {order_id, user_id: user.user_id})
	if (!check_id) return view.err('Недостаточно прав '+user.email, 403)
	return check_id
})
rest.addArgument('status', (view, status) => {
	if (status && !~['check','complete','wait','cancel'].indexOf(status)) return view.err('Некорректный статус', 422)
	return status
})
rest.addVariable('status#required', async (view) => {
	const { status } = await view.gets(['status'])
	if (!status) return view.err('Требуется указать статус', 422)
	return status
})

rest.addVariable('order_id#required', async (view) => {
	const order_id = await view.get('order_id')
	if (!order_id) return view.err('Заказ не найден', 422)
	return order_id
})


rest.addVariable('order', async (view) => {
	const order_id = await view.get('order_id')
	if (!order_id) return false
	return Cart.getOrder(view, order_id)
})
rest.addVariable('order#required', async (view) => {
	const order = await view.get('order')
	if (!order) return view.err('Заказ не найден', 422)
	return order
})
rest.addArgument('count', ['int'], (view, count) => {
	if (count > 65535) count = 65535
	if (count < 0) count = 0
	return count
})
rest.addArgument('field', ['string'], (view, val) => {
	if (!~['name', 'phone','email','address','commentuser'].indexOf(val)) return view.err('Некорректный запрос, такого поля нет.')
	return val
})
//rest.addArgument('value', ['string']) есть у каталога
rest.addVariable('active_id', async view => {
	const { db, user_id, order_id } = await view.gets(['db', 'user_id', 'order_id'])
	if (!user_id) return false
	if (order_id) {
		const active_id = await db.col(`
			SELECT order_id 
			FROM cart_actives 
			WHERE user_id = :user_id and order_id = :order_id
		`, {user_id, order_id})
		return active_id
	}
	const active_id = await db.col(`
		SELECT order_id 
		FROM cart_actives
		WHERE user_id = :user_id
	`, {user_id})
	return active_id
})
rest.addVariable('active_id#required', async view => {
	const { db, active_id } = await view.gets(['db', 'active_id'])
	if (!active_id) return view.err('Заказ не найден', 200)
	return active_id
})


export default rest
