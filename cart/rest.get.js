//get для интерфейса
import Rest from '/-rest'
const rest = new Rest()
export default rest

import rest_db from '/-db/rest.db.js'
rest.extra(rest_db)

import rest_funcs from '/-rest/rest.funcs.js'
rest.extra(rest_funcs)

import rest_admin from '/-controller/rest.admin.js'
rest.extra(rest_admin)

import rest_user from '/-user/rest.user.js'
rest.extra(rest_user)

import rest_vars from '/-catalog/rest.vars.js'
rest.extra(rest_vars)

import rest_cart from '/-cart/rest.cart.js'
rest.extra(rest_cart)

import Catalog from "/-catalog/Catalog.js"
import Cart from "/-cart/Cart.js"
import User from "/-user/User.js"







rest.addResponse('get-myorders', async view => {
	const { user, db } = await view.gets(['user', 'db'])
	if (!user) return {result:0, msg: 'Нет данных'}
	
	const orders = await db.all(`
		SELECT 
			o.order_nick, 
			o.status, 
			o.order_id, 
			sum, 
			count,
			UNIX_TIMESTAMP(datecheck) as datecheck, 
			UNIX_TIMESTAMP(datewait) as datewait
		FROM cart_userorders uo, cart_orders o
		WHERE uo.user_id = :user_id and uo.order_id = o.order_id
		ORDER BY order_id DESC
	`, { user_id: user.user_id })
	
	let years = {}
	for (const index in orders) {
		const order = orders[index]
		const date = new Date((order.datecheck || order.datewait) * 1000)
		const year = date.getFullYear()
		if (!years[year]) years[year] = {title: year, months: {}} 
		const month = formatter.format(date)	
		if (!years[year].months[month]) years[year].months[month] = {title: month, list: []}
		years[year].months[month].list.push(index)
	}
	years = Object.values(years)
	for (const year of years) {
		year.months = Object.values(year.months)
	}

	return {
		user,
		years,
		orders,
		result:1
	}
})


const formatter = new Intl.DateTimeFormat("ru-RU", { month: 'long' })
rest.addResponse('get-tocheck', async view => {
	const { active_id: order_id } = await view.gets(['active_id#required'])
	const data = await Cart.getMailData(view, 'tocheck', order_id)
	Object.assign(view.ans, data)
	return view.ret()
})
rest.addResponse('get-manager-years', async view => {
	await view.get('manager#required')
	const { db, status } = await view.gets(['db', 'status'])
	view.ans.status = status
	view.ans.list = await db.all(`
		SELECT 
			year(o.dateedit) as year,
			sum(o.sum) as sum,
			round(avg(o.sum)) as average,
			count(*) as count
		FROM cart_orders o
		${status ? 'WHERE o.status = :status' : ''}
		GROUP BY year
	`, { status })
	return view.ret()
})
rest.addArgument('year', ['int#required'])
rest.addResponse('get-manager-months', async view => {
	await view.gets(['manager#required'])
	const { db, year, status } = await view.gets(['db', 'year', 'status'])
	view.ans.year = year
	view.ans.status = status
	view.ans.list = await db.all(`
		SELECT 
			year(o.dateedit) as year,
			month(o.dateedit) as month,
			sum(o.sum) as sum,
			round(avg(o.sum)) as average,
			count(*) as count
		FROM cart_orders o
		WHERE 
			${status ? 'o.status = :status and' : ''}
			year(o.dateedit) = :year
		GROUP BY month
		ORDER BY month DESC
	`, { year, status })
	return view.ret()
})
rest.addArgument('month', ['int#required'])
rest.addResponse('get-manager-orders', async view => {
	await view.gets(['manager#required'])
	const { db, year, month, active_id, status } = await view.gets(['db', 'status', 'year','month','active_id'])
	
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
		FROM cart_orders o
		WHERE 
			${status ? 'o.status = :status and' : ''}
			year(o.dateedit) = :year and month(o.dateedit) = :month
		ORDER BY o.dateedit DESC
	`, { year, month, status })


	return view.ret()
})



rest.addResponse('get-added', async view => {
	const db = await view.get('db')

	const brand_nick = await view.get('brand_nick')
	const model_nick = await view.get('model_nick')
	const item_num = await view.get('item_num')
	const user_id = view.ans.user_id = await view.get('user_id')
	view.ans.count = 0

	if (!user_id) return view.ret()
	const wait_id = view.ans.wait_id = await db.col(`
		SELECT order_id 
		FROM cart_actives 
		WHERE user_id = :user_id
	`, {user_id})
	if (!wait_id) return view.ret()

	view.ans.count = await db.col(`
		SELECT count FROM cart_basket 
		WHERE order_id = :wait_id 
			and item_num = :item_num 
			and model_nick = :model_nick
			and brand_nick = :brand_nick
	`, {wait_id, brand_nick, model_nick, item_num })
	

	return view.ret()
})
rest.addResponse('get-modification', async view => {
	const active_id = await view.get('active_id#required')
	const item = await view.get('item#required')
	const db = await view.get('db')

	item.modification = await db.col(`
		SELECT modification
		FROM cart_basket
		WHERE order_id = :active_id 
			and item_num = :item_num 
			and model_nick = :model_nick
			and brand_nick = :brand_nick
	`, {active_id, ...item })

	view.data.item = item
	
	return view.ret()
})

rest.addResponse('get-panel', async view => {
	const { db, partner, base, active_id: order_id, user_id, user } = await view.gets(['db', 'partner', 'base', 'active_id#required','user_id', 'user'])
	view.ans.user = user

	const order = await Cart.getOrder(db, order_id)
	view.ans.order = order
	if (!order.freeze && (!user.email || user.email == order.email)) { //Только тот на кого заявка обновляет партнёрский ключ при просмотре
		await Cart.setPartner(db, order_id, partner)
		order.partner = partner
		await Cart.recalcOrder(db, base, order_id, order.partner)
	}
	const list = await Cart.getBasket(db, base, order_id, order.freeze, order.partner)
	const ouser = await User.getUserByEmail(db, order.email) || await User.getUserById(db, order.user_id) || user
	view.ans.ouser = ouser
	view.ans.list = list

	const orders = await db.all(`
		SELECT o.order_nick, o.status, o.order_id, sum, count,
			UNIX_TIMESTAMP(datecheck) as datecheck, 
			UNIX_TIMESTAMP(datewait) as datewait
		FROM cart_userorders uo, cart_orders o
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

	return view.ret()
})
rest.addResponse('get-list', async view => {
	await view.get('admin')
	const { db } = await view.gets(['db'])
	view.ans.list = await db.all(`
		SELECT distinct u.*, e.email 
		from cart_userorders o, user_users u
		LEFT JOIN user_uemails e on (e.user_id = u.user_id and e.ordain = 1)
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