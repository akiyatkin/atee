import Catalog from "/-catalog/Catalog.js"
import User from '/-user/User.js'
import Mail from '/-mail'


const Cart = {
	toCheck: async (view, order_id) => {
		await Cart.setStatus(view, order_id, 'check')
		await Cart.sendToManager(view, 'tocheck', order_id)
	},
	sendToManager: async (view, sub, order_id) => {
		let { db } = await view.gets(['db'])
		const order = await Cart.getOrder(view, order_id)

		let list = await db.all(`
			SELECT model_nick, brand_nick, count, item_num 
			FROM cart_basket 
			WHERE order_id = :order_id
			ORDER by dateedit DESC
		`, {order_id})
		list = (await Promise.all(list.map(async pos => {
			const item = await Cart.getItem(view, order_id, pos.brand_nick, pos.model_nick, pos.item_num)
			item.count = pos.count
			return item
			
		}))).filter(item => !!item || !item['Цена'])


		const vars = await view.gets(['utms', 'host', 'ip'])

		const data = {order, vars, list}

		const tpl = await import('/-cart/mail.html.js').then(res => res.default)
		if (!tpl[sub]) return view.err('Не найден шаблон письма', 500)
		if (!tpl[sub + '_subject']) return view.err('Не найден шаблон темы', 500)
		const subject = tpl[sub + '_subject'](data)
		const html = tpl[sub](data)

		const r = await Mail.toAdmin(subject, html) //email не указан, чтобы нельзя было ответить на заявку, так как там будет аналитика
		if (!r) return view.err('Не удалось отправить письмо.', 500)
		return true
	},
	mergeuser: async (view, olduser, newuser) => {
		const order_id = await db.col('select order_id from cart_actives where user_id = :user_id', olduser)
		if (order_id) {
			await Cart.grant(view, newuser.user_id, order_id)
			//Изменили автора заказа
			await db.affectedRows(`
				UPDATE cart_orders
				SET user_id = :user_id
				WHERE order_id = :order_id
			`, {
				order_id, 
				user_id: newuser.user_id
			})
			//Удалили запись о правах
			await db.affectedRows('DELETE from cart_userorders where user_id = :user_id', olduser)
			await db.affectedRows('DELETE from cart_actives where user_id = :user_id', olduser)
		}
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
			await db.exec(`
				INSERT INTO cart_basket (
					order_id,
					cost,
					oldcost,
					discount,
					model_nick,
					brand_nick,
					item_num,
					hash,
					json,
					count,
					dateadd,
					dateedit 
				)
				SELECT 
					:nactive_id,
					cost,
					oldcost,
					discount,
					model_nick,
					brand_nick,
					item_num,
					hash,
					json,
					count,
					now(),
					now()
				FROM cart_basket
				WHERE order_id = :active_id
			`, {active_id, nactive_id})
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
			count, 
			UNIX_TIMESTAMP(datecheck) as datecheck, 
			UNIX_TIMESTAMP(datewait) as datewait, 
			user_id, 
			order_nick, 
			name, 
			phone, 
			email, 
			address, 
			commentuser, 
			status 
		FROM cart_orders
		WHERE order_id = :order_id 
	`, { order_id })
	
	order.commentuser = order.commentuser.replaceAll(/[<>\'\"\`]/ig,' ')
	order.name = order.name.replaceAll(/[<>\'\"\`]/ig,' ')
	order.phone = order.phone.replaceAll(/[<>\'\"\`]/ig,' ')


	const poss = await db.all(`
		SELECT count, cost 
		FROM cart_basket
		WHERE order_id = :order_id
	`, order)
	order.sum = 0
	order.count = 0
	for (const {count, cost} of poss) {
		order.count++
		order.sum += count * cost
	}

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
			order_id, model_nick, brand_nick, item_num, count, cost, dateadd, dateedit
		) VALUES (
			:order_id, :model_nick, :brand_nick, :item_num, :count, :cost, now(), now()
		)`, {order_id, ...item, count, cost: item['Цена']})
	} else {
		await db.exec(`
			UPDATE cart_basket 
			SET 
				count = :count, 
				cost = :cost, 
				dateedit = now()
			WHERE order_id = :order_id
			and brand_nick = :brand_nick
			and model_nick = :model_nick
			and item_num = :item_num
		`, {order_id, ...item, count, cost: item['Цена']})
	}

	// const poscount = await db.fetch(`
	// 	SELECT count FROM cart_basket 
	// 	WHERE order_id = :order_id 
	// `, {
	// 	order_id
	// })
	
	return true
}
Cart.grant = async (view, user_id, order_id) => {
	const { db } = await view.gets(['db'])
	await db.exec(`
		INSERT INTO cart_userorders (user_id, order_id) VALUES(:user_id, :order_id)
	`, {user_id, order_id})
	await db.exec(`
		REPLACE INTO cart_actives (user_id, order_id) VALUES(:user_id, :order_id)
	`, {user_id, order_id})
}
Cart.create = async (view, user) => {
	const { db } = await view.gets(['db'])
	const user_id = user.user_id

	const fields = ['name','phone','address','tk','zip','transport','city_id','pay','pvz','commentuser']
	//Берём данные из прошлой заявки у которой автор этот пользователь

	// const last_id = await db.col(`
	// 	select o.order_id 
	// 	from cart_orders o, cart_userorders uo
	// 	where o.order_id = uo.order_id
	// `)

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
	
	await Cart.grant(view, user_id, order_id)
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