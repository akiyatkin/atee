/*
	API для других модулей
*/
import Rest from '/-rest'
import crypto from 'crypto'
import config from '/-config'
import rest_funcs from '/-rest/rest.funcs.js'
import rest_admin from '/-controller/rest.admin.js'
import rest_db from '/-db/rest.db.js'
const rest = new Rest(rest_funcs, rest_admin)
export default rest

const getTok = (token) => {
	if (!token) return false
	const r = token.split('-')
	if (r.length != 2) return false
	const user_id = Number(r[0])
	if (!user_id) return false;
	return {user_id, token: r[1]}
}
const getUserIdByToken = async (view, token) => {
	const { db } = await view.gets(['db'])
	const tok = getTok(token)
	if (!tok) return false
	return db.col('SELECT user_id FROM user_users WHERE token = :token and user_id = :user_id', tok)
}

rest.addArgument('token',['string'], (view, token) => {//Может быть опущен? В историю будет разные get попадать?
	view.nostore = true //Запросы с token не кэшируются, ответ будет зависеть от действий пользователя и т.п.
})

const getUserById = async (view, user_id) => {
	const { db } = await view.gets(['db'])
	const user = await db.fetch(`
		SELECT 
			user_id, 
			name, 
			sername, 
			verify,
			UNIX_TIMESTAMP(date_active) as date_active,
			UNIX_TIMESTAMP(date_signup) as date_signup 
		FROM user_users WHERE user_id = :user_id
	`, {user_id})
	return user
}
const setCookie = (view, token) => {
	view.headers['Set-Cookie'] = `-token=${token}; path=/; SameSite=Strict; expires=Fri, 31 Dec 9999 23:59:59 GMT`
}
rest.addVariable('user#create', async (view, src) => {
	const { user, visitor, db } = await view.gets(['user', 'visitor', 'db'])
	if (user) return user

	const token = crypto.randomBytes(12).toString('hex')
	const password = token.substr(0, 6)

	const timezone = Intl.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions().timeZone : ''
	
	const user_id = await db.insertId(`
		INSERT INTO user_users (timezone, password, token, date_token, date_create, date_active) 
		VALUES(:timezone, :password, :token, now(), now(), now())
	`,{timezone, password, token});
	if (!user_id) return view.fail('Пользователь не создан')

	setCookie(view, user_id + '-' + token)

	return getUserById(view, user_id)		
})
rest.addVariable('user', async (view, src) => {
	const { user_id_token, visitor, db } = await view.gets(['user_id_token', 'visitor', 'db'])	
	if (!user_id_token) return false
	const user = await getUserById(view, user_id_token)
	if (user.date_active + 60 < Date.now() / 1000) {
		db.changedRows(`UPDATE user_users
			SET date_active = now()
			WHERE user_id = :user_id
		`, user)
	}
	return user
})
rest.addVariable('user_id_token', async (view, src) => {
	const { token: token_get, visitor, db } = await view.gets(['token', 'visitor', 'db'])
	const token_coo = (t => t ? t[2] : false)(visitor.client.cookie.match('(^|;)?\-token=([^;]*)(;|$)'))
	const user_id_coo = await getUserIdByToken(view, token_coo)
	const user_id_get = await getUserIdByToken(view, token_get) //Кривой get будет проигнорирован если он есть
	if (user_id_coo && (!user_id_get || token_coo == token_get)) return user_id_coo //99%
	if (!user_id_get) return false //Ничё нет, выходим
	setCookie(view, token_get)
	if (user_id_coo) { //Возможно надо замёрджить

	}
	return user_id_get
})
