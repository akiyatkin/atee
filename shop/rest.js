import nicked from "@atee/nicked"
import config from "@atee/config"
import Shop from "/-shop/Shop.js"
import Rest from "@atee/rest"
const rest = new Rest()
export default rest


import rest_set from '/-shop/rest.set.js'
rest.extra(rest_set)
import rest_get from '/-shop/rest.get.js'
rest.extra(rest_get)


rest.addResponse('main', async view => {
	const db = await view.get('db')
	const md = view.data.md = await view.get('md')
	const root = view.data.root = await view.get('shoproot#required')
	view.data.conf = await config('shop', true)

	const childs = view.data.childs = []

	const groups = view.data.groups = {}
	for (const group_nick of root.childs) {
		const group = await Shop.getGroupByNick(db, group_nick)
		childs.push(group_nick)
		groups[group.group_nick] = group
	}
	Shop.reduce(groups,['group_title'])
	
	return view.ret()
})

rest.addResponse('pages', async view => {
	const db = await view.get('db')
	const conf = await config('shop')
	const root = view.data.root = await view.get('shoproot#required')
	view.data.conf = await config('shop', true)
	
	const childs = view.data.childs = []
	const pages = view.data.pages = {}
	const groups = view.data.groups = {}

	for (const page_nick in conf.pages) {
		const page = conf.pages[page_nick]
		childs.push(page_nick)
		pages[page_nick] = page

		const group = await Shop.getGroupByNick(db, page.group_nick)
		groups[page.group_nick] = group

	}
	Shop.reduce(pages, ['title', 'group_nick'])
	Shop.reduce(groups, ['group_title'])
	
	return view.ret()
})