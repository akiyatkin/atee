import Mail from '/-mail'
import config from '/-config'
import crypto from 'crypto'

const User = {
	harvest: async (view) => {
		const token = (t => t ? t[2] : false)(view.visitor.client.cookie.match('(^|;)?-token=([^;]*)(;|$)'))
		if (!token) return false
		const user = await User.getUserByToken(view, token)
		if (!user) return false
		return user
	},
	mergeguest: async (db, olduser, newuser) => { //Вызывается из обработок и содержит проверку гость или не гость
		if (!olduser) return
		if (olduser.date_signup) return
		if (newuser.user_id == olduser.user_id) return
		await User.mergeuser(db, olduser, newuser)
	},
	mergeuser: async (db, olduser, newuser) => { 
		//Другие мёрджи дополняют этот обработчик через подмену
		//Зарегистрированного пользователя тоже можно замёрджить. Старый будет удалён, даже если был зарегистрирован
		//Прошлый пользователь ещё не регистрировался, надо замёрджить и удалить его
		await db.affectedRows('DELETE from user_users where user_id = :user_id', olduser)
		await db.affectedRows('DELETE from user_uemails where user_id = :user_id', olduser)
		await db.affectedRows('DELETE from user_uphones where user_id = :user_id', olduser)
	},
	link: '/user/',
	createToken: () => {
		const token = crypto.randomBytes(12).toString('hex')
		return token
	},
	create: async db => {
		db = db.gets ? await db.get('db') : db
		const token = User.createToken()
		const password = token.substr(0, 6)
		const timezone = Intl.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions().timeZone : ''
		const new_id = await db.insertId(`
			INSERT INTO user_users (timezone, password, token, date_token, date_create, date_active) 
			VALUES(:timezone, :password, :token, now(), now(), now())
		`,{timezone, password, token});
		if (!new_id) return false
		const newuser = await User.getUserById(db, new_id)
		return newuser
	},
	sendEmail: async (view, sub, data) => {
		if (!data.user_id && !data.user) return view.err('Не указан пользователь', 500)
		const user_id = data.user_id || data.user.user_id
		let email = data.email
		
		const db = await view.get('db')
		data.vars = await view.gets(['host', 'ip'])
		data.vars.link = User.link
		if (!email) {
			const emails = await db.colAll('select email from user_uemails where user_id = :user_id', {user_id})
			if (!emails.length) return view.err('Не найден адрес для отправки письма', 500)
			email = emails.join(',')
		}
		if (!data.user && data.user_id) data.user = await User.getUserById(view, data.user_id)
		

		const tpl = await import('/-user/mail.html.js').then(res => res.default)
		if (!tpl[sub]) return view.err('Не найден шаблон письма', 500)
		if (!tpl[sub + '_subject']) return view.err('Не найден шаблон темы', 500)

		const subject = tpl[sub + '_subject'](data)
		const html = tpl[sub](data)
		const r = await Mail.toUser(subject, html, email)
		if (!r) return view.err('Не удалось отправить письмо.', 500)
		return true
	},
	setCookie: (view, user) => {
		return view.setCookie('-token', user.user_id + '-' + user.token)
	},
	delCookie: view => {
		return view.delCookie('-token')
	},
	getTok: token => {
		if (!token) return false
		const r = token.split('-')
		if (r.length != 2) return false
		const user_id = Number(r[0])
		if (!user_id) return false;
		return {user_id, token: r[1]}
	},
	getUserIdByEmail: async (db, email) => {
		db = db.gets ? await db.get('db') : db
		return await db.col(`
			SELECT e.user_id
			FROM user_uemails e 
			WHERE e.email = :email
		`, { email })
	},
	getUserIdByPhone: async (db, phone) => {
		db = db.gets ? await db.get('db') : db
		return await db.col(`
			SELECT e.user_id
			FROM user_uphones e 
			WHERE e.phone = :phone
		`, { phone })
	},
	getUserByPhone: async (db, email) => {
		db = db.gets ? await db.get('db') : db
		const user_id = await User.getUserIdByPhone(db, email)
		if (!user_id) return false
		return User.getUserById(db, user_id)
	},
	getUserByEmail: async (db, email) => {
		db = db.gets ? await db.get('db') : db
		const user_id = await User.getUserIdByEmail(db, email)
		if (!user_id) return false
		return User.getUserById(db, user_id)
	},
	getUserByToken: async (view, token) => {
		const tok = User.getTok(token)
		if (!tok) return false
		const user = await User.getUserById(view, tok.user_id)
		if (!user) return false
		if (tok.token == user.token) return user
		return false
	},
	getUserById: async (db, user_id) => {
		db = db.gets ? await db.get('db') : db
		const user = await db.fetch(`
			SELECT 
				u.user_id, 
				e.email,
				p.phone,
				u.token,
				UNIX_TIMESTAMP(u.date_token) as date_token,
				UNIX_TIMESTAMP(ifnull(e.date_verified, p.date_verified)) as date_verified,
				UNIX_TIMESTAMP(u.date_active) as date_active,
				UNIX_TIMESTAMP(u.date_signup) as date_signup 
			FROM user_users u
			LEFT JOIN user_uemails e on (e.user_id = u.user_id and e.ordain = 1)
			LEFT JOIN user_uphones p on (p.user_id = u.user_id and e.ordain = 1)
			WHERE u.user_id = :user_id
		`, {user_id})
		if (!user) return false

		if (user.email) {
			const conf = await config('user')
			user.manager = !!~conf.managers.indexOf(user.email)
		}
		return user
	},
	sendin: (view, user) => {
		return User.sendEmail(view, 'sendin', {user})
	},
	signup: (view, user_id, email) => { //depricated
		return User.sendup(view, user_id, email)
	},
	sendup: async (view, user_id, email) => {
		const db = await view.get('db')
		await db.affectedRows(`
			UPDATE
				user_uemails
			SET
				ordain = ordain + 1
			WHERE
				user_id = :user_id
		`, { user_id })
		const code_verify = crypto.randomBytes(4).toString('hex').toUpperCase()
		await db.affectedRows(`
			INSERT INTO 
				user_uemails
			SET
				user_id = :user_id,
				email = :email,
				code_verify = :code_verify,
				date_verify = now(),
				date_add = now(),
				ordain = 1
		`, {email, code_verify, user_id})

		await db.affectedRows(`
			UPDATE
				user_users
			SET
				date_signup = now()
			WHERE
				user_id = :user_id
		`, {user_id})
		return await User.sendEmail(view, 'sendup', {user_id, email, code_verify})
	},
	addPhone: async (db, user_id, phone) => {
		await db.affectedRows(`
			UPDATE
				user_uphones
			SET
				ordain = ordain + 1
			WHERE
				user_id = :user_id
		`, { user_id })
		const code_verify = crypto.randomBytes(4).toString('hex').toUpperCase()
		await db.affectedRows(`
			INSERT INTO 
				user_uphones
			SET
				user_id = :user_id,
				phone = :phone,
				code_verify = :code_verify,
				date_verify = now(),
				date_add = now(),
				ordain = 1
		`, {phone, code_verify, user_id})
	},
	delAllPhone: async (db, user_id) => {
		return await db.affectedRows(`
			DELETE FROM 
				user_uphones
			WHERE
				user_id = :user_id
		`, {user_id})
	},
	delPhone: async (db, user_id, ordain) => {
		return await db.affectedRows(`
			DELETE FROM 
				user_uphones
			WHERE
				user_id = :user_id
				and ordain = :ordain
		`, {ordain, user_id})
	},
	addEmail: async (db, user_id, email) => {
		await db.affectedRows(`
			UPDATE
				user_uemails
			SET
				ordain = ordain + 1
			WHERE
				user_id = :user_id
		`, { user_id })
		const code_verify = crypto.randomBytes(4).toString('hex').toUpperCase()
		await db.affectedRows(`
			INSERT INTO 
				user_uemails
			SET
				user_id = :user_id,
				email = :email,
				code_verify = :code_verify,
				date_verify = now(),
				date_add = now(),
				ordain = 1
		`, {email, code_verify, user_id})
	},
	delAllEmail: async (db, user_id) => {
		return await db.affectedRows(`
			DELETE FROM 
				user_uemails
			WHERE
				user_id = :user_id
		`, {user_id})
	},
	delEmail: async (db, user_id, ordain) => {
		return await db.affectedRows(`
			DELETE FROM 
				user_uemails
			WHERE
				user_id = :user_id
				and ordain = :ordain
		`, {ordain, user_id})
	}

}
export default User