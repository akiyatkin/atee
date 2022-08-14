import { Meta } from "/-controller/Meta.js"
import CONFIG from '/showcase.json' assert {type: "json"}
import { Access } from "/-controller/Access.js"


export const meta = new Meta()

meta.addHandler('admin', async (view) => {
	const { cookie } = await view.gets(['cookie'])
	if (!await Access.isAdmin(cookie)) {
		view.ans.status = 403
		view.ans.nostore = true
		return view.err('Access denied')
	}
})
meta.addAction('get-state', async view => {
	const { cookie } = await view.gets(['cookie'])
	view.ans.admin = await Access.isAdmin(cookie)
	return view.ret()
})
meta.addArgument('cookie')


export const rest = async (query, get, client) => {
	const req = {...get, ...client}
	const ans = await meta.get(query, req)
	if (typeof(ans) == 'string') return { ans, status: 200, nostore:true, ext: 'html' }
	const { ext = 'json', status = 200, nostore = true} = ans
	delete ans.status
	delete ans.nostore
	delete ans.ext
	return { ans, status, nostore, ext: 'json' }
}
