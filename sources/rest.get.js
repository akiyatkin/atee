import Access from "/-controller/Access.js"
import nicked from '/-nicked'
import filter from '/-nicked/filter.js'

import xlsx from "/-xlsx"
import Rest from "/-rest"
import config from "/-config"
import Sources from "/-sources/Sources.js"
const rest = new Rest()

import rest_sources from '/-sources/rest.sources.js'
rest.extra(rest_sources)

export default rest


rest.addResponse('get-main', async view => {
	const isdb = await view.get('isdb')
	view.ans.admin = await Access.isAdmin(view.visitor.client.cookie)
	view.ans.isdb = !!isdb
	if (!view.ans.admin || !view.ans.isdb) return view.err()

	const db = await view.get('db')
	const list = view.ans.list = await Sources.getAll(db)

	const conf = await config('sources')
	view.ans.dir = conf.dir
	


	
	return view.ret('', 200, true)
})

rest.addResponse('get-settings', async view => {
	await view.get('admin')
	const conf = await config('sources')
	view.ans.dir = conf.dir

	return view.ret()
})
