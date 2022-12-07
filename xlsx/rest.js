import Rest from "/-rest"
import xlsx from '/-xlsx'
const rest = new Rest()
export default rest

rest.addArgument('src', async (view, src) => {
	if (/\/\./.test(src)) return view.err('forbidden')
	if (!/data\//.test(src)) return view.err('forbidden')
	return src
})
rest.addFunction('isset', (view, v) => v !== null)
rest.addArgument('visitor')
rest.addResponse('get-sheets', async view => {
	const { src, visitor } = await view.gets(['src','visitor'])
	const data = await xlsx.read(visitor, src)
	view.ans.data = data
	return view.ret()
})

