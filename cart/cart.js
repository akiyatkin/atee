import Catalog from "/-catalog/Catalog.js"
const Cart = {}

Cart.createNick = async (view, user) => {
	const { db } = await view.gets(['db'])
	const t = new Date('2023-01-01 00:00:00').getTime()
	const seconds = t - Date.now()
	// Количество дней нужно округлить в меньшую сторону,
	// чтобы узнать точное количество прошедших дней
	// 86400 - количество секунд в 1 дне (60 * 60 * 24) + 000
	const days = Math.floor(seconds / 86400000)
	const num = await db.col(`SELECT count(*) + 1 FROM cart_orders WHERE user_id = :user_id`, user)
	const order_nick = days + '-' + user.user_id + '-' + num
	return order_nick
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

	const fields = ['name','phone','address','tk','zip','transport','city_id','pay','pvz']
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
		INSERT INTO cart_userorders (user_id, order_id, active) VALUES(:user_id, :order_id, 1)
	`, {user_id, order_id})
	
	return order_id
}

export default Cart