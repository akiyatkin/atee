//set для интерфейса
import Rest from "@atee/rest"
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
rest.addArgument('go', ['string'])


rest.addResponse('set-reset', async view => {
	await view.gets(['admin'])
	const { db } = await view.gets(['db'])

	const res = await db.exec(`DROP TABLE IF EXISTS 
		user_users,
		user_uemails
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
rest.addAction('set-delete', async (view) => {
	const user_id = await view.get('user_id#required')
	const db = await view.get('db')
	const msg = await User.delete(db, user_id)
	if (msg) return view.err(msg)
	User.delCookie(view)
	return view.ret('Аккаунт удалён')
})
rest.addAction('set-logout', async (view) => {
	//const { } = await view.gets(['recaptcha'])
	User.delCookie(view)
	return view.ret('Вы успешно вышли')
})
rest.addAction('set-email-verify', async (view) => {
	const db = await view.get('db')
	const user_id = await view.get('user_id')
	const email = await view.get('email#required')
	const go = await view.get('go')
	const user_id_byemail = await User.getUserIdByEmail(db, email)
	if (user_id_byemail != user_id) return view.err('Адрес не найден в списке ваших адресов')
	
	//const date_verify = await db.col(`SELECT UNIX_TIMESTAMP(date_verify) as date_verify FROM user_users WHERE user_id = :user_id`, {user_id})
	//Место для ограничения

	await User.sendVerify(db, user_id, email, view.visitor.client.host, go)

	return view.ret('Письмо отправлено!')
})
rest.addAction('set-email-verified', async (view) => {
	const user = await view.get('user')
	const code = await view.get('code')
	const email = await view.get('email#required')
	const db = await view.get('db')
	const go = await view.get('go')
	const token = await view.get('token')

	const redirect = (msg, result) => {
		view.headers['Location'] = `${go || User.link}?email=${email}&result=${result}&alert=${encodeURIComponent(msg)}`
		if (!result) {
			return view.err('', 301)
		} else {
			return view.ret('', 301)
		}
	}
	const newuser = await User.getUserByToken(db, token)
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
	await db.affectedRows(`
		UPDATE
			user_uemails
		SET
			date_verified = now()
		WHERE
			email = :email
	`, {email})
	return redirect('Адрес подтверждён',1)
})
rest.addAction('set-signin-token', async (view) => {
	const db = await view.get('db')	
	const user = await view.get('user')
	const token = await view.get('token')
	
	const redirect = (msg, result) => {
		view.headers['Location'] = User.link + '?alert=' + encodeURIComponent(msg) 
		if (!result) {
			view.headers['Location'] += '&alert=' + encodeURIComponent('Вход не выполнен') 
			return view.err('', 301)
		}
		view.headers['Location'] += '&result=1&alert=' + encodeURIComponent('Вход выполнен') 
		return view.ret('', 301)
	}
	const newuser = await User.getUserByToken(db, token)
	if (!newuser) return redirect('Токен устарел')
	await User.mergeguest(db, user, newuser) //Если старый пользователь не регистрировался мёрджим его или просто забываем
	User.setCookie(view, newuser)
	return redirect('Вы авторизованы', 1)
})
rest.addAction('set-signin-email', async (view) => {
	const recaptcha = await view.get('recaptcha')
	const db = await view.get('db')	
	const email = await view.get('email#required')
	const user_id = await view.get('user_id')
	const userbyemail = await User.getUserByEmail(db, email)
	if (!userbyemail) return view.err('Аккаунт не найден')
	if (user_id == userbyemail.user_id) return view.err('Вы уже авторизованы')
	await User.sendin(db, userbyemail.user_id, view.visitor.client.host)
	return view.ret('Вам отправлено письмо со ссылкой для входа.')
})

rest.addAction('set-user-id', async (view) => {
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

rest.addAction('set-signup-email', async (view) => {
	await view.get('recaptcha')
	let email = await view.get('email#required')
	const db = await view.get('db')	
	
	let user = await view.get('user')

	if (user?.email) return view.err('Вы уже зарегистрированы')
	let user_id = user.user_id
	const userbyemail = await User.getUserByEmail(db, email)
	if (userbyemail) {
		if (userbyemail.user_id == user?.user_id) return view.err('Вы уже зарегистрировали этот адрес')
		return view.err('На указанный email уже есть регистрация')
	}
	if (!user) {
		user = await User.create(db)
		user_id = user.user_id
		User.setCookie(view, user)
	}
	//email свободен можно записать	
	await User.sendup(db, user_id, view.visitor.client.host, email)
	
	return view.ret('Вы зарегистрированы. Вам отправлено письмо для подтверждения адреса.')
})

rest.addAction('set-email-add', async (view) => {
	let email = await view.get('email#required')
	const db = await view.get('db')	
	const user = await view.get('user#signup') //Первый email уже должен быть
	
	const user_id = user.user_id
	const userbyemail = await User.getUserByEmail(db, email)
	if (userbyemail) {
		if (userbyemail.user_id == user_id) return view.ret('Адрес уже в вашем списке')
		return view.err('Адрес используется другим пользователем. Авторизауйтесь за другого пользователя и удалите этот адрес из списка адресов у этого пользователя.')
	}
	await User.addEmail(db, user_id, email)
	return view.ret()//'Email добавлен в список.')
})

rest.addAction('set-email-delete', async (view) => {
	let email = await view.get('email#required')
	const db = await view.get('db')	
	const user = await view.get('user#signup') //Первый email уже должен быть
	if (user.email == email) return view.err('Нельзя удалить первый email')
	
	const user_id = user.user_id
	const userbyemail = await User.getUserByEmail(db, email)
	if (userbyemail?.user_id != user_id) return view.err('Адреса нет в вашем списке!')
	await User.delEmail(db, user_id, email)
	return view.ret()//'Готово. Email удалён из списка ваших адресов!')
})

rest.addArgument('id', ['toemail','required'])
rest.addArgument('next_id', ['toemail'])

rest.addAction('set-email-ordain', async (view) => {
	const user_id = await view.get('user_id')
	const email = await view.get('id')
	const next_email = await view.get('next_id')
	const db = await view.get('db')

	let ordain
	if (!next_email) ordain = await db.col('SELECT max(ordain) FROM user_uemails WHERE user_id = :user_id', {user_id}) + 1
	if (next_email) ordain = await db.col('SELECT max(ordain) FROM user_uemails WHERE user_id = :user_id and email = :next_email', {user_id, next_email}) - 1

	await db.exec(`
		UPDATE user_uemails 
		SET ordain = :ordain 
		WHERE email = :email and user_id = :user_id
	`, {ordain, email, user_id})

	await User.reorderEmails(db, user_id)
	return view.ret()
})


export default rest