import Rest from "/-rest"
import Access from "/-controller/Access.js"
import rest_funcs from '/-rest/funcs.js'
const rest = new Rest(rest_funcs)

rest.addHandler('admin', async (view) => {
	const { visitor } = await view.gets(['visitor'])
	view.ans.admin = true
	view.nostore = true
	if (await Access.isAdmin(visitor.client.cookie)) return
	return view.err('Access denied', 403)
})

export default rest