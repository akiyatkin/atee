//get для интерфейса
import Rest from '/-rest'
import rest_user from '/-user/rest.user.js'
import rest_db from '/-db/rest.db.js'
const rest = new Rest(rest_db, rest_user)

export default rest

rest.addResponse('get-user', async view => {
	const { user } = await view.gets(['user'])
	view.ans.user = user
	return view.ret()
})