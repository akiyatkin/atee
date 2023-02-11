import Rest from "/-rest"
import docx from '/-docx'
import Access from '/-controller/Access.js'
import rest_funcs from '/-rest/funcs.js'
const rest = new Rest(rest_funcs)
export default rest

rest.addArgument('src', async (view, src) => {
	if (/\/\./.test(src)) return view.err('forbidden', 403)
	if (!/data\//.test(src)) return view.err('forbidden', 403)
	return src
})

rest.addResponse('get-html', async view => {
	const { src, visitor } = await view.gets(['src','visitor'])
	const data = await docx.read(Access, src)
	view.ans.data = data
	return view.ret()
})

