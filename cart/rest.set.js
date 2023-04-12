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
	const { db, terms, active_id, user } = await view.gets(['db', 'terms', 'user', 'active_id#required'])
	return view.err('Обработка формы не готова')
})

rest.addResponse('set-field', async view => {
	const { db, field, value, active_id, user } = await view.gets(['db', 'field', 'value', 'user', 'active_id#required'])
	if (field == 'name') {
		if (value.length < 5) return view.err('Вы указали очень короткие ФИО', 422)
	} else if (field == 'email') {
		if (!Mail.isEmail(value)) return view.err('Указан некорректный Email', 422)
	} else if (field == 'phone') {
		let test = value.replace(/\D/g,'')
		test = test.replace(/^8/,'7')
		if (test[0] != 7) return view.err("Уточните ваш телефон, номер должен начинаться с 7, мы работаем в России", 422)
		if (test.length != 11) return view.err("Уточните ваш телефон для связи, должно быть 11 цифр ("+test+")", 422)
	} else if (field == 'usercomment') {

	}
	const r = await Cart.saveFiled(view, active_id, field, value)
	if (!r) view.err('Ошибка на сервере', 500)
	return view.ret('Указанные данные сохранены')
})
rest.addResponse('set-add', async view => {
	const { db, item, active_id, user, count } = await view.gets(['db', 'item#required', 'user', 'active_id', 'count'])
	if (!active_id) {
		if (!user) {
			user = await User.create(view)
			User.setCookie(view, user)
		}
		active_id = await Cart.create(view, user)
	}

	await Cart.addItem(view, active_id, item, count)
	return view.ret('Готово')
})
rest.addResponse('set-remove', async view => {
	let { db, item, active_id, user } = await view.gets(['db', 'item#required', 'user', 'active_id'])
	if (!active_id) return view.err('Заказ не найден')
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