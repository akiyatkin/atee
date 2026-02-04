
import Shop from "/-shop/Shop.js"
import User from '/-user/User.js'
import Mail from '@atee/mail'
import nicked from '@atee/nicked'
import crypto from 'node:crypto'
import Access from "/-controller/Access.js"

const Cart = {
	fnv1a32: str => {
		const FNV_OFFSET_BASIS = 2166136261;
		const FNV_PRIME_32 = 16777619;
		
		let hash = FNV_OFFSET_BASIS;
		for (let i = 0; i < str.length; i++) {
			hash ^= str.charCodeAt(i);
			hash = Math.imul(hash, FNV_PRIME_32) >>> 0;
		}
		return hash; // Всегда 32-битное число
	},
	getFixed32BitHash: (str) => {
		return Cart.fnv1a32(str).toString(16).padStart(8, '0');
	},
	biblio: async (view, db, order_id) => {
		const order = await Cart.getOrder(db, order_id)
		const {sum, count} = await db.fetch('select sum, count from shop_orders where order_id = :order_id', {order_id})
		const data = {sum, count}
		for (const i of ['order_id', 'name', 'address', 'order_nick', 'phone', 'email']) data[i] = order[i] ?? ''
		data['text'] = order['commentuser']	
		const Biblio = await import("/-biblio/index.js").then(r => r.default)
		await Biblio.save(view, db, order.user_id, 'Заказ', data)
	},
	setPartner: async (db, order_id, partner) => {
		const partnerjson = JSON.stringify(partner)
		await db.exec(`
			UPDATE shop_orders
			SET
				partnerjson = :partnerjson
			WHERE order_id = :order_id
		`, { order_id, partnerjson })
	},
	
	

	


	sendToUser: async (db, sub, order_id, visitor, partner) => {
		const {subject, html, email} = await Cart.getMailOpt(db, sub, order_id, visitor, partner)
		return Mail.toUser(subject, html, email) //В письме заказа не должно быть аналитики
	},
	sendToAdmin: async (db, sub, order_id, visitor, partner) => {
		const {subject, html, email} = await Cart.getMailOpt(db, sub, order_id, visitor, partner)
		return Mail.toAdminSplit(subject, html, email) //В письме заказа не должно быть аналитики
	},
	getMailOpt: async (db, sub, order_id, visitor, partner) => {
		const data = await Cart.getMailData(db, sub, order_id, visitor, partner)
		await Shop.prepareModelsPropsValuesGroups(db, data, data.list)
		const email = data.order.email
		const tpl = await import('/-shop/mail.html.js').then(res => res.default)
		if (!tpl[sub]) return view.err('Не найден шаблон письма', 500)
		if (!tpl[sub + '_subject']) return view.err('Не найден шаблон темы', 500)
		const subject = tpl[sub + '_subject'](data)
		const html = tpl[sub](data)
		return {subject, html, email}
	},
	getMailData: async (db, sub, order_id, visitor, partner) => {
		const order = await Cart.getOrderById(db, order_id)
		let list = await Cart.basket.get(db, order, partner)
		list = list.filter(pos => pos.quantity > 0)
		const vars = {
			host: visitor.client.host,
			ip: visitor.client.ip
		}
		const data = {order, vars, list}
		return data
	},


	deleteUser: async (db, user_id) => {
		await db.exec(`
			UPDATE shop_orders
			SET user_id = null
			WHERE user_id = :user_id
		`, {user_id})
		await db.exec('DELETE from shop_userorders where user_id = :user_id', {user_id})
		await db.exec('DELETE from shop_actives where user_id = :user_id', {user_id})
	},
	mergeuser: async (db, olduser, newuser) => { //olduser будет удалён
		const order_id = await Cart.getWaitId(db, olduser.user_id) //order_id долна быть или удалена или перенесена
		if (order_id) {
			//У olduser есть активная заявка, надо позиции из неё пернести в заявку newuser
			let wait_id = await Cart.getWaitId(db, newuser.user_id)
			if (wait_id) {
				//Содержание order_id надо перенести в wait_id и удалить order_id
				//Чтобы переносить надо знать есть ли уже такая позиция в заявке
				const rows = await db.all(`
					select quantity, brendart_nick 
					from shop_basket 
					where order_id = :order_id
				`, {order_id})
				for (const row of rows) {
					await Cart.addItem(db, wait_id, row.brendart_nick, row.quantity)
				}
				await db.exec(`
					REPLACE INTO shop_actives (user_id, order_id) VALUES(:user_id, :wait_id)
				`, {user_id: newuser.user_id, wait_id})

				const oldorder = await Cart.getOrder(db, order_id)

				if (oldorder.name) {
					await db.affectedRows(`
						UPDATE shop_orders
						SET name = :name
						WHERE order_id = :order_id
					`, {
						name: oldorder.name,
						order_id: wait_id
					})
				}
				if (oldorder.phone) {
					await db.affectedRows(`
						UPDATE shop_orders
						SET phone = :phone
						WHERE order_id = :order_id
					`, {
						phone: oldorder.phone,
						order_id: wait_id
					})
				}
				if (oldorder.email) {
					await db.affectedRows(`
						UPDATE shop_orders
						SET email = :email
						WHERE order_id = :order_id
					`, {
						email: oldorder.email,
						order_id: wait_id
					})
				}
				if (oldorder.address) {
					await db.affectedRows(`
						UPDATE shop_orders
						SET address = :address
						WHERE order_id = :order_id
					`, {
						address: oldorder.address,
						order_id: wait_id
					})
				}
				if (oldorder.commentuser) {
					await db.affectedRows(`
						UPDATE shop_orders
						SET commentuser = :commentuser
						WHERE order_id = :order_id
					`, {
						commentuser: oldorder.commentuser,
						order_id: wait_id
					})
				}
				
				await db.affectedRows('DELETE from shop_orders where order_id = :order_id', {order_id})
				await db.affectedRows('DELETE from shop_basket where order_id = :order_id', {order_id})
				await db.affectedRows('DELETE from shop_transports where order_id = :order_id', {order_id})

			} else {
				//Изменили автора заказа и дали права
				await Cart.grant(db, newuser.user_id, order_id)
				await db.affectedRows(`
					UPDATE shop_orders
					SET user_id = :user_id
					WHERE order_id = :order_id
				`, {
					order_id, 
					user_id: newuser.user_id
				})
			}
		}
		//Удалили запись о правах
		await db.affectedRows('DELETE from shop_userorders where user_id = :user_id', olduser)
		await db.affectedRows('DELETE from shop_actives where user_id = :user_id', olduser)
	},
	getWaitId: async (db, user_id) => {
		const wait_id = await db.col(`
			SELECT uo.order_id
			FROM shop_userorders uo, shop_orders o
			WHERE uo.order_id = o.order_id and uo.user_id = :user_id and o.status = 'wait'
		`, { user_id })
		return wait_id
	},
	copyBasket: async (db, from_id, to_id) => {
		const bind = await Shop.getBind(db)
		await db.exec(`
			INSERT INTO shop_basket (order_id, brendart_nick, quantity, dateadd, dateedit, modification)
			SELECT :to_id, ba.brendart_nick, ba.quantity, now(), now(), ba.modification
			FROM shop_basket ba, sources_wvalues wva, sources_values va
			WHERE ba.order_id = :from_id and ba.brendart_nick = va.value_nick and wva.entity_id = :brendart_prop_id and wva.prop_id = wva.entity_id and va.value_id = wva.value_id
		`, {...bind, from_id, to_id})
	},
	castWaitActive: async (db, user_id, active_id, utms, nocopy = false) => {
		let user = await User.getUserById(db, user_id)
		if (!active_id) return Cart.create(db, user, utms)
		const order = await Cart.getOrder(db, active_id)
		if (order.status == 'wait') return active_id
		let nactive_id
		if (user.manager) {
			//Нужно всегда копировать и не добавлять в текущую в ожидании. Умею очищать
			nactive_id = await Cart.create(db, user, utms, order.order_id)
			//Отправленная заявка достаётся из json, а в ожидании достаётся из каталога и позции могут пропасть.
			//При копировании надо скопировать только те что есть
			await Cart.copyBasket(db, active_id, nactive_id)
		} else {
			nactive_id = await db.col(`
				SELECT uo.order_id
				FROM shop_userorders uo, shop_orders o
				WHERE uo.order_id != :active_id and uo.order_id = o.order_id and uo.user_id = :user_id and o.status = 'wait'
			`, {
				active_id, 
				user_id:user.user_id
			})
			if (!nactive_id) { 
				//Другого заказа, который можно сделать активным нет, надо создать и скопировать
				nactive_id = await Cart.create(db, user, utms)
				if (!nocopy) {
					await Cart.copyBasket(db, active_id, nactive_id)
				}
			} else {
				await db.exec(`
					UPDATE shop_actives
					SET order_id = :active_id
					WHERE user_id = :user_id
				`, {
					active_id: nactive_id, 
					user_id:user.user_id
				})
			}
		}
		return nactive_id
	}
}

