import { files, file } from "./files.js"
import path from 'path'
import { readFile, utimes } from "fs/promises"

import { Meta } from "./Meta.js"
import { parse, explode, split } from './Spliter.js'

import { Bread } from './Bread.js'

import { loadJSON, router } from './router.js'
import { Access } from '@atee/controller/Access.js'
import { Once } from './Once.js'
import { SITEMAP_XML, ROBOTS_TXT } from '/-controller/layout.html.js'
import { whereisit } from './whereisit.js'
const { FILE_MOD_ROOT, IMPORT_APP_ROOT } = whereisit(import.meta.url)



export const meta = new Meta()

// meta.addArgument('cookie', (view, cookie) => {
// 	return parse(cookie, '; ')
// })
meta.addArgument('cookie')
meta.addVariable('admin', async (view) => {
	const { cookie } = await view.gets(['cookie'])
	view.ans.nostore = true
	if (!await Access.isAdmin(cookie)) {
		view.ans.status = 403
		return view.err('Access denied')
	}
})

meta.addAction('get-access', async view => {
	const { cookie } = await view.gets(['cookie'])
	view.ans['admin'] = await Access.isAdmin(cookie)
	view.ans['update_time'] = Access.getUpdateTime()
	view.ans['access_time'] = Access.getAccessTime()
	view.ans['view_time'] = Date.now()
	view.ans.nostore = true
	return view.ret()
})
meta.addAction('set-access', async view => {
	await view.gets(['admin'])
	Access.setAccessTime()
	return view.ret()
})
meta.addAction('set-update', async view => {
	await view.gets(['admin'])
	const time = new Date();
	await utimes('../reload', time, time)
	return view.ret()
})


meta.addFunction('int', (view, n) => Number(n))
meta.addFunction('array', (view, n) => n ? n.split(',') : [])
meta.addFunction('checksearch', (view, n) => {
	if (n && n[0] != '/') return view.err()
	return n
})
meta.addArgument('host')

meta.addArgument('ip')
meta.addArgument('root', ['checksearch']) //prev
meta.addArgument('pv', ['checksearch']) //prev
meta.addArgument('nt', ['checksearch']) //next
meta.addArgument('vt', ['int']) //view_time
meta.addArgument('ut', ['int']) //update_time
meta.addArgument('st', ['int']) //access_time
meta.addArgument('gs', ['array']) //globals
meta.addArgument('rd', ['array']) //reloaddivs
meta.addArgument('rt', ['array']) //reloadts



const wakeup = (rule, depth = 0) => {
	if (!rule) return
	if (!rule.layout) return
	for (const pts in rule.layout) {
		for (const div in rule.layout[pts]) {
			const tsf = rule.layout[pts][div]
			const [name, subframe] = tsf ? split(':', tsf) : ['','ROOT']
			const [sub, frame = ''] = split('.', subframe)
			const ts = tsf ? name + ':' + sub : ''
			const layer = { ts, tsf, name, sub, div, depth, tpl:null, html: null, json:null, layers: null}
			if (frame) {
				layer.frame = frame
				layer.frameid = frame ? 'FRAMEID-' + frame.replaceAll('.','-') : ''
			}
			rule.layout[pts][div] = layer
		}
	}
	wakeup(rule.child, depth + 1)
	if (rule.childs) for (const path in rule.childs) {
		wakeup(rule.childs[path], depth + 1)
	}
}
const spread = (rule, parent) => { //всё что в layout root переносим в свой child или childs
	if (!rule) return
	if (!rule.layout) return
	if (parent) {
		for (const tsf in parent.layout) {
			if (!rule.layout[tsf]) rule.layout[tsf] = {}
			for (const div in parent.layout[tsf]) {
				if (!rule.layout[tsf][div]) rule.layout[tsf][div] = { ...parent.layout[tsf][div] }
			}
		}
	}
	spread(rule.child, rule)
	if (rule.childs) for (const path in rule.childs) {
		spread(rule.childs[path], rule)
	}
}

