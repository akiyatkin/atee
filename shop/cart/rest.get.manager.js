import Cart from "/-shop/cart/Cart.js"
import Shop from "/-shop/Shop.js"
import Rest from '/-rest'
import User from '/-user/User.js'
import config from "/-config"
const rest = new Rest()
export default rest


import rest_db from '/-db/rest.db.js'
rest.extra(rest_db)

import rest_cart from '/-shop/cart/rest.cart.js'
rest.extra(rest_cart)



rest.addResponse('get-manager-years', ['managerOrAdmin#required'], async view => {
	const { db, status } = await view.gets(['db', 'status'])
	view.data.conf = await config('shop', true)
	view.ans.status = status
	view.ans.list = await db.all(`
		SELECT 
			year(o.dateedit) as year,
			sum(o.sum) as sum,
			round(avg(o.sum)) as average,
			count(*) as count
		FROM shop_orders o
		${status ? 'WHERE o.status = :status' : ''}
		GROUP BY year
	`, { status })
	return view.ret()
})

rest.addResponse('get-manager-months', ['managerOrAdmin#required'], async view => {
	const { db, year, status } = await view.gets(['db', 'year', 'status'])
	view.data.conf = await config('shop', true)
	view.ans.year = year
	view.ans.status = status
	view.ans.list = await db.all(`
		SELECT 
			year(o.dateedit) as year,
			month(o.dateedit) as month,
			sum(o.sum) as sum,
			round(avg(o.sum)) as average,
			count(*) as count
		FROM shop_orders o
		WHERE 
			${status ? 'o.status = :status and' : ''}
			year(o.dateedit) = :year
		GROUP BY month
		ORDER BY month DESC
	`, { year, status })
	return view.ret()
})

rest.addResponse('get-manager-orders', ['managerOrAdmin#required'], async view => {
	
	const { db, year, month, active_id, status } = await view.gets(['db', 'status', 'year','month','active_id'])
	
	view.data.conf = await config('shop', true)
	view.ans.active_id = active_id
	view.ans.year = year
	view.ans.month = month
	view.ans.status = status

	view.ans.list = await db.all(`
		SELECT
			order_nick,
			order_id,
			name,
			email,
			address,

			referrer_host,
			source,
			content,
			campaign,
			medium,
			term,

			phone,
			count,
			sum,
			status,
			UNIX_TIMESTAMP(dateedit) as dateedit, 
			UNIX_TIMESTAMP(datecheck) as datecheck, 
			UNIX_TIMESTAMP(datewait) as datewait
		FROM shop_orders o
		WHERE 
			${status ? 'o.status = :status and' : ''}
			year(o.dateedit) = :year and month(o.dateedit) = :month
		ORDER BY o.dateedit DESC
	`, { year, month, status })


	return view.ret()
})