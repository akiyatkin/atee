import User from '/-user/User.js'
import Cart from "/-shop/cart/Cart.js"
import Shop from "/-shop/Shop.js"
import Mail from '/-mail'
import Rest from '/-rest'
import Ecommerce from "/-shop/Ecommerce.js"
const rest = new Rest()
export default rest

import rest_cart from '/-shop/cart/rest.cart.js'
rest.extra(rest_cart)

import rest_mail from '/-mail/rest.mail.js'
rest.extra(rest_mail)

import rest_set_manager from '/-shop/cart/rest.set.manager.js'
rest.extra(rest_set_manager)

rest.addResponse('set-submit', ['terms#required'], async view => {	

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
		const list = await Cart.getBasket(db, order, partner)
		await Cart.recalcOrder(db, order_id, list, partner)
		await Cart.freeze(db, order_id, partner)


		
		await Shop.prepareModelsPropsValuesGroups(db, view.data, list)
		const products = list.map((pos, i) => {
			const product = Ecommerce.getProduct(view.data, {
				coupon: partner.key, 
				item: pos.item, 
				listname:'Корзина', 
				position: i + 1, 
				group_nick: pos.groups[0], 
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

		const r1 = await Cart.sendToAdmin(db, 'tocheck', order_id, view.visitor)
		if (!r1) return view.err('Не удалось отправить письмо менеджеру, позвоните, пожалуйста, по нашим <a href="/contacts">контактам</a>.')

		const r2 = await Cart.sendToUser(db, 'tocheck', order_id, view.visitor)
		if (!r2) return view.err('Не удалось отправить письмо клиенту, позвоните, пожалуйста, по нашим <a href="/contacts">контактам</a>.')

		return view.ret('Спасибо за заказ. Менеджер оповещён, ответит в течение 24 часов, как можно скорее.')
	}

	let ouser = order.email ? await User.getUserByEmail(view, order.email) : false

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



rest.addResponse('set-newactive', async view => {
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
rest.addResponse('set-remove', async view => {
	const active_id = await view.get('active_id#required')
	const partner = await view.get('partner')
	const db = await view.get('db')
	const item = await view.get('item#required')
	const user_id = await view.get('user_id#required')


	const utms = await view.get('getutms')
	const order_id = await Cart.castWaitActive(db, user_id, active_id, utms, false)
	await Cart.updateUtms(db, order_id, utms)
	await Cart.removeItem(db, order_id, item)
	const list = await Cart.getBasket(db, order, partner)
	await Cart.recalcOrder(db, order_id, list, partner)
	return view.ret()
})


rest.addResponse('set-add', async view => {
	const active_id = await view.get('active_id')
	const partner = await view.get('partner')
	const db = await view.get('db')

	const item = await view.get('item#required')

	
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
	await Cart.addItem(db, order_id, item.brendart[0], quantity)
	const list = await Cart.getBasket(db, order, partner)
	await Cart.recalcOrder(db, order_id, list, partner)
	return view.ret()
})

rest.addResponse('set-clear', async view => {
	const db = await view.get('db')
	const order_id = await view.get('order_id#required')
	const partner = await view.get('partner')
	const order = await Cart.getOrder(db, order_id)
	if (order.status != 'wait') return view.err('Заказ уже отправлен менеджеру')

	const list = view.data.list = await Cart.getBasket(db, order, partner)
	await Shop.prepareModelsPropsValuesGroups(db, view.data, list)
	//await Cart.prepareBasketListPropsValuesGroups(db, view.data, list)


	for (const field of ['name', 'phone','email','address','commentuser']) {
		Cart.saveFiled(db, order_id, field, '')
	}	

	await db.affectedRows('DELETE from shop_basket where order_id = :order_id', {order_id})


	await Cart.recalcOrder(db, order_id, [], partner)


	return view.ret()
})
rest.addResponse('set-field', async view => {
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