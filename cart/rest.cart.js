import Rest from "/-rest"
import rest_funcs from '/-rest/rest.funcs.js'
import rest_vars from '/-catalog/rest.vars.js'
import rest_user from '/-user/rest.user.js'

const rest = new Rest(rest_funcs, rest_vars, rest_user)

rest.addArgument('order_id', ['int'])
rest.addArgument('count', ['int'])
rest.addVariable('active_id', async view => {
	const { db, user_id, order_id } = await view.gets(['db', 'user_id','order_id'])
	if (!user_id) return false
	if (order_id) {
		const active_id = await db.col(`
			SELECT order_id 
			FROM cart_userorders 
			WHERE user_id = :user_id and active = 1 and order_id = :order_id
		`, {user_id, order_id})
		return active_id
	}
	const active_id = await db.col(`
		SELECT order_id 
		FROM cart_userorders 
		WHERE user_id = :user_id and active = 1
	`, {user_id})
	return active_id
})
rest.addVariable('active_id#required', async view => {
	const { db, active_id } = await view.gets(['db', 'active_id'])
	if (!active_id) return view.err('Заказ не найден', 200)
	return active_id
})


export default rest
