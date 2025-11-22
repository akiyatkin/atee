import Rest from "@atee/rest"
import xlsx from '@atee/xlsx'
const rest = new Rest()
export default rest

rest.addArgument('src', async (view, src) => {
	if (/\/\./.test(src)) return view.err('forbidden')
	if (!/data\//.test(src)) return view.err('forbidden')
	return src
})
rest.addFunction('isset', (view, v) => v !== null)

rest.addResponse('get-sheets', async view => {
	const { src } = await view.gets(['src'])
	const visitor = view.visitor
	const data = await xlsx.read(visitor, src)
	view.ans.data = data
	return view.ret()
})

