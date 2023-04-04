//set для интерфейса
import Rest from '/-rest'
import User from '/-user/User.js'
import crypto from 'crypto'
import rest_user from '/-user/rest.user.js'
import rest_mail from "/-mail/rest.mail.js"
const rest = new Rest(rest_user, rest_mail)

rest.addArgument('token', ['string'])
rest.addArgument('code', ['string'])
//rest.addArgument('go', ['string'])




rest.addAction('set-logout', async (view, src) => {
	//const { } = await view.gets(['recaptcha'])
	User.delCookie(view)
	return view.ret('Вы успешно вышли')
})
rest.addAction('set-email-verified', async (view, src) => {
	const { user, code, email, db, token } = await view.gets(['user', 'code','email#required','db','token'])
	const redirect = (msg, result) => {
		view.headers['Location'] = User.link + 'result?email=' + email + '&msg=' + encodeURIComponent(msg) 
		if (!result) {
			view.headers['Location'] += '&heading=' + encodeURIComponent('Ошибка подтверждения') 
			return view.err('', 301)
		}
		view.headers['Location'] += '&result=1&heading=' + encodeURIComponent('Адрес подтверждён') 
		return view.ret('', 301)
	}
	const newuser = await User.getUserByToken(view, token)
	if (!newuser) return redirect('Токен устарел')
	await User.mergeuser(view, user, newuser)
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
	const { user, token } = await view.gets(['user', 'token'])
	const redirect = (msg, result) => {
		view.headers['Location'] = User.link + 'result?msg=' + encodeURIComponent(msg) 
		if (!result) {
			view.headers['Location'] += '&heading=' + encodeURIComponent('Вход не выполнен') 
			return view.err('', 301)
		}
		view.headers['Location'] += '&result=1&heading=' + encodeURIComponent('Вход выполнен') 
		return view.ret('', 301)
	}
	const newuser = await User.getUserByToken(view, token)
	if (!newuser) return redirect('Токен устарел')
	await User.mergeuser(view, user, newuser) //Если старый пользователь не регистрировался мёрджим его или просто забываем
	User.setCookie(view, newuser)
	return redirect('Вы авторизованы', 1)
})
rest.addAction('set-signin-email', async (view, src) => {
	const { user_id, email, db } = await view.gets(['user_id', 'email#required','db','recaptcha'])
	const userbyemail = await User.getUserByEmail(view, email)
	if (!userbyemail) return view.err('Аккаунт не найден')
	if (user_id == userbyemail.user_id) return view.err('Вы уже авторизованы')
	await User.sendEmail(view, 'signin', {user:userbyemail})
	return view.ret('Вам отправлено письмо со ссылкой для входа.')
})
rest.addAction('set-signup-email', async (view, src) => {
	let { user, email, db } = await view.gets(['user', 'email#required','db','start','recaptcha'])	
	if (!user) { //'user#create'
		user = await User.create(view)
		User.setCookie(view, user)
	}
	const user_id = user.user_id
	if (user.email) return view.err('Вы уже зарегистрированы')
	const userbyemail = await User.getUserByEmail(view, email)
	if (userbyemail) {
		if (userbyemail.user_id == user.user_id) return view.err('Вы уже зарегистрировали этот адрес')
		return view.err('На указанный email уже есть регистрация')
	}
	//email свободен можно записать
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
	return view.ret('Вы зарегистрированы. Вам отправлено письмо для подтверждения адреса.')
})

export default rest