Cart.createNick = async (db, user) => {
	// Количество дней нужно округлить в меньшую сторону,
	// чтобы узнать точное количество прошедших дней
	// 86400 - количество секунд в 1 дне (60 * 60 * 24) + 000
	const days = Math.floor((Date.now() - new Date('2020-01-01 00:00:00').getTime()) / 86400000)

	const num = await db.col(`SELECT count(*) + 1 FROM shop_orders WHERE user_id = :user_id`, user)
	const order_nick = days + '-' + user.user_id + '-' + num
	return order_nick
}
Cart.saveFiled = async (db, order_id, field, value) => {
	return await db.affectedRows(`
		UPDATE shop_orders 
		SET ${field} = :value, dateedit = now()
		WHERE order_id = :order_id
	`, {order_id, value})
}
// Cart.getItem = async (db, base, order_id, brand_nick, model_nick, item_num, partner) => {
// 	const item = await Catalog.getItemByNick(db, base, brand_nick, model_nick, item_num, partner)
// 	if (!item) return item
// 	delete item.item_props
// 	delete item.model_props
// 	delete item.card_props
// 	return item
// }
export default Cart
Cart.getOrderById = async (db, order_id) => {

	const order = await db.fetch(`
		SELECT 
			order_id, 
			UNIX_TIMESTAMP(datewait) as datewait, 
			UNIX_TIMESTAMP(datecheck) as datecheck, 
			UNIX_TIMESTAMP(datecancel) as datecancel, 
			UNIX_TIMESTAMP(datecomplete) as datecomplete, 
			user_id, 
			order_nick, 
			freeze + 0 as freeze, 
			name, 
			phone, 
			email, 
			address, 
			commentuser, 
			partnerjson,
			status
		FROM shop_orders
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
	
	order.partner = order.partnerjson ? JSON.parse(order.partnerjson) : false

	return order
}
Cart.getOrder = Cart.getOrderById //depricated


Cart.removeItem = async (db, order_id, item) => {
	const brendart_nick = item.brendart[0]
	await db.exec(`
		DELETE FROM shop_basket 
		WHERE order_id = :order_id 
			and brendart_nick = :brendart_nick
	`, {order_id, brendart_nick})
	await db.exec(`
		UPDATE shop_orders 
		SET dateedit = now()
		WHERE order_id = :order_id
	`, {order_id})
	// await Cart.recalcOrder(db, order_id)
	// const order = await Cart.getOrder(db, order_id)
	// await db.exec(`
	// 	UPDATE shop_orders 
	// 	SET sum = :sum, quantity = :quantity
	// 	WHERE order_id = :order_id
	// `, order)
}
Cart.addItem = async (db, order_id, brendart_nick, quantity = 0, modification = '') => {
	//const brendart_nick = item.brendart[0]
	const pos = await db.fetch(`
		SELECT quantity FROM shop_basket 
		WHERE order_id = :order_id and brendart_nick = :brendart_nick
		FOR UPDATE
	`, {order_id, brendart_nick})

	if (!pos) {
		await db.exec(`
			INSERT INTO shop_basket (
			order_id, brendart_nick, quantity, dateadd, dateedit, modification
		) VALUES (
			:order_id, :brendart_nick, :quantity, now(), now(), :modification
		)`, {order_id, brendart_nick, quantity, modification})
	} else {
		await db.exec(`
			UPDATE shop_basket 
			SET 
				quantity = :quantity, 
				modification = :modification,
				dateedit = now()
			WHERE order_id = :order_id and brendart_nick = :brendart_nick
		`, {order_id, brendart_nick, quantity, modification})
	}
	await db.exec(`
		UPDATE shop_orders 
		SET dateedit = now()
		WHERE order_id = :order_id
	`, {order_id})
	//await Cart.recalcOrder(db, order_id)
	
	// const poscount = await db.fetch(`
	// 	SELECT count FROM shop_basket 
	// 	WHERE order_id = :order_id 
	// `, {
	// 	order_id
	// })	
	// return true
}
// Cart.prepareBasketListPropsValuesGroups = async (db, data, list) => {
// 	data.props ??= {}
// 	data.values ??= {}
// 	data.groups ??= {}
// 	for (const {item} of list) {
// 		for (const prop_nick in item) {
// 			const prop = data.props[prop_nick] = await Shop.getPropByNick(db, prop_nick)
// 			if (prop.type != 'value') continue
// 			for (const value_nick of item[prop_nick]) {
// 				data.values[value_nick] = await Shop.getValueByNick(db, value_nick)
// 			}
// 		}
// 	}
	
// 	for (const pos of list) {
// 		data.groups[pos.groups[0]] = await Shop.getGroupByNick(db, pos.groups[0])
// 	}
// }




Cart.recalcOrder = async (db, order_id, list, partner) => {
	await Cart.setPartner(db, order_id, partner)
	const sum = list.reduce((sum, pos) => sum + pos.sum, 0)
	const count = list.length
	await db.exec(`
		UPDATE shop_orders 
		SET sum = :sum, count = :count
		WHERE order_id = :order_id
	`, {order_id, sum, count})
}
Cart.grant = async (db, user_id, order_id) => {
	await db.exec(`
		REPLACE INTO shop_userorders (user_id, order_id) VALUES(:user_id, :order_id)
	`, {user_id, order_id})
	await db.exec(`
		REPLACE INTO shop_actives (user_id, order_id) VALUES(:user_id, :order_id)
	`, {user_id, order_id})
}
Cart.create = async (db, user, utms = {}, sorder_id = false) => {
	const user_id = user.user_id

	const fields = [
		'name','phone','address','tk','zip','transport','city_id','pay','pvz','commentuser',
		'source', 'content', 'campaign', 'medium', 'term', 'referrer_host'
	]
	//Берём данные из прошлой заявки у которой автор этот пользователь

	//'source', 'content', 'campaign', 'medium', 'term', 'referrer_host',
	//'source_nick', 'content_nick', 'campaign_nick', 'medium_nick', 'term_nick', 'referrer_host_nick',


	let row
	if (sorder_id) {
		fields.push('email')
		row = await db.fetch(`
			SELECT ${fields.join(',')} 
			FROM shop_orders 
			WHERE order_id = :sorder_id
		`, {sorder_id})
	} else {
		row = await db.fetch(`
			SELECT ${fields.join(',')} 
			FROM shop_orders 
			WHERE user_id = :user_id 
			ORDER BY dateedit DESC
		`, user)
	}
	if (!row) {
		row = {}
		fields.forEach(key => row[key] = '')
	}
	
	
	//row['address'] = user['address'] || ''
	//row['phone'] = user['phone'] || ''
	row['transport'] = row['transport'] || null
	row['city_id'] = row['city_id'] || null
	row['pay'] = row['pay'] || null
	

	row['email'] = row['email'] || user['email'] || ''
	row['order_nick'] = await Cart.createNick(db, user)
	row['user_id'] = user_id


	let isnewutms = false
	for (const uname in utms) {
		if (utms[uname]) {
			isnewutms = true
			break
		}
	}
	if (isnewutms) {
		for (const uname in utms) {
			row[uname] = utms[uname]
			row[uname + '_nick'] = nicked(utms[uname])
		}
	}

	const order_id = await db.insertId(`
		INSERT INTO shop_orders (${Object.keys(row).join(',')}, datecreate, datewait, dateedit) 
		VALUES (:${Object.keys(row).join(',:')}, now(), now(), now())
	`, row);
	if (!order_id) return false;
	
	await Cart.grant(db, user_id, order_id)
	return order_id
}
Cart.setDate = async (db, order_id, status) => {
	return await db.exec(`
		UPDATE shop_orders
		SET date${status} = now()
		WHERE order_id = ${order_id}
	`)
}
Cart.updateUtms = async (db, order_id, utms) => {
	utms['referrer_host_nick'] = nicked(utms.referrer_host)
	utms['source_nick'] = nicked(utms.source)
	utms['content_nick'] = nicked(utms.content)
	utms['campaign_nick'] = nicked(utms.campaign)
	utms['medium_nick'] = nicked(utms.medium)
	utms['term_nick'] = nicked(utms.term)	

	await db.exec(`
		UPDATE shop_orders 
		SET 
			referrer_host = :referrer_host,
			source = :source,
			content = :content,
			campaign = :campaign,
			medium = :medium,
			term = :term,
			referrer_host_nick = :referrer_host_nick,
			source_nick = :source_nick,
			content_nick = :content_nick,
			campaign_nick = :campaign_nick,
			medium_nick = :medium_nick,
			term_nick = :term_nick
		WHERE 
			order_id = :order_id
	`, {order_id, ...utms})
}
Cart.setStatus = async (db, order_id, status) => {
	return await db.exec(`
		UPDATE shop_orders 
		SET status = :status
		WHERE order_id = :order_id
	`, {status, order_id})
}






Cart.basket = {}
Cart.basket.createHashStore = Access.poke(async (db, item) => {
	const {json_hash, hash, json_cost} = await Cart.basket.createHashJSON(db, item)
	return json_hash
})
Cart.basket.createHashJSON = async (db, orig_item) => {
	const item = {...orig_item}
	for (const prop_nick in item) {
		const prop = await Shop.getPropByNick(db, prop_nick)	
		if (prop.type == 'number') { //Нужно сохранить без scale и когда достаётся применить новый на тот момент scale
			item[prop_nick] = item[prop_nick].map(num => num / 10 ** prop.scale)
		}
	}
	const json = JSON.stringify(item)
	const json_hash = Cart.getFixed32BitHash(json)
	const json_cost = item.cena[0]
	return {json, json_hash, json_cost}
}

Cart.basket.json2item = async (db, pos) => {
	if (!pos.json) return false
	try {
		pos.item = JSON.parse(pos.json)
		delete pos.json
		Object.defineProperty(pos.item, 'toString', {
			value: () => pos.brendart_nick,
			enumerable: false, // ключевое свойство - не перечисляемое
			writable: true,
			configurable: true
		})
		for (const prop_nick in pos.item) {
			const prop = await Shop.getPropByNick(db, prop_nick)	
			if (prop.type == 'number') { //Нужно сохранить без scale и когда достаётся применить новый на тот момент scale
				pos.item[prop_nick] = pos.item[prop_nick].map(num => num * 10 ** prop.scale)
			}
		}
	} catch (e) {
		console.log(e)
		return false
	}
}	
Cart.basket.get = async (db, {order_id, freeze}, partner) => { //Cart.getBasket 
	const poss = await db.all(`
		SELECT brendart_nick, quantity, modification, json, json_hash
		FROM shop_basket 
		WHERE order_id = :order_id
		ORDER by dateedit DESC
	`, {order_id})
	for (const pos of poss) {
		pos.group_nicks = await Shop.getFreeGroupNicksByBrendartNick(db, pos.brendart_nick)
	}
	
	if (freeze) {
		for (const pos of poss) {
			await Cart.basket.json2item(db, pos)
			if (!pos.item) continue
			
			const item = await Shop.getItemByBrendart(db, pos.brendart_nick, partner)
			if (item) {
				//Кэш должен фомироваться с приведёнными number
				const json_hash = await Cart.basket.createHashStore(db, item)
				pos.changed = json_hash != pos.json_hash
			} else {
				pos.changed = true
			}
		}
	} else {
		for (const pos of poss) {
			if (!pos.group_nicks.length) continue
			pos.item = await Shop.getItemByBrendart(db, pos.brendart_nick, partner)
		}
	}
	return poss.filter(pos => {
		if (!pos.item?.cena) return false
		pos.sum = pos.item.cena[0] * pos.quantity
		return true
	})	
}
// getPartnerByOrderJson: async (db, order_id, partnerjson) => {
// 	if (!partnerjson) partnerjson = await db.col("SELECT partnerjson from shop_orders where order_id = :order_id", {order_id})
// 	const partner = partnerjson ? JSON.parse(partnerjson) : false
// 	return partner
// },
Cart.basket.freeze = async (db, order_id, partner) => {
	const poss = await db.all(`
		SELECT brendart_nick, quantity, modification, json, json_hash
		FROM shop_basket 
		WHERE order_id = :order_id
		ORDER by dateedit DESC
	`, {order_id})
	for (const pos of poss) {
		pos.group_nicks = await Shop.getFreeGroupNicksByBrendartNick(db, pos.brendart_nick)
		if (!pos.group_nicks.length) continue
		pos.item = await Shop.getItemByBrendart(db, pos.brendart_nick, partner)
		if (!pos.item) continue
	}
	for (const pos of poss) { //brendart_nick, modification, count, item
		if (!pos.item) continue

		const {json_hash, json, json_cost} = await Cart.basket.createHashJSON(db, pos.item)

		await db.exec(`
			UPDATE shop_basket
			SET json = :json, json_hash = :json_hash, json_cost = :json_cost
			WHERE order_id = :order_id
			and brendart_nick = :brendart_nick 
		`, { json, json_cost, json_hash, order_id, brendart_nick: pos.brendart_nick })
	}
	for (const pos of poss) { //brendart_nick, modification, count, item
		if (pos.item) continue
		await db.exec(`
			DELETE FROM shop_basket
			WHERE order_id = :order_id and brendart_nick = :brendart_nick 
		`, { order_id, brendart_nick: pos.brendart_nick })
	}
	await db.exec(`
		UPDATE shop_orders
		SET freeze = 1
		WHERE order_id = :order_id
	`, { order_id })
}