import { files, file } from "./files.js"
import path from 'path'
import { readFile, utimes } from "fs/promises"

import { Meta, View } from "./Meta.js"
import { parse, explode } from './Spliter.js'
import { whereisit } from './whereisit.js'
import { router } from './router.js'
import { Access } from '@atee/controller/Access.js'
import { Once } from './Once.js'

const { FILE_MOD_ROOT, IMPORT_APP_ROOT } = whereisit(import.meta.url)



export const meta = new Meta()

meta.addAction('access', view => {
	view.ans['UPDATE_TIME'] = Access.getUpdateTime()
	view.ans['ACCESS_TIME'] = Access.getAccessTime()
	view.ans['VIEW_TIME'] = Date.now()
	return view.ret()
})
meta.addAction('set-access', view => {
	Access.setAccessTime()
	return view.ret()
})
meta.addAction('set-update', async view => {
	const time = new Date();
	await utimes('../reload', time, time)
	return view.ret()
})

meta.addArgument('cookie', (view, cookie) => {
	return parse(cookie, '; ')
})
meta.addFunction('int', (view, n) => Number(n))
meta.addFunction('array', (view, n) => explode(',', n))
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


// meta.addAction('sw', async view => {
// 	const res = await view.get('access')
// 	const script = await readFile(FILE_MOD_ROOT + '/sw.js', 'utf-8')
// 	const ans = `
// 		let UPDATE_TIME = ${res.UPDATE_TIME}
// 		let ACCESS_TIME = ${res.ACCESS_TIME}
// 		${script}`
// 	return ans
// })

const interpolate = function(string, params) {
	const names = Object.keys(params)
	const vals = Object.values(params)
	return new Function(...names, 'return `'+string+'`')(...vals)
}


