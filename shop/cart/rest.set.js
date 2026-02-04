import User from '/-user/User.js'
import Cart from "/-shop/cart/Cart.js"
import Shop from "/-shop/Shop.js"
import Mail from "@atee/mail"
import Rest from "@atee/rest"
import Ecommerce from "/-shop/Ecommerce.js"
const rest = new Rest()
export default rest

import rest_cart from '/-shop/cart/rest.cart.js'
rest.extra(rest_cart)

import rest_mail from '/-mail/rest.mail.js'
rest.extra(rest_mail)

import rest_set_manager from '/-shop/cart/rest.set.manager.js'
rest.extra(rest_set_manager)



rest.addAction('set-submit', ['terms#required'], async view => {	

	const user_id = await view.get('user_id#required')
	const user = await view.get('user#required')
	const order_id = await view.get('active_id#required')
	const partner = await view.get('partner')
	const db = await view.get('db')	
	const order = await Cart.getOrder(db, order_id)
	const utms = await view.get('getutms')
	if (order.status != 'wait') return view.err('Заказ уже отправлен менеджеру')
	for (const check of ['email','name','phone']) if (!order[check]) return view.err('Заполнены не все поля', 422)
	
	const ready = async () => {
		//await Cart.setPartner(db, order_id, partner)
		const list = await Cart.basket.get(db, order, partner)
		await Cart.recalcOrder(db, order_id, list, partner)
		await Cart.basket.freeze(db, order_id, partner)


		
		await Shop.prepareModelsPropsValuesGroups(db, view.data, list)
		const products = list.map((pos, i) => {
			const product = Ecommerce.getProduct(view.data, {
				coupon: partner.key, 
				item: pos.item, 
				listname:'Корзина', 
				position: i + 1, 
				group_nick: pos.group_nicks[0], 
				quantity: null
			})
			// const product = {
			// 	"id": mod.model_nick,
			// 	"name" : mod['Наименование'] || mod.model_title,
			// 	"price": mod['Цена'],
			// 	"brand": mod.brand_title,
			// 	"variant": getv(mod, "Позиция") || mod.item_num,
			// 	"quantity": mod.count,
			// 	"category": mod.group_title
			// }
			return product
		})
		view.ans.products = products.filter(prod => prod.quantity)
		
		Cart.updateUtms(db, order_id, utms)

		await Cart.setStatus(db, order_id, 'check')
		await Cart.setDate(db, order_id, 'check')

		const r1 = await Cart.sendToAdmin(db, 'tocheck', order_id, view.visitor, partner)
		if (!r1) return view.err('Не удалось отправить письмо менеджеру, позвоните, пожалуйста, по нашим <a href="/contacts">контактам</a>.')

		const r2 = await Cart.sendToUser(db, 'tocheck', order_id, view.visitor, partner)
		if (!r2) return view.err('Не удалось отправить письмо клиенту, позвоните, пожалуйста, по нашим <a href="/contacts">контактам</a>.')

		return view.ret('Спасибо за заказ. Менеджер оповещён, ответит в течение 24 часов, как можно скорее.')
	}

	let ouser = order.email ? await User.getUserByEmail(db, order.email) : false

	if (user.user_id == ouser.user_id) return ready() //Это я и я зарегистрирован
	

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



rest.addAction('set-newactive', async view => {
	const user_id = await view.get('user_id#required')
	const db = await view.get('db')
	const order_id = await view.get('order_id#required')

	view.data.user_id = user_id

	await db.exec(`
		REPLACE INTO shop_actives (user_id, order_id) 
		VALUES (:user_id, :order_id)
	`, {user_id, order_id})
	
	return view.ret()
})
rest.addAction('set-remove', async view => {
	const active_id = await view.get('active_id#required')
	const partner = await view.get('partner')
	const db = await view.get('db')
	const item = await view.get('item#required')
	const user_id = await view.get('user_id#required')


	const utms = await view.get('getutms')
	const order_id = await Cart.castWaitActive(db, user_id, active_id, utms, false)
	await Cart.updateUtms(db, order_id, utms)
	await Cart.removeItem(db, order_id, item)
	const order = await Cart.getOrder(db, order_id)
	const list = await Cart.basket.get(db, order, partner)
	await Cart.recalcOrder(db, order_id, list, partner)
	return view.ret()
})

rest.addAction('set-modification', async view => {
	const active_id = await view.get('active_id#required')
	const modification = await view.get('modification')
	const item = await view.get('item#required')
	const db = await view.get('db')
	const brendart_nick = await view.get('brendart_nick')

	const order = await Cart.getOrder(db, active_id)
	if (order.status != 'wait') return view.err('Заказ уже отправлен, обсудите, пожалуйста, изменения с менеджером!', 422)

	await db.exec(`
		UPDATE 
			shop_basket
		SET
			modification = :modification
		WHERE order_id = :active_id 
			and brendart_nick = :brendart_nick
	`, { modification, active_id, brendart_nick })
	
	return view.ret()
})


rest.addAction('set-add', async view => {
	const active_id = await view.get('active_id')

	const partner = await view.get('partner')
	const db = await view.get('db')

	const item = await view.get('item#required')

	const modification = await view.get('modification')
	const quantity = await view.get('quantity')
	const nocopy = await view.get( 'nocopy')
	const utms = await view.get('getutms')

	const user_id = await view.get('user_id') || await User.createAndSet(db, view)

	const order_id = await Cart.castWaitActive(db, user_id, active_id, utms, nocopy)


	
	view.ans.newwaitorder = order_id != active_id
	await Cart.updateUtms(db, order_id, utms)

	let orderrefresh = false
	if (active_id != order_id) orderrefresh = true
	const order = await Cart.getOrder(db, order_id)
	
	if (order.partner?.key != partner?.key) orderrefresh = true
	view.ans.orderrefresh = orderrefresh
	await Cart.addItem(db, order_id, item.brendart[0], quantity, modification)
	const list = await Cart.basket.get(db, order, partner)
	await Cart.recalcOrder(db, order_id, list, partner)
	return view.ret()
})

rest.addAction('set-clear', async view => {
	const db = await view.get('db')
	const order_id = await view.get('order_id#required')
	const partner = await view.get('partner')
	const order = await Cart.getOrder(db, order_id)
	if (order.status != 'wait') return view.err('Заказ уже отправлен менеджеру')

	const list = view.data.list = await Cart.basket.get(db, order, partner)
	await Shop.prepareModelsPropsValuesGroups(db, view.data, list)
	//await Cart.prepareBasketListPropsValuesGroups(db, view.data, list)


	for (const field of ['name', 'phone','email','address','commentuser']) {
		Cart.saveFiled(db, order_id, field, '')
	}	

	await db.affectedRows('DELETE from shop_basket where order_id = :order_id', {order_id})


	await Cart.recalcOrder(db, order_id, [], partner)


	return view.ret()
})
rest.addAction('set-field', async view => {
	//const { db, field, value, active_id, user } = await view.gets(['db', 'field', 'value', 'user', 'active_id#required'])
	
	const db = await view.get('db')
	const field = await view.get('field')
	const value = await view.get('fieldvalue')
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
		if (test[0] != 7) return errorsave("Уточните ваш телефон, номер должен начинаться с +7 или 8")
		if (test.length != 11) return errorsave("Уточните ваш телефон для связи, должно быть 11 цифр ("+test+")")
	} else if (field == 'usercomment') {

	}
	const r = await Cart.saveFiled(db, active_id, field, value)
	if (!r) return view.err('Ошибка на сервере', 500)
	return view.ret('Указанные данные сохранены')
})




// rest.addAction('set-migrate-cart-from-showcase-to-shop', ['admin'], async view => {
// 	const db = await view.get('db')	
// 	const conn = await db.pool.getConnection()
// 	try {
// 		// await conn.query(`
// 		// 	ALTER TABLE sources_props
// 		// 	CHANGE COLUMN known known ENUM('system','more','column','secondary') NOT NULL DEFAULT 'more' COMMENT 'system показывается в админке shop, чтобы настроить группы, но не показывается нигде в интерфейсе даже в json' COLLATE 'utf8mb3_general_ci'
// 		// `)
// 		// await conn.query(`
// 		// 	ALTER TABLE sources_wprops
// 		// 	CHANGE COLUMN known known ENUM('system','more','column','secondary') NOT NULL DEFAULT 'more' COMMENT 'system показывается в админке shop, чтобы настроить группы, но не показывается нигде в интерфейсе даже в json' COLLATE 'utf8mb3_general_ci'
// 		// `)
	
		
// 		await conn.query(`SET FOREIGN_KEY_CHECKS = 0`) //truncate быстрей, но с FK не работает
// 		await conn.query(`TRUNCATE TABLE shop_basket`)
// 		await conn.query(`TRUNCATE TABLE shop_orders`)
// 		await conn.query(`TRUNCATE TABLE shop_actives`)
// 		await conn.query(`TRUNCATE TABLE shop_userorders`)


// 		await conn.query(`
// 			INSERT INTO shop_actives (user_id, order_id)
// 			SELECT user_id, order_id
// 			FROM cart_actives
// 		`)
// 		await conn.query(`
// 			INSERT INTO shop_userorders (user_id, order_id)
// 			SELECT user_id, order_id
// 			FROM cart_userorders
// 		`)
// 		await conn.query(`
// 			INSERT INTO shop_orders (
// 				order_id, 
// 				user_id, 
// 				order_nick, 
// 				commentuser, 
// 				commentmanager, 
// 				email, 
// 				phone, 
// 				name, 
// 				callback, 
// 				status, 
// 				lang, 
// 				paid, 
// 				pay, 
// 				paydata, 
// 				city_id, 
// 				freeze, 
// 				partnerjson, 
// 				transport, 
// 				pvz, 
// 				address, 
// 				tk, 
// 				zip, 
// 				referrer_host, 
// 				source, 
// 				content, 
// 				campaign, 
// 				medium, 
// 				term, 
// 				referrer_host_nick, 
// 				source_nick, 
// 				content_nick, 
// 				campaign_nick, 
// 				medium_nick, 
// 				term_nick, 
// 				count, 
// 				sum, 
// 				weight, 
// 				datecreate, 
// 				datefreeze, 
// 				datecancel, 
// 				datewait, 
// 				datepay, 
// 				datepaid, 
// 				datecheck, 
// 				datecomplete, 
// 				dateemail, 
// 				dateedit
// 			)
// 			SELECT 
// 				order_id, 
// 				user_id, 
// 				order_nick, 
// 				commentuser, 
// 				commentmanager, 
// 				email, 
// 				phone, 
// 				name, 
// 				callback, 
// 				status, 
// 				lang, 
// 				paid, 
// 				pay, 
// 				paydata, 
// 				city_id, 
// 				freeze, 
// 				partnerjson, 
// 				transport, 
// 				pvz, 
// 				address, 
// 				tk, 
// 				zip, 
// 				referrer_host, 
// 				source, 
// 				content, 
// 				campaign, 
// 				medium, 
// 				term, 
// 				referrer_host_nick, 
// 				source_nick, 
// 				content_nick, 
// 				campaign_nick, 
// 				medium_nick, 
// 				term_nick, 
// 				count, 
// 				sum, 
// 				weight, 
// 				datecreate, 
// 				datefreeze, 
// 				datecancel, 
// 				datewait, 
// 				datepay, 
// 				datepaid, 
// 				datecheck, 
// 				datecomplete, 
// 				dateemail, 
// 				dateedit
// 			FROM cart_orders
// 		`)
		

// 		const [[{prop_id}]] = await conn.query(`select prop_id from showcase_props where prop_nick='art'`)

// 		const [rows, fields] = const conn.query(`select * from shop_basket`)

// 		for (const row of rows) {
// 			//order_id, dateadd, dateedit, modification, json

// 			//if (row)
// 			'shirina-sm'
// 			const art = nicked('Будущее 90x200')
// 			row['brendart_nick'] = row['brand_nick']+'-'+art
// 			delete row['model_nick'] = ''
// 			delete row['brand_nick'] = ''
// 			delete row['item_num'] = ''

// 			row['quantity'] = row['count']
// 			delete row['count'] = ''
			
// 			row['json'] = row['json']
// 			row['json_hash'] = row['hash']
// 			row['json_cost'] = ''
// 			delete row['hash'] = ''
// 		}

// 		await conn.query(`SET FOREIGN_KEY_CHECKS = 1`)
// 	} finally {
// 		await conn.release()
// 	}
	


// })