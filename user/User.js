import Mail from '/-mail'
import crypto from 'crypto'

const User = {
	mergeuser: async (view, olduser, newuser) => {
		if (!olduser) return
		if (olduser.date_signup) return
		if (newuser.user_id == olduser.user_id) return
		const { db } = await view.gets(['db'])
		//Прошлый пользователь ещё не регистрировался, надо замёрджить и удалить его
		await db.affectedRows('DELETE from user_users where user_id = :user_id', olduser)
	},
	link: '/user/',
	create: async view => {
		const { db } = await view.gets(['db'])
		const token = crypto.randomBytes(12).toString('hex')
		const password = token.substr(0, 6)
		const timezone = Intl.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions().timeZone : ''
		const new_id = await db.insertId(`
			INSERT INTO user_users (timezone, password, token, date_token, date_create, date_active) 
			VALUES(:timezone, :password, :token, now(), now(), now())
		`,{timezone, password, token});
		if (!new_id) return view.err('Пользователь не создан', 500)
		const newuser = await User.getUserById(view, new_id)
		return newuser
	},
	sendEmail: async (view, sub, data) => {
		if (!data.user_id && !data.user) return view.err('Не указан пользователь', 500)
		const user_id = data.user_id || data.user.user_id
		let email = data.email
		
		const { db } = await view.gets(['db'])
		data.vars = await view.gets(['utms', 'host', 'ip'])
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
	getUserIdByEmail: async (view, email) => {
		const { db } = await view.gets(['db'])
		return await db.col(`
			SELECT e.user_id
			FROM user_uemails e 
			WHERE e.email = :email
		`, { email })
	},
	getUserByEmail: async (view, email) => {
		const { db } = await view.gets(['db'])
		const user_id = await User.getUserIdByEmail(view, email)
		if (!user_id) return false
		return User.getUserById(view, user_id)
	},
	getUserByToken: async (view, token) => {
		const { db } = await view.gets(['db'])
		const tok = User.getTok(token)
		if (!tok) return false
		const user = await db.fetch(`
			SELECT 
				u.user_id, 
				u.name, 
				e.email,
				p.phone,
				u.token,
				u.sername, 
				UNIX_TIMESTAMP(u.date_token) as date_token,
				UNIX_TIMESTAMP(ifnull(e.date_verified, p.date_verified)) as date_verified,
				UNIX_TIMESTAMP(u.date_active) as date_active,
				UNIX_TIMESTAMP(u.date_signup) as date_signup 
			FROM user_users u
			LEFT JOIN user_uemails e on (e.user_id = u.user_id and e.ordain = 1)
			LEFT JOIN user_uphones p on (p.user_id = u.user_id and e.ordain = 1)
			WHERE u.user_id = :user_id and u.token = :token
		`, tok)
		return user
	},
	getUserById: async (view, user_id) => {
		const { db } = await view.gets(['db'])
		const user = await db.fetch(`
			SELECT 
				u.user_id, 
				u.name, 
				e.email,
				p.phone,
				u.token,
				u.sername, 
				UNIX_TIMESTAMP(u.date_token) as date_token,
				UNIX_TIMESTAMP(ifnull(e.date_verified, p.date_verified)) as date_verified,
				UNIX_TIMESTAMP(u.date_active) as date_active,
				UNIX_TIMESTAMP(u.date_signup) as date_signup 
			FROM user_users u
			LEFT JOIN user_uemails e on (e.user_id = u.user_id and e.ordain = 1)
			LEFT JOIN user_uphones p on (p.user_id = u.user_id and e.ordain = 1)
			WHERE u.user_id = :user_id
		`, {user_id})
		return user
	},
	signup: async (view, user_id, email) => {
		const { db } = await view.gets(['db'])
		await db.affectedRows(`
			UPDATE
				user_uemails
			SET
				ordain = ordain + 1
			WHERE
				user_id = :user_id
		`, user)
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
		await User.sendEmail(view, 'signup', {user_id, email, code_verify})
	}
}
export default User