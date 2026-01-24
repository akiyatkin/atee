import Rest from "@atee/rest"
import Access from "/-controller/Access.js"

const rest = new Rest()
import rest_funcs from "/-rest/rest.funcs.js"
rest.extra(rest_funcs)

rest.addFunction('checksearch', (view, n, pname) => {
	if (n && n[0] != '/') return view.err('Путь должен начинаться со слэша ' + pname)
	if (n === null) return false
	return n
})
rest.addFunction('noslash', (view, n, pname) => {
	if (n && n[0] == '/') return view.err('Путь не должен начинаться со слэша ' + pname)
	return n || ''
})
rest.addArgument('path', ['noslash'])
rest.addArgument('root', ['noslash'])

rest.addVariable('root#required', ['root','required'])
rest.addVariable('path#required', ['path','required'])

export default rest