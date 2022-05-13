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
	for (const path in rule.childs) {
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
	for (const path in rule.childs) {
		spread(rule.childs[path], rule)
	}
}

const runByIndex = (rule, fn) => {
	fn(rule)
	if (rule.childs) for(const i in rule.childs) fn(rule.childs[i])
	if (rule.child) fn(rule.child)
}
const maketree = (layer, layout, rule, seo = null, push = []) => {
	if (!layout) return
	const ts = layer.ts
	if (!layout[ts]) return
	layer.layers = Object.values(layout[layer.ts])
	for (const l of layer.layers) {
		maketree(l, layout, rule, seo, push)
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
	})

	return rule
})


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
	const nopt = getIndex(rule, nroute, view.ans.vt) //{ seo, push, root, status }
	
	if (!nopt.root) return view.err()
	
	view.ans.status = nopt.status

	if (!prev) {
		view.ans.push = nopt.push
		view.ans.seo = nopt.seo
		view.ans.layers = [nopt.root]
		return view.ret()
	}

	const proute = await router(prev)

	if (proute.rest || proute.secure) return view.err()
	if (proute.root != nroute.root) return view.err()

	const nlayers = structuredClone(nopt.root.layers)
	const popt = getIndex(rule, proute, view_time)
	if (!popt.root) return view.err()


	
	//console.log(JSON.stringify(popt.root.layers), JSON.stringify(nlayers))
	view.ans.layers = getDiff(popt.root.layers, nlayers)
	if (nopt.search != popt.search) {
		view.ans.seo = nopt.seo
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


const getIndex = (rule, {path, get}, view_time, options = {push: [], seo: {}}, status = 200) => {
	if (path && !rule.childs[path]) {
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

		if (rule.push && rule.push[ts]) options.push.push(...rule.push[ts])
		if (rule.seo && rule.seo[ts]) options.seo = rule.seo[ts]
	})
	return { seo: options.seo, push: options.push, root: index.root, status }
}


export const rest = async (query, get, client) => {
	//if (query == 'init.js') return file(FILE_MOD_ROOT + 'init.js', 'js')
	//if (query == 'test.js') return files(FILE_MOD_ROOT + 'test.js', 'js')

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
