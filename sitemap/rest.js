import Rest from "/-rest"
import Layers from '/-controller/Layers.js'
import TPL from '/-sitemap/layout.html.js'
import Access from '/-controller/Access.js'
import { loadJSON } from '/-controller/router.js'
import Theme from '/-controller/Theme.js'
import Bread from '/-controller/Bread.js'

import rest_funcs from '/-rest/rest.funcs.js'

import rest_pages from "/-sitemap/rest.pages.js"
import rest_seo from "/-sitemap/rest.seo.js"
import rest_path from '/-controller/rest.path.js'

const rest = new Rest(rest_funcs, rest_seo, rest_pages, rest_path)




//rest.addArgument('href', ['checksearch'])


rest.addVariable('bread', async view => {
	const { path, root } = await view.gets(['path','root'])
	const bread = new Bread(path, {}, path, root)
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
const split = (sep, str) => {
    if (!str) return []
    const i = str.indexOf(sep)
    return ~i ? [str.slice(0, i), str.slice(i + 1)] : [str]
}
const run = (layout, fn) => {

}
rest.addVariable('env', async view => {
	
	
})



const interpolate = (val, env) => new Function('env', 'return `'+val+'`')(env)
rest.addResponse('get-head', async view => {
	const { source, visitor, root, bread, theme, timings } = await view.gets(['source', 'visitor', 'root', 'bread', 'theme', 'timings'])
	
	const { index, depth } = Layers.getIndex(source, bread)
	let head = index.head
	const layout = index.layout
	
	const list = {}
	for (const tsf in layout) {
		list[tsf] = true
		for (const div in layout[tsf]) {
			list[layout[tsf][div]] = true
		}
	}
	const tpls = {}
	for (const tsf in list) {
		const [name, sub] = split(':', tsf)
		if (sub) tpls[name] = true
	}
	let css = []
	for (const name in tpls) {
		if (!source.tpl[name]) continue
		let tplobj = await import(source.tpl[name])
		if (tplobj.default) tplobj = tplobj.default
		if (!tplobj.css) continue
		for(const link of tplobj.css) css.push(link)
	}

	const crumb = bread.getCrumb(depth)
	const look = { head, theme, timings, bread }
	const env = { crumb, ...look}

	head = {...env.head}

	// const css = []
	// if (head.css) {
	// 	for (const i in head.css) {
	// 		const name = head.css[i]
	// 		if (!source.css?.[name]) continue
	// 		css.push(source.css[name])
	// 	}
	// }
	head.css = css
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
		if (src) head.canonical = src
	} else {
		head.canonical = env.crumb + head.canonical
	}
	return {ans:head}
})


export default rest