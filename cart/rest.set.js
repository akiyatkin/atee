//set для интерфейса
import Rest from '/-rest'
import rest_admin from '/-controller/rest.admin.js'
import rest_cart from '/-cart/rest.cart.js'
import Mail from '/-mail'
import rest_vars from '/-catalog/rest.vars.js'
import rest_mail from '/-mail/rest.mail.js'
import User from '/-user/User.js'
import Cart from '/-cart/Cart.js'

import { whereisit } from '/-controller/whereisit.js'
import fs from "fs/promises"
const { FILE_MOD_ROOT, IMPORT_APP_ROOT } = whereisit(import.meta.url)

const rest = new Rest(rest_admin, rest_vars, rest_cart, rest_mail)
export default rest


rest.addResponse('set-manager-refresh', async view => {
	await view.gets(['manager#required'])
	const { db, base } = await view.gets(['db','base'])

	const poss = await db.all('SELECT order_id, brand_nick, model_nick, item_num, count from cart_basket')

	const orders = {}
	for (const pos of poss) {
		const {order_id, brand_nick, model_nick, item_num, count} = pos
		const partner = await Cart.getPartner(db, order_id)
		const item = await Cart.getItem(db, base, order_id, brand_nick, model_nick, item_num, partner)
		if (!item) continue; //Позиция и не заморожена и нет в каталоге

		if (!orders[order_id]) orders[order_id] = { order_id, sum:0, count:0 }
		const order = orders[order_id]

		order.sum += item['Цена'] * count
		order.count++
	}
	const res = []
	for (const order_id in orders) {
		const order = orders[order_id]
		const r = await db.affectedRows(`
			UPDATE cart_orders 
			SET sum = :sum, count = :count
			WHERE order_id = :order_id
		`, order).catch(r => false)
		if (!r) {
			const order_nick = await db.col('select order_nick from cart_orders where order_id = :order_id', order)
			res.push('Слишком большая сумма или количество в заказе ' + order_nick + ':' + order_id)
		}
	}

	
	
	return view.ret('Суммы пересчитаны.<br>' + res.join('<br>'))
})

rest.addResponse('set-delete', async view => {
	await view.gets(['manager#required'])
	const { db, order_id, active_id } = await view.gets(['db', 'order_id#required', 'active_id'])
	view.ans.active_id = active_id
	const user_ids = await db.colAll(`
		SELECT user_id 
		FROM cart_actives
		WHERE order_id = :order_id
	`, { order_id })


	await db.affectedRows('DELETE from cart_orders where order_id = :order_id', {order_id})
	await db.affectedRows('DELETE from cart_basket where order_id = :order_id', {order_id})
	await db.affectedRows('DELETE from cart_transports where order_id = :order_id', {order_id})
	await db.affectedRows('DELETE from cart_userorders where order_id = :order_id', {order_id})
	await db.affectedRows('DELETE from cart_actives where order_id = :order_id', {order_id})
	
	for (const user_id of user_ids) {
		const order_id = await db.col(`
			SELECT uo.order_id
			FROM cart_userorders uo, cart_orders o
			WHERE uo.user_id = :user_id and o.order_id = uo.order_id
			ORDER by o.dateedit DESC
		`, { user_id })
		if (!order_id) continue
		await db.exec(`
			REPLACE INTO cart_actives (user_id, order_id) VALUES(:user_id, :order_id)
		`, {user_id, order_id})
	}
	return view.ret('Заказ удалён')
	// const order = await Cart.getOrder(db, order_id)
	// const actives_id = await db.colAll(`
	// 	SELECT user_id
	// 	FROM cart_actives 
	// 	WHERE order_id = :order_id
	// `, { order_id })
})
rest.addResponse('set-status', async view => {
	const {db, status, order_id, base, user_id} = await view.gets(['status#required','db', 'base', 'order_id#required', 'user_id#required'])
	view.ans.active_id = await db.col(`
		SELECT order_id 
		FROM cart_actives 
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
				cart_orders
			SET
				freeze = 0
			WHERE order_id = :order_id
		`, { order_id })
	} else {
		const json = await db.col(`
			SELECT json
			FROM cart_basket 
			WHERE order_id = :order_id
		`, {order_id})
		const item = json ? JSON.parse(json) : false
		if (!item) { //Замораживаем если там там нет данных. Иначе, заморозка сохраняется оригинальная (туда-сюда действия менеджера не должны изменить заявку).
			const order = await Cart.getOrder(db, order_id)
			Cart.freeze(db, base, order_id, order.partner)
		} else {
			await db.exec(`
				UPDATE 
					cart_orders
				SET
					freeze = 1
				WHERE order_id = :order_id
			`, { order_id })
		}
	}
	await Cart.setStatus(db, order_id, status, order)
	view.ans.status = status
	return view.ret('Готово')
})

