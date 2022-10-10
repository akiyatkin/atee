import { Meta } from "/-controller/Meta.js"
import Layers from '/-controller/Layers.js'
import sitemap from '/-sitemap/layout.html.js'
import { Access } from '/-controller/Access.js'
import { loadJSON } from '/-controller/router.js'
import Theme from '/-controller/Theme.js'
import Bread from '/-controller/Bread.js'
// { SITEMAP_XML, ROBOTS_TXT }
export const meta = new Meta()

meta.addArgument('host')
meta.addArgument('visitor')
meta.addArgument('cookie')
meta.addFunction('checksearch', (view, n) => {
	if (n && n[0] == '/') return view.err('Путь не должен начинаться со слэша')
	return n
})
meta.addArgument('root', ['checksearch'])
meta.addArgument('path', ['checksearch'])
meta.addArgument('href', ['checksearch'])

meta.addVariable('source', async view => {
	const { root } = await view.gets(['root'])
	const layers = Layers.getInstance(root)
	const source = await layers.getSource()
	return source
})
meta.addVariable('bread', async view => {
	const { path, root } = await view.gets(['path', 'root'])
	const bread = new Bread(path, {}, path, root)
	return bread
})
meta.addVariable('theme', async view => {
	const { bread, cookie } = await view.gets(['bread', 'cookie'])
	const theme = Theme.harvest(bread.get, cookie)
	return theme
})

meta.addVariable('timings', async view => {
	return {
		update_time: Access.getUpdateTime(),
		view_time: Date.now(),
		access_time: Access.getAccessTime()
	}
})
const interpolate = (val, env) => new Function('env', 'return `'+val+'`')(env)
meta.addVariable('env', async view => {
	const { source, path, bread, theme, timings } = await view.gets(['path', 'source', 'bread', 'theme', 'timings'])
	const { index, depth } = Layers.getIndex(source, path)
	const crumb = bread.getCrumb(depth)
	return {crumb, bread, theme, timings, index}
})
meta.addAction('head', async view => {
	const { env, visitor } = await view.gets(['env', 'visitor'])
	const {bread, index } = env
	let head = {...index.head}
	if (head.jsontpl) {
		head.json = interpolate(head.jsontpl, env)
		delete head.jsontpl
	}
	if (head.json) {
		const {data} = await loadJSON(head.json, visitor).catch(e => {
			console.log(e)
			return {data:{result:0}}
		})
		if (!data.result) {
			console.log(head.json, data)
		}
		head = {...head, ...data}
	}
	if (!head.canonical) {
		const src = [bread.root, bread.path].filter(p => p).join('/')
		if (src) head.canonical = '/' + src
	} else {
		head.canonical = head.crumb + head.canonical
	}

	return head
})

// const collectHead = async (visitor, rule, timings, bread, root, interpolate, theme) => {
// 	let head = {}
// 	runByRootLayer(root, layer => {
// 		const ts = layer.ts
// 		if (!rule.head || !rule.head[ts]) return
// 		const crumb = bread.getCrumb(layer.depth)
// 		head = {...rule.head[ts]}
// 		head.layer = layer
// 		head.crumb = crumb
// 	})

// 	if (head.jsontpl) {
// 		head.json = interpolate(head.jsontpl, timings, head.layer, bread, head.crumb, theme)
// 	}
// 	if (head.json) {
// 		const {data} = await loadJSON(head.json, visitor).catch(e => {
// 			console.log(e)
// 			return {data:{result:0}}
// 		})
// 		if (!data.result) {
// 			console.log(head.json, data)
// 		}
// 		head = {...head, ...data}
// 	}
// 	if (!head.canonical) {
// 		const src = [bread.root, bread.path].filter(p => p).join('/')
// 		if (src) head.canonical = '/' + src
// 	} else {
// 		head.canonical = head.crumb + head.canonical
// 	}
// 	delete head.layer
// 	delete head.crumb


// 	return head
// }




meta.addAction('robots.txt', async view => {
	const { host } = await view.gets(['host'])
	return sitemap.ROBOTS_TXT( true, { host } )
})

meta.addAction('data', async view => {
	const { source, host, visitor } = await view.gets(['source','host', 'visitor'])

	const date = new Date(Access.getAccessTime())
	let dd = date.getDate();
	if (dd < 10) dd = '0' + dd;
	let mm = date.getMonth() + 1; // месяц 1-12
	if (mm < 10) mm = '0' + mm;
	const modified = date.getFullYear() + '-' + mm + '-' + dd

	const sitemap = {}
	if (!source.head) return view.err('Требуется секция head')
	Layers.runByIndex(source, (index, path) => {
		if (~path.indexOf(false)) return
		let head = index.head
		path = path.join('/')
		sitemap.childs ??= {}
		sitemap.childs[path] = {
			modified,
			...head
		}
	})
	const list = []
	const headings = []
	for (const href in sitemap.childs) {
		const head = sitemap.childs[href]
		if (head.hidden && !head.sitemap) continue
		const json = head.sitemap || head.json
		const res = json ? await loadJSON(json, visitor).catch(e => console.log('head', href, e)) : false
		if (res && res.data) Object.assign(head, res.data)
		if (head.name || head.title) {
			list.push({...head, href})
		}
		if (!head.headings) continue
		for (const i in head.headings) {
			const heading = head.headings[i]
			heading.modified ??= modified
			heading.href = href
			headings.push(heading)
		}
	}
	return {list, headings}
})
meta.addAction('sitemap.xml', async view => {
	const { data: {list, headings}, host } = await view.gets(['data','host'])
	const res = [...list]
	for (const i in headings) {
		const heading = headings[i]
		const href = heading.href
		const modified = heading.modified
		for (const next in heading.childs) {
			res.push({
				modified, 
				...heading.childs[next],
				href: href + (href ? '/'+next : next)
			})
		}
	}
	return sitemap.SITEMAP_XML( res, { host } )
})


export const rest = async (query, get, visitor) => {
	const req = {root:'', ...get, ...visitor.client, visitor}
	const ans = await meta.get(query, req)
	if (query == 'robots.txt') return { ans, ext:'txt', nostore: true }
	if (query == 'sitemap.xml') return { ans, ext:'xml', nostore: true }
	return { ans, ext: 'json', status:200, nostore:false }
}