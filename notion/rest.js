import { Meta } from "/-controller/Meta.js"
import { Notion } from "./Notion.js"
import { Access } from "/-controller/Access.js"


export const meta = new Meta()

meta.addArgument('nick')
meta.addArgument('id')
meta.addAction('get-list', async (view) => {	
	const {  } = await view.gets(['admin'])
	view.ans.pages = await Notion.getList()
	return view.ret()
})
meta.addAction('set-load', async (view) => {
	const { id } = await view.gets(['admin','id'])
	const res = await Notion.load(id)
	if (!res) return view.err()
	Access.setAccessTime()
	return view.ret()
})
meta.addAction('set-del', async (view) => {
	const { id } = await view.gets(['admin','id'])
	const res = await Notion.del(id)
	if (!res) return view.err()
	Access.setAccessTime()
	return view.ret()
})
meta.addAction('get-page', async (view) => {
	const { id } = await view.gets(['id','admin'])
	const page = await Notion.getData(id)
	if (!page) {
		view.ans.status = 404
		return view.err()
	}
	return page
})
meta.addArgument('cookie')
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
	view.ans.notion = !!await Notion.getConfig()
	return view.ret()
})

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