const runByIndex = (rule, fn, path = []) => {
	fn(rule, path)
	if (rule.childs) for(const i in rule.childs) runByIndex(rule.childs[i], fn, [...path, i])
	if (rule.child) runByIndex(rule.child, fn, [...path, false])
}
const maketree = (layer, layout, rule) => {
	if (!layout) return
	const tsf = layer.tsf
	if (!layout[tsf]) return
	layer.layers = Object.values(layout[layer.tsf])
	for (const l of layer.layers) {
		maketree(l, layout, rule)
	}
}
const runByRootLayer = (root, fn) => {
	fn(root)
	root.layers?.forEach(l => runByRootLayer(l, fn))
}
const runByLayer = (rule, fn) => {
	runByIndex(rule, r => {
		runByRootLayer(rule.root, fn)
	})
}
const applyframes = (rule) => {
	if (!rule.frame) return
	const frame = rule.frame
	//Нужно встроить фреймы в вёрстку
	runByIndex(rule, (root) => {
		//Показывается ли в каком-то div слой с frame
		for (const up in root.layout) {
			for (const div in root.layout[up]) {
				const inner = root.layout[up][div]
				if (!frame[inner]) continue
				
				root.layout[up][div] = frame[inner] + '.' + div
				const tsf = frame[inner] +'.' +div
				//rule.frames[frame[inner]]

				if (!root.layout[tsf]) root.layout[tsf] = (rule.frames && rule.frames[frame[inner]]) ? {...rule.frames[frame[inner]]} : {}
				root.layout[tsf]['FRAMEID'+'-'+div] = inner
			}
		}
	})
}
const getRule = Once.proxy( async root => {
	//root должен быть без ведущего слэша и работать с дефисом
	
	if (root) root = '-' + root
	const { default: rule } = await import('/' + root + '/layers.json', {assert: { type: "json" }})
	
	applyframes(rule) //встраиваем фреймы
	wakeup(rule) //объекты слоёв
	spread(rule) //childs самодостаточный
	
	const tsf = rule.index
	const [name, subframe] = split(':', tsf)
	const [sub, frame = ''] = split('.', subframe)
	const frameid = frame ? 'FRAMEID-' + frame.replaceAll('.','-') : ''
	const ts = tsf ? name + ':' + sub : ''
	runByIndex(rule, (r,path) => { //строим дерево root по дивам		
		r.root = { tsf, ts, name, sub, frame, frameid, depth: 0, tpl:null, html: null, json:null, layers:null }
		//Object.seal(r.root) debug test
		maketree(r.root, r.layout, rule)
		delete r.layout
		runByRootLayer(r.root, layer => {
			const ts = layer.ts
			if (rule.animate && rule.animate[ts]) layer.animate = rule.animate[ts]
			if (!rule.depth || !rule.depth[ts]) return
			const dif = rule.depth[ts] - layer.depth
			layer.depth += dif
			runByRootLayer(layer, (l) => l.depth = layer.depth)
		})
	})
	return rule
})
const collectPush = (rule, timings, bread, root, interpolate, theme) => {
	const push = []
	runByRootLayer(root, layer => {
		const crumb = bread.getCrumb(layer.depth)
		const ts = layer.ts
		if (rule.push && rule.push[ts]) {
			push.push(...rule.push[ts])
		}
		if (rule.pushtpl && rule.pushtpl[ts]) {
			rule.pushtpl[ts].forEach(val => {
				push.push(interpolate(val, timings, layer, bread, crumb, theme))	
			})
		}
	})
	return push
}
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
			const ts = layer.ts
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

const fromCookie = (cookie) => {
	let name = cookie.match('(^|;)?theme=([^;]*)(;|$)')
	if (!name) return ''
	if (name == 'deleted') return ''
	return decodeURIComponent(name[2])
}
const getTheme = (get, cookie) => {
	const name = get.theme != null ? get.theme : fromCookie(cookie)
	const theme = parse(name,':')
	const value = []
	for (const key in theme) {
		const val = theme[key]
		if (!val) {
			delete theme[key]
			continue
		}
		value.push(`${key}=${val}`)
	}
	theme.value = value.join(':')
	return theme
}
meta.addArgument('client')
meta.addArgument('visitor')
meta.addAction('get-layers', async view => {
	view.ans.nostore = true
	view.ans.headers = {}
	const {
		visitor, rt:reloadtss, rd:reloaddivs, pv: prev, nt: next, host, cookie, st: access_time, ut: update_time, vt: view_time, gs: globals 
	} = await view.gets(['visitor', 'rt', 'rd', 'pv', 'ip', 'nt', 'host', 'cookie', 'st', 'ut', 'gs', 'vt'])
	const ptimings = { access_time, update_time, view_time }
	const timings = {
		update_time: Access.getUpdateTime(),
		view_time: Date.now(),
		access_time: Access.getAccessTime()
	}
	view.ans.ut = timings.update_time
	view.ans.st = timings.access_time
	view.ans.vt = timings.view_time
	if (!next) return view.err()
	if (globals.length) {
		return view.err() //Ну или перезагрузиться	
	}
	view.ans.gs = globals
	
	const nroute = await router(next)
	view.ans.root = nroute.root
	
	if (nroute.rest || nroute.secure) return view.err()
	const rule = await getRule(nroute.root)
	if (!rule) return view.err('Bad type layers.json')
	
	const bread = new Bread(nroute.path, nroute.get, nroute.search, nroute.root)
	const theme = getTheme(bread.get, cookie)

	if (bread.get.theme != null) {
		if (theme.value) {
			view.ans.headers['Set-Cookie'] = 'theme=' + encodeURIComponent(theme.value) + '; path=/; SameSite=Strict; expires=Fri, 31 Dec 9999 23:59:59 GMT'
		} else {
			view.ans.headers['Set-Cookie'] = 'theme=; path=/; SameSite=Strict; Max-Age=-1;'
		}
	}
	const interpolate = (val, timings, layer, bread, crumb, theme, head) => new Function(
		"host","timings", "layer", "bread", "crumb", "theme", "head",
		'return `'+val+'`'
	)(host, timings, layer, bread, crumb, theme, head)

	const { index: nopt, status } = getIndex(rule, timings, bread, interpolate, theme) //{ index: {head, push, root}, status }
	if (!nopt?.root) return view.err()
	view.ans.status = status
	view.ans.theme = theme
	if (!prev) {
		view.ans.push = collectPush(rule, timings, bread, nopt.root, interpolate, theme)
		view.ans.head = await collectHead(visitor, rule, timings, bread, nopt.root, interpolate, theme)
		view.ans.layers = [nopt.root]
		return view.ret()
	}

	const proute = await router(prev)
	if (proute.rest || proute.secure) return view.err()
	if (proute.root != nroute.root) {
		return view.err()
	}

	const nlayers = structuredClone(nopt.root.layers) //в prev определяются свойства для объектов слоёв которые повторяются

	const pbread = new Bread(proute.path, proute.get, proute.search, proute.root)
	const ptheme = getTheme(pbread.get, cookie)
	
	
	const { index: popt } = getIndex(rule, ptimings, pbread, interpolate, ptheme)
	if (!popt.root) return view.err()

	
	view.ans.layers = getDiff(popt.root.layers, nlayers, reloaddivs, reloadtss)
	if (reloaddivs.length) view.ans.rd = reloaddivs
	if (reloadtss.length) view.ans.rt = reloadtss
	
	if (nroute.search != proute.search) {
		view.ans.head = await collectHead(visitor, rule, timings, bread, nopt.root, interpolate, theme)
	}
	return view.ret()    
})

