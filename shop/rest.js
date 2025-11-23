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
	const md = view.data.md = await view.get('md')
	const db = await view.get('db')
	view.data.conf = await config('shop', true)
	const root = view.data.root = await view.get('root#required')
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

