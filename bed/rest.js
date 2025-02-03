import fs from "fs/promises"
import nicked from '/-nicked'
import docx from '/-docx'
import mail from '/-mail'
import config from '/-config'
import unique from "/-nicked/unique.js"
import Access from "/-controller/Access.js"
import Files from "/-showcase/Files.js"
import Bed from "/-bed/Bed.js"

import Rest from "/-rest"
const rest = new Rest()
export default rest


import rest_set from '/-bed/rest.set.js'
rest.extra(rest_set)
import rest_get from '/-bed/rest.get.js'
rest.extra(rest_get)


rest.addResponse('main', async view => {
	const db = await view.get('db')

	const page = view.data.page = await view.get('page#required')
	const childs = view.data.childs = await Bed.getChilds(db, page.group_id)
	
	return view.ret()
})

