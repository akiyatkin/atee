/* rest для админки */
import Rest from "/-rest"
import config from '/-config'
import rest_user from '/-user/rest.user.js'
import rest_set from '/-user/admin/rest.set.js'
import rest_get from '/-user/admin/rest.get.js'

const rest = new Rest(rest_user, rest_set, rest_get)
export default rest


rest.addResponse('get-list', async view => {
	await view.gets(['admin'])
	view.ans.data = []
	return view.ret()
})

