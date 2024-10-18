import Access from "/-controller/Access.js"
import nicked from '/-nicked'
import filter from '/-nicked/filter.js'
import fs from "fs/promises"
import xlsx from "/-xlsx"
import Rest from "/-rest"

const rest = new Rest()

import rest_sources from '/-sources/rest.sources.js'
rest.extra(rest_sources)

export default rest


rest.addResponse('get-state', async view => {
	const isdb = await view.get('isdb')
	view.ans.admin = await Access.isAdmin(view.visitor.client.cookie)
	view.ans.isdb = !!isdb
	return view.ret('', 200, true)
})
