import Rest from "/-rest"
import rest_funcs from '/-rest/rest.funcs.js'
import Notion from "/-notion/Notion.js"
import Access from "/-controller/Access.js"
import rest_admin from "/-controller/rest.admin.js"
const rest = new Rest(rest_funcs, rest_admin)

rest.addArgument('nick')
rest.addArgument('id')
rest.addResponse('get-list', async (view) => {	
	const {  } = await view.gets(['admin'])
	view.ans.pages = await Notion.getList()
	return view.ret()
})
rest.addResponse('set-load', async (view) => {
	const { id } = await view.gets(['admin','id'])
	const res = await Notion.load(id)
	if (!res) return view.err()
	Access.setAccessTime()
	return view.ret()
})
rest.addResponse('set-del', async (view) => {
	const { id } = await view.gets(['admin','id'])
	const res = await Notion.del(id)
	if (!res) return view.err()
	Access.setAccessTime()
	return view.ret()
})
rest.addResponse('get-page', async (view) => {
	const { id } = await view.gets(['id','admin'])
	const page = await Notion.getData(id)
	if (!page) return view.err('',404)
	view.ans.page = page
	return view.ret()
})


rest.addResponse('get-state', async view => {
	const visitor = view.visitor
	view.ans.admin = await Access.isAdmin(visitor.client.cookie)
	view.ans.notion = !!await Notion.getConfig()
	return view.ret()
})
rest.after(reans => reans.nostore = true)

export default rest