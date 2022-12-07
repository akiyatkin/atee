import Rest from "/-rest"
import Notion from "/-notion/Notion.js"
import Access from "/-controller/Access.js"

const rest = new Rest()

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

rest.addHandler('admin', async (view) => {
	const { visitor } = await view.gets(['visitor'])
	if (await Access.isAdmin(visitor.client.cookie)) return
	return view.err('Access denied')
})
rest.addResponse('get-state', async view => {
	const { visitor } = await view.gets(['visitor'])
	view.ans.admin = await Access.isAdmin(visitor.client.cookie)
	view.ans.notion = !!await Notion.getConfig()
	return view.ret()
})
meta.after(reans => reans.nostore = true)

export default rest