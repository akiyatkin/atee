import fs from "fs/promises"
import nicked from '/-nicked'
import docx from '/-docx'
import mail from '/-mail'
import config from '/-config'
import unique from "/-nicked/unique.js"
import Access from "/-controller/Access.js"

import Shop from "/-shop/api/Shop.js"

import Rest from "/-rest"
const rest = new Rest()
export default rest


import rest_set from '/-shop/api/rest.set.js'
rest.extra(rest_set)
import rest_get from '/-shop/api/rest.get.js'
rest.extra(rest_get)


rest.addResponse('main', async view => {
	const db = await view.get('db')
	view.data.conf = await config('bed', true)
	const group = view.data.group = await view.get('group#required')
	const childs = view.data.childs = await Shop.getChilds(db, group.group_id)
	
	return view.ret()
})

