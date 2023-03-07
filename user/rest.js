/* rest для интерфейса */
import Rest from "/-rest"
import config from '/-config'
import rest_user from '/-user/rest.user.js'
import rest_set from '/-user/rest.set.js'
import rest_get from '/-user/rest.get.js'

const rest = new Rest(rest_user, rest_set, rest_get)
export default rest


rest.addResponse('get-token', async view => {
	await view.gets(['admin'])
	view.ans.token = ''
	return view.ret()
})

