import Rest from "/-rest"
import Access from "/-controller/Access.js"
import rest_funcs from '/-rest/rest.funcs.js'
const rest = new Rest(rest_funcs)

rest.addVariable('setaccess', async (view, val) => {
	view.after(() => {
		if (view.data.result) {
			console.log('setaccess')
			Access.setAccessTime()
		}
	})
	return val
})


rest.addVariable('isadmin', view => {
	const isadmin = Access.isAdmin(view.visitor.client.cookie)
	view.ans.admin = isadmin //depricated
	view.nostore = true
	return isadmin
})
rest.addVariable('admin', async view => { //depricated
	const { isadmin } = await view.gets(['isadmin'])
	if (!isadmin) return view.err('Access denied', 403)
	return isadmin
})
rest.addVariable('admin#required', async view => {
	const { isadmin } = await view.gets(['isadmin'])
	if (!isadmin) return view.err('Access denied', 403)
	return isadmin
})

export default rest