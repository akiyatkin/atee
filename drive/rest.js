import Rest from "/-rest"
import Access from '/-controller/Access.js'
import rest_funcs from '/-rest/rest.funcs.js'
import fs from 'fs/promises'
import nicked from '/-nicked'
import drive from '/-drive'
//import { createReadStream, readFileSync } from 'fs'

const rest = new Rest(rest_funcs)
export default rest

rest.addArgument('gid')
rest.addArgument('range', ['string'], (view, n) => n || 'A1:G1000')

rest.addResponse('get-table', async view => {
	const { gid, range } = await view.gets(['gid','range'])
	view.ans.table = await drive.getTable(gid, range)
	return view.ret()
})


// rest.addResponse('get-rows', async view => {
// 	const { gid, range } = await view.gets(['gid','range'])
// 	const cachesrc = await drive.cacheRows(gid, range)
// 	view.ans = createReadStream(cachesrc)
// 	return view.ret()
// })