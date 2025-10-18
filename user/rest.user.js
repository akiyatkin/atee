import Rest from '/-rest'
import User from '/-user/User.js'
import crypto from 'crypto'
import config from '/-config'
import rest_funcs from '/-rest/rest.funcs.js'
import rest_admin from '/-controller/rest.admin.js'
import rest_db from '/-db/rest.db.js'
const rest = new Rest(rest_db, rest_funcs, rest_admin)
export default rest


rest.addVariable('user', async (view, src) => {
	const db = await view.get('db')
	view.nostore = true
	const user = await User.harvest(view)
	if (user && user.date_active + 60 < Date.now() / 1000) {
		await db.changedRows(`UPDATE user_users
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
	const user = await view.get('user#required')
	if (!user.date_verified) return view.err('Требуется поддвердить аккаунт')
	return user
})

rest.addVariable('user#signup', async (view) => {	
	const user = await view.get('user')
	if (!user?.email) return view.err('Вам необходимо зарегистрироваться')
	return user
})
rest.addVariable('user#required', async (view) => {
	const user = await view.get('user')
	if (!user) return view.err('Пользователь не найден')
	return user
})

rest.addVariable('user_id', async (view, src) => {
	const user = await view.get('user')
	return user?.user_id
})
// rest.addVariable('user_id#create', async (view) => {
// 	const { user } = await view.gets(['user#create'])
// 	return user.user_id
// })

rest.addVariable('user_id#verify', async (view) => {
	const user = await view.get('user#verify')
	return user.user_id
})
rest.addVariable('user_id#signup', async (view) => {
	const user = await view.get('user#signup')
	return user.user_id
})
rest.addVariable('user_id#required', async (view) => {
	const user = await view.get('user#required')
	return user.user_id
})


rest.addVariable('manager', async (view) => {
	const user = await view.get('user')
	return user.manager
})
rest.addVariable('manager#required', async (view) => {
	const manager = await view.get('manager')
	if (!manager) return view.err('Требуются права менеджера', 401)
	return manager
})

rest.addVariable('managerOrAdmin', async (view) => {
	const manager = await view.get('manager')
	if (manager) return true
	const admin = await view.get('admin')
	if (admin) return true
	return false
})
rest.addVariable('managerOrAdmin#required', ['managerOrAdmin'], async (view, managerOrAdmin) => {
	if (managerOrAdmin) return true
	return view.err('Требуется права администратора или менеджера', 401)
})