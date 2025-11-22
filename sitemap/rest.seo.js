import Rest from "@atee/rest"
import Layers from '/-controller/Layers.js'
import TPL from '/-sitemap/layout.html.js'
import Access from '/-controller/Access.js'
import { loadJSON } from '/-controller/router.js'

import rest_funcs from '/-rest/rest.funcs.js'
import rest_path from '/-controller/rest.path.js'

import nicked from "@atee/nicked"

const rest = new Rest(rest_funcs, rest_path)

rest.addArgument('search', ['string'], (view, search) => {
	try {
		return decodeURI(search)
	} catch (e) {
		return ''
	}
})
rest.addVariable('source', async view => {
	const root = await view.get('root')
	const layers = Layers.getInstance(root)
	const source = await layers.getSource()
	return source
})
rest.addVariable('rule', async view => {
	const root = await view.get('root')
	const rule = await Layers.getRule(root)
	return rule
})


//const getHeadings = async ({source, visitor}) => {
const getHeadings = Access.poke(async ({source, visitor}) => { //
	console.time('getHeadings')
	const headings = {}
	for (const sitemap of (source.sitemap || [])) {

		const res = await loadJSON(sitemap, visitor).then(res => res.data).catch(e => console.log('head', href, e))
		if (!res.headings) continue
		for (const nick in res.headings) {
			const fheading = res.headings[nick]
			headings[nick] ??= {
				title: res.headings[nick].title, 
				items:{}
			}
			//Порядок ключей надо как в новом, но и старые надо не потерять данные
			headings[nick].items = Object.assign({}, res.headings[nick].items, headings[nick].items, res.headings[nick].items)
		}
	}
	console.timeEnd('getHeadings')
	return headings
})
//}
rest.addVariable('headings', async view => {
	const source = await view.get('source')
	const headings = await getHeadings({source, visitor: view.visitor, toString: () => 'seo headings'})
	return headings
})
rest.addVariable('head', async view => {
	const source = await view.get('source')
	
	const sitemaps = []
	if (!source.head) return view.err('Требуется секция head')
	Layers.runByIndex(source, (index, path) => {
		if (~path.indexOf(false)) return
		let head = index.head
		const crumb = path[path.length - 1]
		const href = path.slice(0, -1).join('/')
		sitemaps.push({...head, href, crumb})		
	})
	
	const headings = {}
	for (const head of sitemaps) {
		if (head.hidden) continue
		const json = head.sitemap || head.json //sitemap возвращает тоже самое что и json но с headings
		const res = json ? await loadJSON(json, view.visitor).catch(e => console.log('head', href, e)) : false
		if (res && res.data) Object.assign(head, res.data)

		
		if (head.headings) {
			for (const nick in head.headings) {
				const fheading = head.headings[nick]
				const parent = head.href ? head.href + '/' : ''
				const heading = headings[nick] ??= {title: fheading.title || nick, href: parent + (fheading.href || ''), childs:{}}
				Object.assign(heading.childs, fheading.childs)
			}
		}
		if (head.title) { // Это страница
			const title = head.group || ''
			const nick = nicked(head.group)
			const heading = headings[nick] ??= {title, href: head.href || '', childs:{}}
			const fresh = {...head}
			heading.childs[head.crumb || ''] = fresh
			delete fresh.href
			delete fresh.crumb
			delete fresh.headings
			delete fresh.group
		}
	}

	return headings
})


rest.addResponse('sitemap.xml', async view => {
	const headings = await view.get('headings')
	const host = view.visitor.client.host
	const list = []

	const date = new Date(Access.getAccessTime())
	let dd = date.getDate();
	if (dd < 10) dd = '0' + dd;
	let mm = date.getMonth() + 1; // месяц 1-12
	if (mm < 10) mm = '0' + mm;
	const modified = date.getFullYear() + '-' + mm + '-' + dd
	view.ext = 'xml'
	return TPL.SITEMAP_XML( {headings, modified}, { host } ) //Если обращаются роботы, то у них нет Service Worker и как бы кэш они не обновят. Но и сохранять они не будут.
})
rest.addResponse('robots.txt', async view => {
	const host = view.visitor.client.host
	view.ext = 'txt'
	return TPL.ROBOTS_TXT( true, { host } )
})



export default rest