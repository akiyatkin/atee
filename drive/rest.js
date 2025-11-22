import Rest from "@atee/rest"
import Access from '/-controller/Access.js'
import rest_funcs from '/-rest/rest.funcs.js'
import fs from 'fs/promises'
import nicked from "@atee/nicked"
import drive from "@atee/drive"
//import { createReadStream, readFileSync } from 'fs'

const rest = new Rest(rest_funcs)
export default rest

rest.addArgument('gid')
rest.addArgument('range', ['string'], (view, n) => n || 'A1:G1000')

rest.addResponse('get-table', async view => {
	const gid = await view.get('gid')
	const range = await view.get('range')

	view.ans.table = await drive.getTable(gid, range)
	if (!view.ans.table) return view.err()
	return view.ret()
})


rest.addResponse('get-rows', async view => {
	const gid = await view.get('gid')
	const range = await view.get('range')

	view.ans.rows = await drive.getRows(gid, range)
	if (!view.ans.rows) return view.err()
	return view.ret()
})