import Rest from "/-rest"
import Layers from '/-controller/Layers.js'
import TPL from '/-sitemap/layout.html.js'
import Access from '/-controller/Access.js'
import { loadJSON } from '/-controller/router.js'

import rest_funcs from '/-rest/rest.funcs.js'
import rest_path from '/-controller/rest.path.js'


const rest = new Rest(rest_funcs, rest_path)

rest.addArgument('search', ['string'], (view, search) => {
	try {
		return decodeURI(search)
	} catch (e) {
		return ''
	}
})
rest.addVariable('source', async view => {
	const { root } = await view.gets(['root'])
	const layers = Layers.getInstance(root)
	const source = await layers.getSource()
	return source
})
rest.addVariable('rule', async view => {
	const { root } = await view.gets(['root'])
	const rule = await Layers.getRule(root)
	return rule
})
rest.addVariable('data', async view => {
	const { source } = await view.gets(['source'])
	const host = view.visitor.client.host
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
		//if (head.hidden && !head.sitemap) continue
		if (head.hidden) continue
		const json = head.sitemap || head.json
		const res = json ? await loadJSON(json, view.visitor).catch(e => console.log('head', href, e)) : false
		if (res && res.ans) Object.assign(head, res.ans)
		if (head.name || head.title) {
			list.push({...head, href})
		}
		if (!head.headings) continue
		for (const i in head.headings) {
			const heading = head.headings[i]
			if (!Object.values(head.headings[i].childs).length) continue
			heading.modified ??= modified
			heading.href ??= href
			headings.push(heading)

		}
	}
	return {list, headings}
})

rest.addResponse('get-data', async view => {
	const data = await view.get('data')
	return {ans:data}
})
rest.addResponse('sitemap.xml', async view => {
	const {list, headings} = await view.get('data')
	const host = view.visitor.client.host
	const res = [...list]
	for (const i in headings) {
		const heading = headings[i]
		const href = heading.href
		const modified = heading.modified
		for (const next in heading.childs) {
			res.push({
				modified, 
				...heading.childs[next],
				href: href ? href + '/' + next : next
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