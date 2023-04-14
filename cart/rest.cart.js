import Rest from "/-rest"
import rest_funcs from '/-rest/rest.funcs.js'
import rest_vars from '/-catalog/rest.vars.js'
import rest_user from '/-user/rest.user.js'
import Cart from "/-cart/Cart.js"
const rest = new Rest(rest_funcs, rest_vars, rest_user)

rest.addArgument('order_id', ['int'])
rest.addVariable('order', async (view) => {
	const { order_id } = await view.gets(['order_id'])
	return Cart.getOrder(view, order_id)
})
rest.addVariable('order#required', async (view) => {
	const { order } = await view.gets(['order'])
	if (!order) return view.err('Требуется order_id')
	return order
})
rest.addArgument('count', ['int'])
rest.addArgument('field', ['string'], (view, val) => {
	if (!~['name', 'phone','email','address','commentuser'].indexOf(val)) return view.err('Некорректный запрос, такого поля нет.')
	return val
})
//rest.addArgument('value', ['string']) есть у каталога
rest.addVariable('active_id', async view => {
	const { db, user_id, order_id } = await view.gets(['db', 'user_id','order_id'])
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
