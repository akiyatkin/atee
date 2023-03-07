import Rest from "/-rest"
import Layers from '/-controller/Layers.js'
import TPL from '/-sitemap/layout.html.js'
import Access from '/-controller/Access.js'
import { loadJSON } from '/-controller/router.js'

import funcs from '/-rest/rest.funcs.js'

const rest = new Rest(funcs)

rest.addVariable('source', async view => {
	const layers = Layers.getInstance('')
	const source = await layers.getSource()
	return source
})
rest.addVariable('data', async view => {
	const { source, visitor } = await view.gets(['source', 'visitor'])
	const host = visitor.client.host
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
		if (res && res.ans) Object.assign(head, res.ans)
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

rest.addResponse('get-data', async view => {
	const { data } = await view.gets(['data'])
	return {ans:data}
})
rest.addResponse('sitemap.xml', async view => {
	const { data: {list, headings}, visitor } = await view.gets(['data','visitor'])
	const host = visitor.client.host
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
	return { ans:TPL.SITEMAP_XML( res, { host } ), ext:'xml', nostore:true } //Если обращаются роботы, то у них нет Service Worker и как бы кэш они не обновят. 
})
rest.addResponse('robots.txt', async view => {
	const { visitor } = await view.gets(['visitor'])
	const host = visitor.client.host
	return {ans:TPL.ROBOTS_TXT( true, { host } ), ext:'txt', nostore:true }
})



export default rest