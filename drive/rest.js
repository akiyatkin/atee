import Rest from "/-rest"
import Access from '/-controller/Access.js'
import rest_funcs from '/-rest/rest.funcs.js'
import fs from 'fs/promises'
import nicked from '/-nicked'
import drive from '/-drive'
import dabudi from '/-dabudi'

const rest = new Rest(rest_funcs)
export default rest


rest.addArgument('gid')
rest.addArgument('range', ['string'], (view, n) => n || 'A1:G1000')


rest.addResponse('get-table', async view => {
	const { gid, range } = await view.gets(['gid','range'])

	const rows_source = await drive.getRows(gid, range)
	const {descr, rows_table} = dabudi.splitDescr(rows_source)
	const {heads, rows_body} = dabudi.splitHead(rows_table)

	const indexes = {}
	for(const i in heads.head_nicks) {
		indexes[heads.head_nicks[i]] = i
	}
	heads.indexes = indexes

	view.ans.table = {descr, heads, rows_body}
	return view.ret()
})


rest.addResponse('get-rows', async view => {
	const { gid, range } = await view.gets(['gid','range'])
	const cachesrc = await drive.cacheRows(gid, range)
	view.ans = createReadStream(cachesrc)
	return view.ret()
})