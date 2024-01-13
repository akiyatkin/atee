//set для интерфейса
import Rest from '/-rest'
import User from '/-user/User.js'
import crypto from 'crypto'

const rest = new Rest()

import rest_admin from '/-controller/rest.admin.js'
rest.extra(rest_admin) //rest_user, rest_mail, rest_admin
import rest_user from '/-user/rest.user.js'
rest.extra(rest_user)
import rest_mail from "/-mail/rest.mail.js"
rest.extra(rest_mail)

import { whereisit } from '/-controller/whereisit.js'
import fs from "fs/promises"
const { FILE_MOD_ROOT, IMPORT_APP_ROOT } = whereisit(import.meta.url)



rest.addArgument('token', ['string'])
rest.addArgument('code', ['string'])
//rest.addArgument('go', ['string'])


rest.addResponse('set-reset', async view => {
	await view.gets(['admin'])
	const { db } = await view.gets(['db'])

	const res = await db.exec(`DROP TABLE IF EXISTS 
		user_users,
		user_uemails,
		user_uphones
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
rest.addAction('set-delete', async (view, src) => {
	const user_id = await view.get('user_id#required')
	const db = await view.get('db')
	const msg = await User.delete(db, user_id)
	if (msg) return view.err(msg)
	User.delCookie(view)
	return view.ret('Аккаунт удалён')
})
rest.addAction('set-logout', async (view, src) => {
	//const { } = await view.gets(['recaptcha'])
	User.delCookie(view)
	return view.ret('Вы успешно вышли')
})
rest.addAction('set-email-verified', async (view, src) => {
	const { user, code, email, db, token } = await view.gets(['user', 'code','email#required','db','token'])
	const redirect = (msg, result) => {
		view.headers['Location'] = User.link + '?email=' + email + '&msg=' + encodeURIComponent(msg) 
		if (!result) {
			view.headers['Location'] += '&heading=' + encodeURIComponent('Ошибка подтверждения') 
			return view.err('', 301)
		}
		view.headers['Location'] += '&result=1&heading=' + encodeURIComponent('Адрес подтверждён') 
		return view.ret('', 301)
	}
	const newuser = await User.getUserByToken(view, token)
	if (!newuser) return redirect('Токен устарел')
	await User.mergeguest(db, user, newuser)
	User.setCookie(view, newuser)
	const row = await db.fetch(`
		select code_verify, UNIX_TIMESTAMP(date_verify) as date_verify, UNIX_TIMESTAMP(date_verified) as date_verified 
		from user_uemails where email = :email
	`, {email})
	
	if (!row) return redirect('Адрес не найден')
	const {code_verify, date_verify, date_verified} = row
	if (code_verify != code) return redirect('Код не действителен')
	if (date_verify < Date.now() / 1000 - 60 * 60 * 24 * 7 ) return redirect('Код устарел, отправьте проверочный код повторно')
	const r = await db.affectedRows(`
		UPDATE
			user_uemails
		SET
			date_verified = now()
		WHERE
			email = :email
	`, {email})
	if (!r) return redirect('Ошибка на сайте. Попробуйте позже.')
	if (!date_verified) return redirect('Так точно!',1)
	return redirect('Уже готово!',1)
})
rest.addAction('set-signin-token', async (view, src) => {
	const { user, token, db } = await view.gets(['user', 'token', 'db'])
	const redirect = (msg, result) => {
		view.headers['Location'] = User.link + '?msg=' + encodeURIComponent(msg) 
		if (!result) {
			view.headers['Location'] += '&heading=' + encodeURIComponent('Вход не выполнен') 
			return view.err('', 301)
		}
		view.headers['Location'] += '&result=1&heading=' + encodeURIComponent('Вход выполнен') 
		return view.ret('', 301)
	}
	const newuser = await User.getUserByToken(view, token)
	if (!newuser) return redirect('Токен устарел')
	await User.mergeguest(db, user, newuser) //Если старый пользователь не регистрировался мёрджим его или просто забываем
	User.setCookie(view, newuser)
	return redirect('Вы авторизованы', 1)
})
rest.addAction('set-signin-email', async (view, src) => {
	const { user_id, email, db } = await view.gets(['user_id', 'email#required','db','recaptcha'])
	const userbyemail = await User.getUserByEmail(view, email)
	if (!userbyemail) return view.err('Аккаунт не найден')
	if (user_id == userbyemail.user_id) return view.err('Вы уже авторизованы')
	await User.sendin(view, userbyemail)
	return view.ret('Вам отправлено письмо со ссылкой для входа.')
})

rest.addAction('set-user-id', async (view, src) => {
	let user = await view.get('user')	
	const db = await view.get('db')	
	if (!user) {
		user = await User.create(db)
		User.setCookie(view, user)
	}
	view.ans.user_id = user.user_id
	view.ans.user_token = user.token
	return view.ret()
})

rest.addAction('set-signup-email', async (view, src) => {
	await view.get('start')
	await view.get('recaptcha')
	let email = await view.get('email#required')
	let user = await view.get('user')
	const db = await view.get('db')	
	if (!user) {
		user = await User.create(db)
		User.setCookie(view, user)
	}
	const user_id = user.user_id
	if (user.email) return view.err('Вы уже зарегистрированы')
	const userbyemail = await User.getUserByEmail(db, email)
	if (userbyemail) {
		if (userbyemail.user_id == user.user_id) return view.err('Вы уже зарегистрировали этот адрес')
		return view.err('На указанный email уже есть регистрация')
	}
	//email свободен можно записать
	await User.signup(view, user_id, email)
	
	return view.ret('Вы зарегистрированы. Вам отправлено письмо для подтверждения адреса.')
})

export default rest