import nicked from '/-nicked'
import config from '/-config'
import Shop from "/-shop/Shop.js"
import Rest from "/-rest"
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
	for (const i in root.childs) {
		childs[i] = await Shop.getGroupById(db, root.childs[i])
	}
	return view.ret()
})

