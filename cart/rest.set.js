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

rest.addResponse('set-submit', async view => {
	const { db, terms, active_id, user, user_id } = await view.gets(['db', 'terms', 'user#required', 'user_id', 'active_id#required'])
	const order = await Cart.getOrder(view, active_id)
	if (!order.count) return view.err('В заказе нет товаров', 422)
	for (const check of ['email','name','address','phone']) if (!order[check]) return view.err('Заполнены не все поля', 422)
	if (order.status != 'wait') return view.err('Заказ уже отправлен менеджеру')
	const ready = () => view.ret('Спасибо за заказ. Менеджер оповещён, ответит в течение 24 часов, как можно скорее.')
	if (user.email == order.email) {
		//Это я и я зарегистрирован
		await Cart.toCheck(view, active_id)
		return ready()
	}
	let ouser = order.email ? await User.getUserByEmail(view, order.email) : false
	if (user.manager) {
		if (!ouser) {
			ouser = await User.create(view)
			await User.sendup(view, ouser.user_id, order.email) //Сохраняем email нового пользователя и отправляем письмо ему
		}
		if (ouser.user_id != user.user_id) await Cart.grant(view, ouser.user_id, order.order_id) //Указанному пользователю даём доступ к заказу. У него он будет активным
		await Cart.toCheck(view, active_id)
		return ready()
	}

	if (ouser) { //Есть зарегистрированный пользователь по заявке, найденный по email
		await User.sendin(view, ouser)
		if (user.email) { //При авторизации заказ не передастся будет просто ошибка
			return view.err('Вам нужно авторизоваться (' + order.email + ') и повторить заказ или изменить email. Сейчас вы в другом аккаунте (' + user.email + '). На почту отправлена ссылка.', 422)
		} else { //Заказ передастся при авторизации в томже браузере
			return view.err('Вам нужно авторизоваться (' + order.email + ') в этом браузере. Корзина не потеряется. На почту отправлена ссылка.', 422)
		}			
	}

	//Пользователя по заявке нет
	if (!user.email) { //текущий пользователь не зарегистрирован
		await User.sendup(view, user.user_id, order.email)
	} else { //Текущий пользователь зарегистрирован
		const ouser = await User.create(view)
		await Cart.grant(view, ouser.user_id, order.order_id) //И новому пользователю даём доступ к заказу
		//Заказ может быть активен у двух пользователей
		await User.sendup(view, ouser.user_id, order.email) //Сохраняем email нового пользователя и отправляем письмо ему
	}
	await Cart.toCheck(view, active_id)	
	return ready()
})

rest.addResponse('set-field', async view => {
	const { db, field, value, active_id, user } = await view.gets(['db', 'field', 'value', 'user', 'active_id#required'])
	const order = await Cart.getOrder(view, active_id)
	if (order[field] == value) return view.ret('Данные сохранены')
	if (order.status != 'wait') return view.err('Заявка уже отправлена менеджеру', 422)
	const errorsave = async msg => {
		const r = await Cart.saveFiled(view, active_id, field, '')
		if (!r) return view.err('Ошибка на сервере', 500)
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
	const r = await Cart.saveFiled(view, active_id, field, value)
	if (!r) return view.err('Ошибка на сервере', 500)
	return view.ret('Указанные данные сохранены')
})
rest.addResponse('set-newactive', async view => {
	const { order, db, user_id } = await view.gets(['db', 'order#required','user_id'])
	await db.exec(`
		UPDATE cart_actives
		SET order_id = :active_id
		WHERE user_id = :user_id
	`, {
		active_id: order.order_id, 
		user_id: user_id
	})
	return view.ret()
})
rest.addResponse('set-add', async view => {
	let { active_id } = await view.gets(['active_id'])
	const { db, item, count } = await view.gets(['db', 'item#required', 'count'])
	const nactive_id = await Cart.castWaitActive(view, active_id)
	view.ans.newactive = active_id != nactive_id
	await Cart.addItem(view, nactive_id, item, count)
	return view.ret('Готово')
})
rest.addResponse('set-remove', async view => {
	let { db, item, active_id } = await view.gets(['db', 'item#required', 'active_id'])
	if (!active_id) return view.err('Заказ не найден')
	active_id = await Cart.castWaitActive(view, active_id)
	await Cart.removeItem(view, active_id, item)
	return view.ret('Готово')
})




rest.addResponse('set-reset', async view => {
	await view.gets(['admin'])
	const { db } = await view.gets(['db'])

	const res = await db.exec(`DROP TABLE IF EXISTS 
		cart_orders,
		cart_transports,
		cart_basket,
		cart_actives,
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