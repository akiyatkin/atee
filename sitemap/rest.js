import { Meta } from "/-controller/Meta.js"
import controller  from '/-controller/layout.html.js'
// { SITEMAP_XML, ROBOTS_TXT }
export const meta = new Meta()
meta.addArgument('href')
meta.addArgument('path')
meta.addArgument('host')
meta.addAction('page', async view => {
	const { path } = await view.gets(['path'])
	if (!path) {
		view.ans.title = "Главная"
	} else {
		view.ans.title = "Страница"
	}
	return view.ret()
})

meta.addAction('robots.txt', async view => {
	const { host } = await view.gets(['host'])
	return controller.ROBOTS_TXT( true, { host } )
})
meta.addFunction('checksearch', (view, n) => {
	if (n && n[0] != '/') return view.err()
	return n
})
meta.addArgument('root', ['checksearch'])


const collectHead = async (visitor, rule, timings, bread, root, interpolate, theme) => {
	let head = {}
	runByRootLayer(root, layer => {
		const ts = layer.ts
		if (!rule.head || !rule.head[ts]) return
		const crumb = bread.getCrumb(layer.depth)
		head = {...rule.head[ts]}
		head.layer = layer
		head.crumb = crumb
	})

	if (head.jsontpl) {
		head.json = interpolate(head.jsontpl, timings, head.layer, bread, head.crumb, theme)
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
	delete head.layer
	delete head.crumb


	return head
}
meta.addAction('sitemap', async view => {
	const { root, host } = await view.gets(['root','host'])
	const rule = await getRule(root)
	if (!rule) return view.err()
	
	const date = new Date(Access.getUpdateTime())
	let dd = date.getDate();
	if (dd < 10) dd = '0' + dd;
	let mm = date.getMonth() + 1; // месяц 1-12
	if (mm < 10) mm = '0' + mm;
	const modified = date.getFullYear() + '-' + mm + '-' + dd
	const visitor = await view.get('visitor')
	const sitemap = {}
	if (!rule.head) return view.err('Требуется секция head')
	runByIndex(rule, (index, path) => {
		if (~path.indexOf(false)) return
		let head = {}
		path = path.join('/')
		runByRootLayer(index.root, layer => {
			const ts = layer.tsf
			if (!rule.head[ts]) return
			head = rule.head[ts]
		})
		if (head.hidden) return
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
		const json = head.json || head.sitemap || false
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
	const { sitemap: {list, headings}, host } = await view.gets(['sitemap','host'])
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
	return SITEMAP_XML( res, { host } )
})


export const rest = async (query, get, visitor) => {
	const ans = await meta.get(query, {...get, ...visitor.client} )
	const status = ans.result ? 200 : 422
	if (query == 'robots.txt') return { ans, ext:'txt', nostore: true }
	if (query == 'sitemap.xml') return { ans, ext:'xml', nostore: true }
	return { ans, ext: 'json', status, nostore:false }
}