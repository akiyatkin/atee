import Rest from "@atee/rest"
import Access from "/-controller/Access.js"
import rest_funcs from '/-rest/rest.funcs.js'
const rest = new Rest(rest_funcs)

rest.addVariable('setaccess', async (view, val) => {
	view.after(() => {
		if (view.data.result) {
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
rest.addArgument('admin', async (view, password) => {
	if (password) {
		const result = await Access.isAdmin(password)
		if (result) {
			view.headers['Set-Cookie'] = '-controller=' + encodeURIComponent(password ?? '') + '; path=/; SameSite=Strict; expires=Fri, 31 Dec 9999 23:59:59 GMT'
			return true
		}
	}
	const isadmin = await view.get('isadmin')
	if (!isadmin) return view.err('Access denied', 403)
	return isadmin
})
rest.addVariable('admin#required', async view => {
	const isadmin = await view.get('isadmin')
	if (!isadmin) return view.err('Access denied', 403)
	return isadmin
})

export default rest