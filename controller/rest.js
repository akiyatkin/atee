import { files } from "./files.js"
import path from 'path'
import { readFile, utimes } from "fs/promises"

import { Meta, View } from "./Meta.js"
import { parse } from './pathparse.js'
import { whereisit } from './whereisit.js'
import { router } from './router.js'
import { Access } from '@atee/controller/Access.js'
import { Once } from './Once.js'

const { FILE_MOD_ROOT, IMPORT_APP_ROOT } = whereisit(import.meta.url)



export const meta = new Meta()

meta.addAction('access', view => {
	view.ans['UPDATE_TIME'] = Access.getUpdateTime()
	view.ans['ACCESS_TIME'] = Access.getAccessTime()
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
meta.addArgument('host')
meta.addArgument('ip')
meta.addArgument('pv') //prev
meta.addArgument('nt') //next
meta.addArgument('ut', ['int']) //update_time
meta.addArgument('st', ['int']) //access_time
meta.addArgument('gs','array') //globals


// meta.addAction('sw', async view => {
// 	const res = await view.get('access')
// 	const script = await readFile(FILE_MOD_ROOT + '/sw.js', 'utf-8')
// 	const ans = `
// 		let UPDATE_TIME = ${res.UPDATE_TIME}
// 		let ACCESS_TIME = ${res.ACCESS_TIME}
// 		${script}`
// 	return ans
// })

const interpolate = function(strings, params) {
	const names = Object.keys(params)
	const vals = Object.values(params)
	return new Function(...names, `return \`${strings}\``)(...vals)
	//const req = { get: route.get, host, cookie, root }
	//const json = rule.jsontpl ? interpolate(rule.jsontpl, req) : rule.json
}


const wakeup = rule => {
	if (!rule) return
	if (!rule.layout) return
	for (const pts in rule.layout) {
		for (const div in rule.layout[pts]) {
			const ts = rule.layout[pts][div]
			const [name, sub] = ts ? ts.split(':') : ['','ROOT']
			rule.layout[pts][div] = { ts, name, sub, div }
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
		pv: prev, nt: next, host, cookie, at: access_time, ut: update_time, gs: globals 
	} = await view.gets(['pv', 'ip', 'nt', 'host', 'cookie', 'st', 'ut', 'gs'])

	view.ans.ut = Access.getUpdateTime()
	view.ans.st = Access.getAccessTime()
	
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
	if (nroute.rest || nroute.secure) return view.err()
	const rule = await getRule(nroute.root)
	if (!rule) return view.err('Bad type layers.json')
	const nopt = getIndex(rule, nroute.path) //{ seo, push, root, status }
	
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

	const popt = getIndex(rule, proute.path)
	if (!popt.root) return view.err()


	view.ans.seo = nopt.seo

	view.ans.layers = getDiff(popt.root.layers, nopt.root.layers)


	return view.ret()    
})
const getDiff = (players, nlayers, layers = []) => {
	nlayers?.forEach(nlayer => {
		const player = players.find(player => {
			return nlayer.div == player.div && nlayer.sub == player.sub && nlayer.json == player.json && nlayer.name == player.name
		})
		if (player) {
			getDiff(player.layers, nlayer.layers, layers)
		} else {
			layers.push(nlayer) //Слой не найден, его надо показать
		}
	})
	return layers
}


const getIndex = (rule, path, options = {push: [], seo: {}}, status = 200) => {
	if (path && !rule.childs[path]) {
		if (path == '404') return []
		return getIndex(rule, '404', options, 404)
	}
	const index = path ? rule.childs[path] : rule

	runByRootLayer(index.root, layer => {
		const ts = layer.ts
		if (layer.name) layer.tpl = rule.tpl[layer.name]
		if (rule.json[ts]) layer.json = rule.json[ts]
		
		if (rule.push[ts]) options.push.push(...rule.push[ts])
		if (rule.seo[ts]) options.seo = rule.seo[ts]
	})
	return { seo: options.seo, push: options.push, root: index.root, status }
}


export const rest = async (query, get, client) => {
	if (query == 'init.js') return file(FILE_MOD_ROOT + 'init.js', 'js')
	if (query == 'test.js') return files(FILE_MOD_ROOT + 'test.js', 'js')

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
