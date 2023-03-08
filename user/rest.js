/* rest для интерфейса */
import Rest from "/-rest"
import config from '/-config'
import rest_admin from '/-controller/rest.admin.js'
import rest_user from '/-user/rest.user.js'
import rest_set from '/-user/rest.set.js'
import rest_get from '/-user/rest.get.js'
import rest_admin_set from '/-user/rest.admin.set.js'
import rest_admin_get from '/-user/rest.admin.get.js'

const rest = new Rest(rest_admin, rest_user, rest_set, rest_get, rest_admin_set, rest_admin_get)
export default rest


rest.addResponse('get-token', async view => {
	await view.gets(['admin'])
	view.ans.token = ''
	return view.ret()
})

