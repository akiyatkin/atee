import Catalog from "/-catalog/Catalog.js"
import User from '/-user/User.js'
import Mail from '/-mail'


const Cart = {
	setPartner: async (db, order_id, partner) => {
		const partnerjson = JSON.stringify(partner)
		await db.exec(`
			UPDATE cart_orders
			SET
				partnerjson = :partnerjson
			WHERE order_id = :order_id
		`, { order_id, partnerjson })
	},
	getPartner: async (db, order_id, partnerjson) => {
		if (!partnerjson) partnerjson = await db.col("SELECT partnerjson from cart_orders where order_id = :order_id", {order_id})
		const partner = partnerjson ? JSON.parse(partnerjson) : false
		return partner
	},
	
	freeze: async (db, base, order_id, partner) => {
		const list = await Cart.getBasketCatalog(db, base, order_id, partner)
		for (const item of list) {
			const json = JSON.stringify(item)
			await db.exec(`
				UPDATE 
					cart_basket
				SET
					json = :json
				WHERE order_id = :order_id 
					and item_num = :item_num 
					and model_nick = :model_nick
					and brand_nick = :brand_nick
			`, { json, order_id, ...item })

		}
		await db.exec(`
			UPDATE 
				cart_orders
			SET
				freeze = 1
			WHERE order_id = :order_id
		`, { order_id })
	},
	getBasketCatalog:  async (db, base, order_id, partner) => {
		let list = await db.all(`
			SELECT model_nick, brand_nick, count, item_num 
			FROM cart_basket 
			WHERE order_id = :order_id
			ORDER by dateedit DESC
		`, {order_id})
		list = (await Promise.all(list.map(async pos => {
			const item = await Cart.getItem(db, base, order_id, pos.brand_nick, pos.model_nick, pos.item_num, partner)
			item.count = pos.count
			return item
		}))).filter(item => !!item || !item['Цена'])
		list.forEach(pos => {
			pos.sum = (pos['Цена'] || 0) * (pos.count || 0)
		})
		return list
	},
	getBasketFreeze:  async (db, order_id) => {
		let list = await db.all(`
			SELECT json, count
			FROM cart_basket 
			WHERE order_id = :order_id
			ORDER by dateedit DESC
		`, {order_id})
		list = list.map(async pos => {
			const item = JSON.parse(pos.json)
			item.count = pos.count
			return item
		})
		list.forEach(pos => {
			pos.sum = (pos['Цена'] || 0) * (pos.count || 0)
		})
		return list
	},
	getBasket: async (db, base, order_id, freeze, partner) => {
		//const freeze = await db.col("SELECT freeze from cart_orders where order_id = :order_id", {order_id})
		if (freeze) {
			return Cart.getBasketFreeze(db, order_id)
		} else {
			return Cart.getBasketCatalog(db, base, order_id, partner)
		}
	},
	
	sendToUser: async (view, sub, order_id) => {
		const {subject, html, email} = await Cart.getMailOpt(view, sub, order_id)
		return Mail.toUser(subject, html, email) //В письме заказа не должно быть аналитики
	},
	sendToAdmin: async (view, sub, order_id) => {
		const {subject, html, email} = await Cart.getMailOpt(view, sub, order_id)
		return Mail.toAdmin(subject, html, email) //В письме заказа не должно быть аналитики
	},
	getMailOpt: async (view, sub, order_id) => {
		const { db, base } = await view.gets(['db','base'])
		const order = await Cart.getOrder(db, order_id)
		const list = await Cart.getBasket(db, base, order_id, order.freeze, order.partner)
		const vars = await view.gets(['utms', 'host', 'ip'])
		const data = {order, vars, list}
		const email = order.email
		const tpl = await import('/-cart/mail.html.js').then(res => res.default)
		if (!tpl[sub]) return view.err('Не найден шаблон письма', 500)
		if (!tpl[sub + '_subject']) return view.err('Не найден шаблон темы', 500)
		const subject = tpl[sub + '_subject'](data)
		const html = tpl[sub](data)
		return {subject, html, email}
	},
	mergeuser: async (db, olduser, newuser) => {
		const order_id = await db.col('select order_id from cart_actives where user_id = :user_id', olduser)
		if (order_id) {
			await Cart.grant(db, newuser.user_id, order_id)
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
		const order = await Cart.getOrder(db, active_id)
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
Cart.getItem = async (db, base, order_id, brand_nick, model_nick, item_num, partner) => {
	const item = await Catalog.getItemByNick(db, base, brand_nick, model_nick, item_num, partner)
	delete item.item_props
	delete item.model_props
	delete item.card_props
	return item
}

Cart.getOrder = async (db, order_id) => {
	if (db.gets) db = await db.get(['db'])

	const order = await db.fetch(`
		SELECT 
			order_id, 
			UNIX_TIMESTAMP(datewait) as datewait, 
			UNIX_TIMESTAMP(datecheck) as datecheck, 
			UNIX_TIMESTAMP(datecancel) as datecancel, 
			UNIX_TIMESTAMP(datecomplete) as datecomplete, 
			user_id, 
			order_nick, 
			name, 
			phone, 
			email, 
			address, 
			commentuser, 
			partnerjson,
			status
		FROM cart_orders
		WHERE order_id = :order_id 
	`, { order_id })
	if (!order) return order
	if (order.commentuser) order.commentuser = order.commentuser.replaceAll(/[<>\'\"\`]/ig,' ')
	if (order.name) order.name = order.name.replaceAll(/[<>\'\"\`]/ig,' ')
	if (order.phone) order.phone = order.phone.replaceAll(/[<>\'\"\`]/ig,' ')

	// if (order.status == 'wait') {
	// 	delete order.datecomplete
	// 	delete order.datecancel
	// 	delete order.datecheck
	// }
	// if (order.status == 'check') {
	// 	delete order.datecomplete
	// 	delete order.datecancel
	// }
	// if (order.status == 'complete') {
	// 	delete order.datecancel
	// }
	// if (order.status == 'cancel') {
	// 	delete order.datecomplete
	// }
	
	order.partner = await Cart.getPartner(db, order_id, order.partnerjson)

	return order
}
Cart.removeItem = async (db, order_id, item) => {
	await db.exec(`
		DELETE FROM cart_basket 
		WHERE order_id = :order_id 
			and item_num = :item_num 
			and model_nick = :model_nick
			and brand_nick = :brand_nick
	`, {
		order_id, ...item
	})
	// await Cart.recalcOrder(db, order_id)
	// const order = await Cart.getOrder(db, order_id)
	// await db.exec(`
	// 	UPDATE cart_orders 
	// 	SET sum = :sum, count = :count
	// 	WHERE order_id = :order_id
	// `, order)
}
Cart.addItem = async (db, order_id, item, count = 0) => {

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
			SET 
				count = :count, 
				dateedit = now()
			WHERE order_id = :order_id
			and brand_nick = :brand_nick
			and model_nick = :model_nick
			and item_num = :item_num
		`, {order_id, ...item, count})
	}
	await db.exec(`
		UPDATE cart_orders 
		SET dateedit = now()
		WHERE order_id = :order_id
	`, {order_id})
	//await Cart.recalcOrder(db, order_id)
	
	// const poscount = await db.fetch(`
	// 	SELECT count FROM cart_basket 
	// 	WHERE order_id = :order_id 
	// `, {
	// 	order_id
	// })
	
	return true
}
Cart.recalcOrder = async (db, base, order_id, partner) => {
	const list = await Cart.getBasketCatalog(db, base, order_id, partner)
	// const list = await db.all(`
	// 	SELECT count, cost 
	// 	FROM cart_basket
	// 	WHERE order_id = :order_id
	// `, { order_id })
	let sum = 0
	let count = 0
	for (const item of list) {
		count++
		sum += item.count * item['Цена']
	}
	await db.exec(`
		UPDATE cart_orders 
		SET sum = :sum, count = :count
		WHERE order_id = :order_id
	`, {order_id, sum, count})
}
Cart.grant = async (db, user_id, order_id) => {
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
		fields.forEach(key => row[key] = '')
	}
	row['email'] = user['email'] || ''
	row['order_nick'] = await Cart.createNick(view, user)
	row['user_id'] = user_id

	const order_id = await db.insertId(`
		INSERT INTO cart_orders (${Object.keys(row).join(',')}, datecreate, datewait, dateedit) 
		VALUES (:${Object.keys(row).join(',:')}, now(), now(), now())
	`, row);
	if (!order_id) return false;
	
	await Cart.grant(db, user_id, order_id)
	return order_id
}
Cart.setDate = async (db, order_id, status) => {
	return await db.exec(`
		UPDATE cart_orders
		SET date${status} = now()
		WHERE order_id = ${order_id}
	`)
}
Cart.setStatus = async (db, order_id, status) => {
	return await db.exec(`
		UPDATE cart_orders 
		SET status = :status
		WHERE order_id = :order_id
	`, {status, order_id})
}

		
export default Cart