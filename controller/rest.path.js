import Rest from "/-rest"
import Access from "/-controller/Access.js"

const rest = new Rest()

rest.addFunction('checksearch', (view, n, pname) => {
	if (n && n[0] != '/') return view.err('Путь должен начинаться со слэша ' + pname)
	return n
})
rest.addFunction('noslash', (view, n, pname) => {
	if (n && n[0] == '/') return view.err('Путь не должен начинаться со слэша ' + pname)
	return n || ''
})
rest.addArgument('path', ['noslash'])
rest.addArgument('root', ['noslash'])


export default rest