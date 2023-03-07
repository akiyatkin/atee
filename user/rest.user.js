/*
	API для других модулей
*/
import Rest from '/-rest'
import config from '/-config'
import rest_funcs from '/-rest/rest.funcs.js'
import rest_admin from '/-controller/rest.admin.js'
const rest = new Rest(rest_funcs, rest_admin)
export default rest

// rest.addVariable('manager', async (view, src) => {
// 	const conf = await config('user')
// 	const isadmin = false
// 	if (!isadmin) return view.err('forbidden', 403)
// 	return src
// })
