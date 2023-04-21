import Catalog from "/-catalog/Catalog.js"
import User from '/-user/User.js'
import Mail from '/-mail'


const Cart = {
	toCheck: async (view, order_id) => {
		await Cart.setStatus(view, order_id, 'check')
		await Cart.sendToManager(view, 'tocheck', order_id)
	},
	sendToManager: async (view, sub, order_id) => {
		const order = await Cart.getOrder(view, order_id)
		const vars = await view.gets(['utms', 'host', 'ip'])
		const data = {order, vars}
		const tpl = await import('/-cart/mail.html.js').then(res => res.default)
		if (!tpl[sub]) return view.err('Не найден шаблон письма', 500)
		if (!tpl[sub + '_subject']) return view.err('Не найден шаблон темы', 500)
		const subject = tpl[sub + '_subject'](data)
		const html = tpl[sub](data)

		const r = await Mail.toAdmin(subject, html) //email не указан, чтобы нельзя было ответить на заявку, так как там будет аналитика
		if (!r) return view.err('Не удалось отправить письмо.', 500)
		return true
	},
	castWaitActive: async (view, active_id) => {
		let { db, user } = await view.gets(['db', 'user'])
		if (!user) {
			user = await User.create(view)
			User.setCookie(view, user)
		}
		if (!active_id) return Cart.create(view, user)
		const order = await Cart.getOrder(view, active_id)
		if (order.status == 'wait') return active_id
		let nactive_id = await db.col(`
			SELECT uo.order_id
			FROM cart_userorders uo, cart_orders o
			WHERE uo.order_id != :active_id and uo.order_id = o.order_id and uo.user_id = :user_id and o.status = 'wait'
		`, {
			active_id, 
			user_id:user.user_id
		})
		if (!nactive_id) {
			//Другой активной нет, надо создать и скопировать
			nactive_id = await Cart.create(view, user)

		} else {
			await db.exec(`
				UPDATE cart_actives
				SET order_id = :active_id
				WHERE user_id = :user_id
			`, {
				active_id: nactive_id, 
				user_id:user.user_id
			})
		}
		return nactive_id
	}
}

Cart.createNick = async (view, user) => {
	const { db } = await view.gets(['db'])
	// Количество дней нужно округлить в меньшую сторону,
	// чтобы узнать точное количество прошедших дней
	// 86400 - количество секунд в 1 дне (60 * 60 * 24) + 000
	const days = Math.floor((Date.now() - new Date('2020-01-01 00:00:00').getTime()) / 86400000)

	const num = await db.col(`SELECT count(*) + 1 FROM cart_orders WHERE user_id = :user_id`, user)
	const order_nick = days + '-' + user.user_id + '-' + num
	return order_nick
}
Cart.saveFiled = async (view, order_id, field, value) => {
	const { db } = await view.gets(['db'])
	return await db.exec(`
		UPDATE cart_orders 
		SET ${field} = :value, dateedit = now()
		WHERE order_id = :order_id
	`, {order_id, value})
}
Cart.getItem = async (view, order_id, brand_nick, model_nick, item_num) => {
	return Catalog.getItemByNick(view, brand_nick, model_nick, item_num)
}
Cart.removeItem = async (view, order_id, item) => {
	const { db } = await view.gets(['db'])
	return await db.exec(`
		DELETE FROM cart_basket 
		WHERE order_id = :order_id 
			and item_num = :item_num 
			and model_nick = :model_nick
			and brand_nick = :brand_nick
	`, {
		order_id, ...item
	})
}
Cart.getOrder = async (view, order_id) => {
	const { db } = await view.gets(['db'])
	const order = await db.fetch(`
		SELECT 
			order_id, 
			UNIX_TIMESTAMP(datecheck) as datecheck, 
			user_id, order_nick, name, phone, email, address, commentuser, status 
		FROM cart_orders
		WHERE order_id = :order_id 
	`, { order_id })
	return order
}
Cart.addItem = async (view, order_id, item, count = 0) => {
	const { db } = await view.gets(['db'])
	const pos = await db.fetch(`
		SELECT count FROM cart_basket 
		WHERE order_id = :order_id 
			and item_num = :item_num 
			and model_nick = :model_nick
			and brand_nick = :brand_nick
		FOR UPDATE
	`, {
		order_id, ...item
	})
	if (!pos) {
		await db.exec(`
			INSERT INTO cart_basket (
			order_id, model_nick, brand_nick, item_num, count, dateadd, dateedit
		) VALUES (
			:order_id, :model_nick, :brand_nick, :item_num, :count, now(), now()
		)`, {order_id, ...item, count})
	} else {
		await db.exec(`
			UPDATE cart_basket 
			SET count = :count, dateedit = now()
			WHERE order_id = :order_id
			and brand_nick = :brand_nick
			and model_nick = :model_nick
			and item_num = :item_num
		`, {order_id, ...item, count})
	}
	return true
}
Cart.create = async (view, user) => {
	const { db } = await view.gets(['db'])
	const user_id = user.user_id

	const fields = ['name','phone','address','tk','zip','transport','city_id','pay','pvz','commentuser']
	//Берём данные из прошлой заявки у которой автор этот пользователь
	let row = await db.fetch(`
		SELECT ${fields.join(',')} 
		FROM cart_orders 
		WHERE user_id = :user_id 
		ORDER BY dateedit DESC
	`, user)

	if (!row) {
		row = {}
		fields.forEach(key => row[key] = null)
	}
	row['email'] = user['email'] || null
	row['order_nick'] = await Cart.createNick(view, user)
	row['user_id'] = user_id

	const order_id = await db.insertId(`
		INSERT INTO cart_orders (${Object.keys(row).join(',')}, datecreate, datewait, dateedit) 
		VALUES (:${Object.keys(row).join(',:')}, now(), now(), now())
	`, row);
	if (!order_id) return false;
	
	await db.exec(`
		INSERT INTO cart_userorders (user_id, order_id) VALUES(:user_id, :order_id)
	`, {user_id, order_id})
	await db.exec(`
		REPLACE INTO cart_actives (user_id, order_id) VALUES(:user_id, :order_id)
	`, {user_id, order_id})
	
	
	return order_id
}

Cart.setStatus = async (view, order_id, status) => {
	const { db } = await view.gets(['db'])
	return await db.exec(`
		UPDATE cart_orders 
		SET status = '${status}', date${status} = now()
		WHERE order_id = ${order_id}
	`)
}

		
export default Cart