const wakeup = rule => {
	if (!rule) return
	if (!rule.layout) return
	for (const pts in rule.layout) {
		for (const div in rule.layout[pts]) {
			const ts = rule.layout[pts][div]
			const [name, sub] = ts ? ts.split(':') : ['','ROOT']
			const layer = { ts, name, sub, div }
			if (rule.animate && rule.animate[ts]) layer.animate = rule.animate[ts]
			rule.layout[pts][div] = layer
		}
	}
	wakeup(rule.child)
	if (rule.childs) for (const path in rule.childs) {
		wakeup(rule.childs[path])
	}
}
const spread = (rule, parent) => {
	if (!rule) return
	if (!rule.layout) return
	if (parent) {
		for (const ts in parent.layout) {
			if (!rule.layout[ts]) rule.layout[ts] = {}
			for (const div in parent.layout[ts]) {
				if (!rule.layout[ts][div]) rule.layout[ts][div] = { ...parent.layout[ts][div] }
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
const maketree = (layer, layout, rule, head = null, push = []) => {
	if (!layout) return
	const ts = layer.ts
	if (!layout[ts]) return
	layer.layers = Object.values(layout[layer.ts])
	for (const l of layer.layers) {
		maketree(l, layout, rule, head, push)
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

const getRule = Once.proxy( async root => {
	const { default: rule } = await import(path.posix.join(IMPORT_APP_ROOT, root, 'layers.json'), {assert: { type: "json" }})
	wakeup(rule) //объекты слоёв
	spread(rule) //childs самодостаточный
	const [name, sub] = rule.index.split(':')
	runByIndex(rule, r => { //строим дерево root по дивам
		r.root = { ts: rule.index, name, sub }	
		maketree(r.root, r.layout, rule)
		delete r.layout

		const push = []
		let head = {}
		runByRootLayer(r.root, layer => {
			const ts = layer.ts
			if (rule.push && rule.push[ts]) push.push(...rule.push[ts])
			if (rule.head && rule.head[ts]) head = rule.head[ts]
		})
		r.push = push
		r.head = head
	})

	return rule
})
meta.addAction('sitemap', async view => {
	const { root } = await view.gets(['root'])
	const rule = await getRule(root)
	if (!rule) return view.err()
	/*
		Карта динамическая так как данные меняются не только при update
		У нас есть крошки
		{
			child
			childs:{
				crumb1:*
				crumb2:*
			}
		}
		нужно каждой крошке найти соответствующий head объект
	*/
	
	const list = []
	const date = new Date(Access.getUpdateTime() * 1000)
	let dd = date.getDate();
	if (dd < 10) dd = '0' + dd;
	let mm = date.getMonth() + 1; // месяц 1-12
	if (mm < 10) mm = '0' + mm;
	const modified = date.getFullYear() + '-' + mm + '-' + dd
	runByIndex(rule, (index, path) => {
		if (~path.indexOf(false)) return
		if (~['404','500'].indexOf(path[0])) return
		list.push({
			name: index.head.name || index.head.title,
			modified,
			href: path.length ? '/' + path.join('/') : ''
		})
	})
	console.log(list)
	return list
})
// meta.addAction('get-push', async view => {
// 	const { nt: next } = await view.gets(['nt'])
// })
meta.addAction('layers', async view => {
	const {
		pv: prev, nt: next, host, cookie, st: access_time, ut: update_time, vt: view_time, gs: globals 
	} = await view.gets(['pv', 'ip', 'nt', 'host', 'cookie', 'st', 'ut', 'gs', 'vt'])

	view.ans.ut = Access.getUpdateTime()
	view.ans.st = Access.getAccessTime()
	if (!next) return view.err()
	//next и prev globals не содержат, был редирект на без globals
	if (update_time < Access.getUpdateTime()) {
		//update_time - reload
		return view.err()
	}
	if (access_time < Access.getAccessTime()) {
		//access_time - все слои надо показать заного
		return view.err() //Ну или перезагрузиться
	}
	if (globals.length) {
		//access_time - какие-то слои надо показать заного
		return view.err() //Ну или перезагрузиться	
	}
	
	//Нужно сообщить какие globals update_time access_time обработал данный запрос
	//Пока не придёт ответ со старшими update_time и access_time клиент свои не поменяет
	//Если придут старшие значит именно в этом запросе есть нужные слои в момент когда пришли старшие, для всех предыдущих 
	view.ans.gs = globals
	

	
	const nroute = await router(next)
	// return {
	// 	search, secure, get, path, ext,
	// 	rest, query, restroot,
	// 	cont, root, crumbs
	// }

	if (nroute.rest || nroute.secure) return view.err()
	const rule = await getRule(nroute.root)
	if (!rule) return view.err('Bad type layers.json')
	view.ans.vt = Date.now() //new_view_time
	const { index: nopt, status } = getIndex(rule, nroute, view.ans.vt) //{ index: {head, push, root}, status }
	if (!nopt.root) return view.err()
	view.ans.status = status
	if (!prev) {
		view.ans.push = nopt.push
		view.ans.head = nopt.head
		view.ans.layers = [nopt.root]
		return view.ret()
	}

	const proute = await router(prev)

	if (proute.rest || proute.secure) return view.err()
	if (proute.root != nroute.root) return view.err()

	const nlayers = structuredClone(nopt.root.layers)
	const { index: popt } = getIndex(rule, proute, view_time)
	if (!popt.root) return view.err()

	view.ans.layers = getDiff(popt.root.layers, nlayers)
	if (nopt.search != popt.search) {
		view.ans.head = nopt.head
	}


	return view.ret()    
})
const getDiff = (players, nlayers, layers = []) => {

	nlayers?.forEach(nlayer => {
		const player = players.find(player => {
			return nlayer.div == player.div 
			&& nlayer.ts == player.ts 
			&& nlayer.json == player.json 
			&& nlayer.parsed == player.parsed
		})
		if (player) {
			getDiff(player.layers, nlayer.layers, layers)
		} else {
			layers.push(nlayer) //Слой не найден, его надо показать
		}
	})
	return layers
}


const getIndex = (rule, {path, get}, view_time, options = {push: [], head: {}}, status = 200) => {
	if (path && (!rule.childs || !rule.childs[path])) {
		if (path == '404') return []
		return getIndex(rule, {path:'404', get}, view_time, options, 404)
	}
	const index = path ? rule.childs[path] : rule
	const req = {path, get, view_time}
	//const req = { get: route.get, host, cookie, root }
	runByRootLayer(index.root, layer => {
		const ts = layer.ts
		if (layer.name) layer.tpl = rule.tpl[layer.name]
		
		if (rule.parsedtpl && rule.parsedtpl[ts]) {
			layer.parsed = interpolate(rule.parsedtpl[ts], req)
		}
		if (rule.jsontpl && rule.jsontpl[ts]) {
			layer.json = interpolate(rule.jsontpl[ts], req)
		} else {
			if (rule.json && rule.json[ts]) layer.json = rule.json[ts]
		}
	})
	return { index, status }
}


export const rest = async (query, get, client) => {
	const req = {...get, ...client}
	const ans = await meta.get(query, req)

	if (query == 'layers') {
		delete ans.push
	}

	if (query == 'sw') {
		return { ans, ext: 'js', status: 200, nostore: false, headers: { 'Service-Worker-Allowed': '/' }}
	} else if (~query.indexOf('set-') || ~['access','layers'].indexOf(query)) {
		return { ans, status: 200, nostore: true, ext: 'json' }
	} else {
		return { ans, status: 200, nostore: false, ext: 'json' }
	}
}
