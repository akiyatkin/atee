import Rest from "/-rest"
import Layers from '/-controller/Layers.js'
import TPL from '/-sitemap/layout.html.js'
import Access from '/-controller/Access.js'
import { loadJSON } from '/-controller/router.js'
import Theme from '/-controller/Theme.js'
import Bread from '/-controller/Bread.js'

import funcs from '/-rest/funcs.js'

import pages from "/-sitemap/rest.pages.js"
import seo from "/-sitemap/rest.seo.js"


const rest = new Rest(funcs, seo, pages)


rest.addFunction('checksearch', (view, n) => {
	if (n && n[0] == '/') return view.err('Путь не должен начинаться со слэша')
	return n
})
rest.addArgument('path', ['checksearch'])
//rest.addArgument('href', ['checksearch'])


rest.addVariable('bread', async view => {
	const { path } = await view.gets(['path'])
	const bread = new Bread(path, {}, path, '')
	return bread
})
rest.addVariable('theme', async view => {
	const { bread, visitor } = await view.gets(['bread', 'visitor'])
	const theme = Theme.harvest(bread.get, visitor.client.cookie)
	return theme
})

rest.addVariable('timings', async view => {
	return {
		update_time: Access.getUpdateTime(),
		view_time: Date.now(),
		access_time: Access.getAccessTime()
	}
})

rest.addVariable('env', async view => {
	const { source, bread, theme, timings } = await view.gets(['source', 'bread', 'theme', 'timings'])
	const { index: { head }, depth } = Layers.getIndex(source, bread)
	const crumb = bread.getCrumb(depth)
	const look = { head, theme, timings, bread }
	const env = { crumb, ...look}
	return env
})



const interpolate = (val, env) => new Function('env', 'return `'+val+'`')(env)
rest.addResponse('get-head', async view => {
	const { env, visitor } = await view.gets(['env', 'visitor'])
	let head = {...env.head}
	if (head.jsontpl) {
		head.json = interpolate(head.jsontpl, env)
		delete head.jsontpl
	}
	if (head.json) {
		const reans = await loadJSON(head.json, visitor).catch(e => {
			console.log(e)
			return {ans:{result:0}}
		})
		head = {...head, ...reans.ans}
	}
	if (!head.canonical) {
		const src = [env.bread.root, env.bread.path].filter(p => p).join('/')
		if (src) head.canonical = '/' + src
	} else {
		head.canonical = env.crumb + head.canonical
	}
	return {ans:head}
})


export default rest