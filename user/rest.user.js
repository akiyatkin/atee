import Rest from '/-rest'
import User from '/-user/User.js'
import crypto from 'crypto'
import config from '/-config'
import rest_funcs from '/-rest/rest.funcs.js'
import rest_db from '/-db/rest.db.js'
const rest = new Rest(rest_db, rest_funcs)
export default rest


rest.addVariable('user', async (view, src) => {
	const { visitor, db } = await view.gets(['visitor', 'db'])
	view.nostore = true
	const token = (t => t ? t[2] : false)(visitor.client.cookie.match('(^|;)?-token=([^;]*)(;|$)'))
	if (!token) return false
	const user = await User.getUserByToken(view, token)
	if (!user) return false
	if (user.date_active + 60 < Date.now() / 1000) {
		db.changedRows(`UPDATE user_users
			SET date_active = now()
			WHERE user_id = :user_id
		`, user)
	}
	return user
})
// rest.addVariable('user#create', async (view, src) => {
// 	const { user, db } = await view.gets(['user', 'db'])	
// 	if (user) return user

	
// })

rest.addVariable('user#verify', async (view) => {	
	const { user } = await view.gets(['user#required'])
	if (!user.date_verified) return view.err('Требуется поддвердить аккаунт')
	return user
})

rest.addVariable('user#signin', async (view) => {	
	const { user } = await view.gets(['user#required'])
	if (!user.date_signin) return view.err('Требуется регистрация')
	return user
})
rest.addVariable('user#required', async (view) => {
	const { user } = await view.gets(['user'])
	if (!user) return view.err('Пользователь не создан')
	return user
})

rest.addVariable('user_id', async (view, src) => {
	const { user } = await view.gets(['user'])	
	return user?.user_id
})
// rest.addVariable('user_id#create', async (view) => {
// 	const { user } = await view.gets(['user#create'])
// 	return user.user_id
// })

rest.addVariable('user_id#verify', async (view) => {
	const { user } = await view.gets(['user#verify'])
	return user.user_id
})
rest.addVariable('user_id#signin', async (view) => {
	const { user } = await view.gets(['user#signin'])
	return user.user_id
})
rest.addVariable('user_id#required', async (view) => {
	const { user } = await view.gets(['user#required'])
	return user.user_id
})