rest.addResponse('set-clear', async view => {
	const db = await view.get('db')
	const base = await view.get('base')
	const order_id = await view.get('order_id#required')

	const order = await Cart.getOrder(db, order_id)
	if (order.status != 'wait') return view.err('Заказ уже отправлен менеджеру')


	const list = await Cart.getBasket(db, base, order_id, order.freeze, order.partner)
	const products = list.map((mod) => {
		const product = {
			"id": mod.model_nick,
			"name" : mod['Наименование'] || mod.model_title,
			"price": mod['Цена'],
			"brand": mod.brand_title,
			"variant": getv(mod, "Позиция") || mod.item_num,
			"quantity": mod.count,
			"category": mod.group_title
		}
		return product
	})
	view.ans.products = products.filter(prod => prod.quantity)


	for (const field of ['name', 'phone','email','address','commentuser']) {
		Cart.saveFiled(db, order_id, field, '')
	}
	

	await db.affectedRows('DELETE from cart_basket where order_id = :order_id', {order_id})
	return view.ret()
})

const getv = (mod, prop_title) => mod[prop_title] ?? mod.more[prop_title] ?? ''


rest.addResponse('set-submit', async view => {
	const { db, base, terms, active_id: order_id, user, user_id } = await view.gets(['db', 'base', 'terms', 'user#required', 'user_id', 'active_id#required'])

	
	const order = await Cart.getOrder(db, order_id)
	//if (!order.count) return view.err('В заказе нет товаров', 422) интерфейс не позволит это отправить, но если такое произойдёт проблема не сервера, пофиг
	// 'address' - защита только на клиенте
	for (const check of ['email','name','phone']) if (!order[check]) return view.err('Заполнены не все поля', 422)
	if (order.status != 'wait') return view.err('Заказ уже отправлен менеджеру')
	const ready = async () => {
		//await Cart.setPartner(db, order_id, partner)
		await Cart.recalcOrder(db, base, order_id, order.partner)
		await Cart.freeze(db, base, order_id)


		const list = await Cart.getBasket(db, base, order_id, order.freeze, order.partner)
		const products = list.map((mod) => {
			const product = {
				"id": mod.model_nick,
				"name" : mod['Наименование'] || mod.model_title,
				"price": mod['Цена'],
				"brand": mod.brand_title,
				"variant": getv(mod, "Позиция") || mod.item_num,
				"quantity": mod.count,
				"category": mod.group_title
			}
			return product
		})
		view.ans.products = products.filter(prod => prod.quantity)



		const utms = await view.get('utms')
		Cart.updateUtms(db, order_id, utms)

		

		await Cart.setStatus(db, order_id, 'check')
		await Cart.setDate(db, order_id, 'check')

		

		const r1 = await Cart.sendToAdmin(view, 'tocheck', order_id)
		if (!r1) return view.ret('Не удалось отправить письмо менеджеру, позвоните по нашим контактам.')


		const r2 = await Cart.sendToUser(view, 'tocheck', order_id)
		if (!r2) return view.ret('Не удалось отправить письмо клиенту, позвоните по нашим контактам.')



		//if ((await Promise.all([r1, r2])).some(r => !r)) return view.ret('Не удалось отправить письмо.')

		return view.ret('Спасибо за заказ. Менеджер оповещён, ответит в течение 24 часов, как можно скорее.')
	}
	let ouser = order.email ? await User.getUserByEmail(view, order.email) : false

	if (user.user_id == ouser.user_id) { //Это я и я зарегистрирован
		return ready()
	}
	

	if (user.manager) {

		if (!ouser) {
			ouser = await User.create(db)
			await User.sendup(db, ouser.user_id, view.visitor.client.host, order.email) //Сохраняем email нового пользователя и отправляем письмо ему
		}

		if (ouser.user_id != user.user_id) await Cart.grant(db, ouser.user_id, order.order_id) //Указанному пользователю даём доступ к заказу. У него он будет активным

		return ready()
	}

	if (ouser) { //Есть зарегистрированный пользователь по заявке, найденный по email
		await User.sendin(db, ouser.user_id, view.visitor.client.host)
		if (user.email) { //При авторизации заказ не передастся будет просто ошибка
			return view.err('Вам нужно авторизоваться (' + order.email + ') и повторить заказ или изменить email. Сейчас вы в другом аккаунте (' + user.email + '). На почту отправлена ссылка.', 422)
		} else { //Заказ передастся при авторизации в томже браузере
			return view.err('Вам нужно авторизоваться в этом браузере (' + order.email + '). Корзина не потеряется. На почту отправлена ссылка.', 422)
		}			
	}

	//Пользователя по заявке нет
	if (!user.email) { //текущий пользователь не зарегистрирован
		await User.sendup(db, user.user_id, view.visitor.client.host, order.email)
	} else { //Текущий пользователь зарегистрирован
		const ouser = await User.create(db)
		await Cart.grant(db, ouser.user_id, order.order_id) //И новому пользователю даём доступ к заказу
		//Заказ может быть активен у двух пользователей
		await User.sendup(db, ouser.user_id, view.visitor.client.host, order.email) //Сохраняем email нового пользователя и отправляем письмо ему
	}
	return ready()
})





