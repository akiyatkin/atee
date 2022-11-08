import Meta from "/-controller/Meta.js"
export const meta = new Meta()
import xlsx from '/-xlsx'


meta.addArgument('src', async (view, src) => {
	if (/\/\./.test(src)) return view.err('forbidden')
	if (!/data\//.test(src)) return view.err('forbidden')
	return src
})
meta.addFunction('isset', (view, v) => v !== null)
meta.addArgument('visitor')
meta.addAction('get-sheets', async view => {
	const { src, visitor } = await view.gets(['src','visitor'])
	const data = await xlsx.read(visitor, src)
	view.ans.data = data
	return view.ret()
})

export const rest = async (query, get, visitor) => {
	const req = {...get, visitor}
	const ans = await meta.get(query, req)
	return { ans, ext: 'json', status:200, nostore:false }
}