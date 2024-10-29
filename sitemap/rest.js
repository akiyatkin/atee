
import Layers from '/-controller/Layers.js'
import TPL from '/-sitemap/layout.html.js'
import Access from '/-controller/Access.js'
import { loadJSON } from '/-controller/router.js'
import Theme from '/-controller/Theme.js'
import Bread from '/-controller/Bread.js'

import Rest from "/-rest"
const rest = new Rest()

import rest_funcs from '/-rest/rest.funcs.js'
rest.extra(rest_funcs)

import rest_pages from "/-sitemap/rest.pages.js"
rest.extra(rest_pages)
import rest_seo from "/-sitemap/rest.seo.js"
rest.extra(rest_seo)
import rest_path from '/-controller/rest.path.js'
rest.extra(rest_path)






//rest.addArgument('href', ['checksearch'])


rest.addVariable('bread', async view => {
	const { path, root, search } = await view.gets(['search', 'path','root'])
	

	const searchParams = new URLSearchParams(search)
	const params = {}
	for (const [key, value] of searchParams.entries()) params[key] = value

	const req = {...view.req}
	delete req.path
	delete req.root
	Object.assign(req, params)

	

	const bread = new Bread(path, req, path, root)
	return bread
})
rest.addVariable('theme', async view => {
	const { bread } = await view.gets(['bread'])
	const visitor = view.visitor
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

	const rule = await view.get('rule')
	const bread = await view.get('bread')
	const theme = await view.get('theme')
	const timings = await view.get('timings')


	//view.ans = rule //Тотже объект что и source но теперь со свойством root в каждом child и childs и в корне
	const { index, depth } = Layers.getIndex(rule, bread)	
	const tpls = {}
	Layers.runByRootLayer(index.root, ({name}) => {
		if (!rule.tpl[name]) return
		tpls[name] = rule.tpl[name]
	})
	let head = index.head	
	
	let css = []
	for (const name in tpls) {
		let tplobj = await import(tpls[name])
		if (tplobj.default) tplobj = tplobj.default
		if (!tplobj.css) continue
		for (const link of tplobj.css) css.push(link)
	}

	const crumb = bread.getCrumb(depth)
	const look = { head, theme, timings, bread }
	const env = { crumb, ...look}

	head = {...head}


	head.css = css
	if (head.jsontpl) {
		head.json = interpolate(head.jsontpl, env)
		delete head.jsontpl
	}
	
	
	if (head.json) {
		//const reans = await loadJSON(head.json, view.visitor)
		const reans = await loadJSON(head.json, view.visitor).catch(e => {
			console.log(e)
			return {data:{result:0}}
		})
		// if (!reans.result) {
		// console.log('erorr load head.json', head.json)
			
		// } else {

			if (reans.nostore) view.nostore = true
			head = {...head, ...reans.data}
		//}
	}

	if (!head.canonical) {
		const src = [env.bread.root, env.bread.path].filter(p => p).join('/')
		if (src) head.canonical = '/' + src
	} else {
		if (head.thisischild) {
			head.canonical = env.crumb.parent + head.canonical
		} else {
			//head.canonical = head.canonical
		}
	}
	view.ans = head
	return view.ret()
})


rest.addResponse('get-data', async view => {
	const headings = await view.get('headings')
	view.ans.headings = headings
	return view.ret()
})

export default rest