const getDiff = (players, nlayers, reloaddivs, reloadtss, layers = []) => {
	nlayers?.forEach(nlayer => {
		const player = players.find(player => {
			return nlayer.div == player.div 
			&& nlayer.ts == player.ts 
			&& nlayer.json == player.json 
			&& nlayer.html == player.html 
			&& nlayer.parsed == player.parsed 
			&& !~reloaddivs.indexOf(player.div)
			&& !~reloadtss.indexOf(player.ts)
		})
		if (player) {
			getDiff(player.layers, nlayer.layers, reloaddivs, reloadtss, layers)
		} else {
			layers.push(nlayer) //Слой не найден, его надо показать
		}
	})
	return layers
}

const getIndex = (rule, timings, bread, interpolate, theme) => {
	let status = 200
	let index = rule
	let top = bread.top
	while (top.child) {
		top = top.child
		if (index.childs && index.childs[top.name]) {
			index = index.childs[top.name]
		} else if (index.child) {
			index = index.child
		} else {
			if (!rule.childs[404]) return []
			index = rule.childs[404]
			status = 404
			break
		}
	}
	runByRootLayer(index.root, layer => {
		const crumb = bread.getCrumb(layer.depth)
		const ts = layer.ts

		
		if (layer.name) {
			if (rule.htmltpl && rule.htmltpl[layer.name]) {
				layer.html = interpolate(rule.htmltpl[layer.name], timings, layer, bread, crumb, theme)
			} else {
				if (rule.html) layer.html = rule.html[layer.name]
			}

			if (rule.tpl) layer.tpl = rule.tpl[layer.name]

			
		}
		if (rule.parsedtpl && rule.parsedtpl[ts]) {
			layer.parsed = interpolate(rule.parsedtpl[ts], timings, layer, bread, crumb, theme)
		}
		if (rule.jsontpl && rule.jsontpl[ts]) {
			layer.json = interpolate(rule.jsontpl[ts], timings, layer, bread, crumb, theme)
		} else {
			if (rule.json && rule.json[ts]) layer.json = rule.json[ts]
		}

	})
	return { index, status }
}

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
meta.addAction('robots.txt', async view => {
	const { host } = await view.gets(['host'])
	return ROBOTS_TXT( true, { host } )
})
export const rest = async (query, get, visitor) => {
	if (query == 'set-admin') {
		const result = await Access.isAdmin(get.password)
		return { ans:{result}, status: 200, nostore: true, ext: 'json', 
			headers: {
				'Set-Cookie':'-controller=' + encodeURIComponent(get.password ?? '') + '; path=/; SameSite=Strict; expires=Fri, 31 Dec 9999 23:59:59 GMT'
			}
		}	
	}
	const req = {root:'', ...get, ...visitor.client, client:visitor.client, visitor}
	const ans = await meta.get(query, req)
	if (query == 'robots.txt') return { ans, ext:'txt', nostore: true }
	if (query == 'sitemap.xml') return { ans, ext:'xml', nostore: true }
	if (query == 'get-layers') {
		ans.status = 200
	}
	const { ext = 'json', status = 200, nostore = ~query.indexOf('set-'), headers = {}} = ans
	delete ans.status
	delete ans.nostore
	delete ans.ext
	delete ans.push
	delete ans.headers
	return { ans, status, nostore, ext, headers}
	
}