rest.addResponse('set-add', async view => {
	let { base, active_id, partner } = await view.gets(['base', 'active_id', 'partner'])
	const { db, item, count, nocopy } = await view.gets(['db', 'item#required', 'count', 'nocopy'])

	const utms = await view.get('utms')
	const order_id = await Cart.castWaitActive(view, active_id, utms, nocopy)
	view.ans.newwaitorder = order_id != active_id
	await Cart.updateUtms(db, order_id, utms)

	let orderrefresh = false
	if (active_id != order_id) orderrefresh = true
	const order = await Cart.getOrder(db, order_id)
	
	if (order.partner?.key != partner?.key) orderrefresh = true
	view.ans.orderrefresh = orderrefresh

	await Cart.setPartner(db, order_id, partner)
	await Cart.addItem(db, order_id, item, count)
	await Cart.recalcOrder(db, base, order_id, partner)
	return view.ret('Готово')
})


rest.addResponse('set-remove', async view => {
	const { db, base, item, active_id, partner } = await view.gets(['db', 'base', 'item#required', 'active_id', 'partner'])
	if (!active_id) return view.err('Заказ не найден')

	const utms = await view.get('utms')
	const order_id = await Cart.castWaitActive(view, active_id, utms)
	await Cart.updateUtms(db, order_id, utms)

	await Cart.setPartner(db, order_id, partner)
	await Cart.removeItem(db, order_id, item)
	await Cart.recalcOrder(db, base, order_id, partner)
	return view.ret('Готово')
})
rest.addResponse('set-field', async view => {
	//const { db, field, value, active_id, user } = await view.gets(['db', 'field', 'value', 'user', 'active_id#required'])
	
	const db = await view.get('db')
	const field = await view.get('field')
	const value = await view.get('value')
	const active_id = await view.get('active_id#required')
	const user = await view.get('user')

	const order = await Cart.getOrder(db, active_id)
	if (order[field] == value) return view.ret('Данные сохранены')
	if (order.status != 'wait') return view.err('Заказ уже отправлен менеджеру', 422)
	const errorsave = async msg => {
		const r = await Cart.saveFiled(db, active_id, field, '')
		if (!r) return view.err('Ошибка на сервере!', 500)
		return view.err(msg, 422)
	}
	if (field == 'name') {
		if (value.length < 5) return errorsave('Вы указали очень короткие ФИО')
	} else if (field == 'email') {
		if (!Mail.isEmail(value)) return errorsave('Указан некорректный Email')
	} else if (field == 'phone') {
		let test = value.replace(/\D/g,'')
		test = test.replace(/^8/,'7')
		if (test[0] != 7) return errorsave("Уточните ваш телефон, номер должен начинаться с 7, мы работаем в России")
		if (test.length != 11) return errorsave("Уточните ваш телефон для связи, должно быть 11 цифр ("+test+")")
	} else if (field == 'usercomment') {

	}
	const r = await Cart.saveFiled(db, active_id, field, value)
	if (!r) return view.err('Ошибка на сервере', 500)
	return view.ret('Указанные данные сохранены')
})
rest.addResponse('set-newactive', async view => {
	const { order_id, db, user_id } = await view.gets(['db', 'order_id#required','user_id'])
	view.ans.user_id = user_id

	await db.exec(`
		REPLACE INTO cart_actives (user_id, order_id) VALUES(:user_id, :order_id)
	`, {user_id, order_id})
	
	// await db.exec(`
	// 	UPDATE cart_actives
	// 	SET order_id = :active_id
	// 	WHERE user_id = :user_id
	// `, {
	// 	active_id: order.order_id, 
	// 	user_id: user_id
	// })
	return view.ret()
})





rest.addResponse('set-reset', async view => {
	await view.gets(['admin'])
	const { db } = await view.gets(['db'])

	const res = await db.exec(`DROP TABLE IF EXISTS 
		cart_orders,
		cart_transports,
		cart_basket,
		cart_actives,
		cart_partners,
		cart_userorders
	`)
	
	const src = FILE_MOD_ROOT + '/update.sql'
	const sql = await fs.readFile(src).then(buffer => buffer.toString())
	const sqls = sql.split(';')

	await Promise.all(sqls.map(sql => {
		sql = sql.trim()
		if (!sql) return Promise.resolve()
		return db.exec(sql)
	}))
	
	return view.ret('База обновлена')
})