import { files, file } from "./files.js"
import path from 'path'
import { readFile, utimes } from "fs/promises"
import Rest from "/-rest"
import Bread from '/-controller/Bread.js'
import { router } from './router.js'
import { Access } from '/-controller/Access.js'
import { Once } from './Once.js'
import Layers from '/-controller/Layers.js'
import { whereisit } from './whereisit.js'
import Theme from '/-controller/Theme.js'
const { FILE_MOD_ROOT, IMPORT_APP_ROOT } = whereisit(import.meta.url)

import rest_admin from '/-controller/rest.admin.js'
import rest_funcs from '/-rest/funcs.js'

const rest = new Rest(rest_admin, rest_funcs)

rest.addResponse('get-access', async view => {
	const { visitor } = await view.gets(['visitor'])
	const cookie = visitor.client.cookie
	view.ans['admin'] = await Access.isAdmin(cookie)
	view.ans['update_time'] = Access.getUpdateTime()
	view.ans['access_time'] = Access.getAccessTime()
	view.ans['view_time'] = Date.now()
	return view.ret('OK', 200, true)
})
rest.addResponse('set-access', async view => {
	await view.gets(['admin'])
	Access.setAccessTime()
	return view.ret()
})
rest.addResponse('set-update', async view => {
	await view.gets(['admin'])
	const time = new Date();
	const r = await utimes('../reload', time, time).catch(r => false)
	if (r) return view.ret()
	return view.err()
})

rest.addFunction('checksearch', (view, n) => {
	if (n && n[0] != '/') return view.err()
	return n
})

rest.addArgument('pv', ['checksearch']) //prev
rest.addArgument('nt', ['checksearch']) //next
rest.addArgument('vt', ['int']) //view_time
rest.addArgument('ut', ['int']) //update_time
rest.addArgument('st', ['int']) //access_time
rest.addArgument('gs', ['array']) //globals
rest.addArgument('rd', ['array']) //reloaddivs
rest.addArgument('rt', ['array']) //reloadts


//const fi = (before, after) => before && after ? before + after : {toString:() => ''}
//const fi = (...args) => args.some(a => !a) ? '' : args.join('')
const fin = (before, after) => before ? before + after : ''
const lin = (before, after) => after ? before + after : ''

const split = (sep, str) => {
    if (!str) return []
    const i = str.indexOf(sep)
    return ~i ? [str.slice(0, i), str.slice(i + 1)] : [str]
}
const wakeup = (rule, depth = 0) => {
	if (!rule) return 
	if (!rule.layout) return
	for (const pts in rule.layout) {
		for (const div in rule.layout[pts]) {
			const tsf = rule.layout[pts][div]
			const [name = '', subframe = ''] = tsf ? split(':', tsf) : []
			const [sub = '', frame = ''] = split('.', subframe)
			const ts = fin(name, lin(':', sub))
			const sid = [div, name, sub, frame].join('-')
			//const ts = fi(name, ':' + sub)
			const layer = { sid, ts, tsf, name, sub, div, depth, tpl:null, html: null, json:null, layers: null}
			
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

const maketree = (layer, layout, rule) => {
	if (!layout) return
	const tsf = layer.tsf
	if (!layout[tsf]) return
	layer.layers = Object.values(layout[tsf])
	for (const l of layer.layers) {
		maketree(l, layout, rule)
	}
}
const runByRootLayer = (root, fn) => {
	fn(root)
	root.layers?.forEach(l => runByRootLayer(l, fn))
}
const runByLayer = (rule, fn) => {
	Layers.runByIndex(rule, r => {
		runByRootLayer(rule.root, fn)
	})
}
const applyframes = (rule) => {
	if (!rule.frame) return
	const frame = rule.frame
	//Нужно встроить фреймы в вёрстку
	Layers.runByIndex(rule, (root) => {
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
	const layers = Layers.getInstance(root)
	const source = await layers.getSource()
	const rule = structuredClone(source)
	
	applyframes(rule) //встраиваем фреймы
	
	wakeup(rule) //объекты слоёв
	spread(rule) //layout в childs самодостаточный
	
	
	const tsf = rule.index
	const [name = '', subframe = ''] = split(':', tsf)
	const [sub = '', frame = ''] = split('.', subframe)
	const frameid = frame ? 'FRAMEID-' + frame.replaceAll('.','-') : ''
	const ts = fin(name, lin(':', sub))
	
	//const ts = fi(name, ':' + sub)
	Layers.runByIndex(rule, (r, path) => { //строим дерево root по дивам		
		const layer = { tsf, ts, name, sub, frame, frameid, depth: 0, tpl:null, html: null, json:null, layers:null }
		r.root = layer
		//Object.seal(r.root) debug test
		maketree(r.root, r.layout, rule)
		delete r.layout
		runByRootLayer(r.root, layer => {
			const ts = layer.ts
			if (rule.animate && rule.animate[ts]) layer.animate = rule.animate[ts]
			if (!rule.depth || rule.depth[ts] == null) return
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


rest.addResponse('get-layers', async view => {
	view.nostore = true
	view.headers = {}
	const {
		visitor, rt:reloadtss, rd:reloaddivs, pv: prev, nt: next, st: access_time, ut: update_time, vt: view_time, gs: globals 
	} = await view.gets(['visitor', 'rt', 'rd', 'pv', 'nt', 'st', 'ut', 'gs', 'vt'])
	const host = visitor.client.host
	const cookie = visitor.client.cookie
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
	
	const theme = Theme.harvest(bread.get, cookie)

	if (bread.get.theme != null) {
		const themevalue = Object.entries(theme).map(a => a.join("=")).join(":")
		if (themevalue) {
			view.headers['Set-Cookie'] = 'theme=' + encodeURIComponent(themevalue) + '; path=/; SameSite=Strict; expires=Fri, 31 Dec 9999 23:59:59 GMT'
		} else {
			view.headers['Set-Cookie'] = 'theme=; path=/; SameSite=Strict; Max-Age=-1;'
		}
	}

	const interpolate = (val, timings, layer, bread, crumb, theme) => {
		const look = { bread, timings, theme }
		const env = { layer, crumb, ...look }
		env.sid = 'sid-' + (layer.div || layer.name) + '-' + layer.sub + '-'
		env.scope = layer.div ? '#' + layer.div : 'html'
		return new Function(
			'env', 'host', 'timings', 'layer', 'bread', 'crumb', 'theme',
			'return `'+val+'`'
		)(env, host, timings, layer, bread, crumb, theme)
	}

	const { index: nopt, status } = getIndex(rule, timings, bread, interpolate, theme) //{ index: {push, root}, status }

	if (!nopt?.root) return view.err()
	view.status = status
	view.ans.theme = theme

	if (!prev) {
		view.ans.push = collectPush(rule, timings, bread, nopt.root, interpolate, theme)
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
	const ptheme = Theme.harvest(pbread.get, cookie)
	
	
	const { index: popt } = getIndex(rule, ptimings, pbread, interpolate, ptheme)
	if (!popt.root) return view.err()

	
	
	

	view.ans.layers = getDiff(popt.root.layers, nlayers, reloaddivs, reloadtss)
	if (reloaddivs.length) view.ans.rd = reloaddivs
	if (reloadtss.length) view.ans.rt = reloadtss

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
	const {index, status, depth} = Layers.getIndex(rule, bread)
	if (!index) return []
	runByRootLayer(index.root, layer => {
		const crumb = bread.getCrumb(layer.depth)
		const ts = layer.ts
		if (rule.replacetpl) layer.replacetpl = rule.replacetpl[layer.ts]
		if (layer.name) {
			if (rule.htmltpl?.[layer.name]) {
				layer.html = interpolate(rule.htmltpl[layer.name], timings, layer, bread, crumb, theme)
			} else {
				if (rule.html) layer.html = rule.html[layer.name]
			}
			if (rule.tpl) layer.tpl = rule.tpl[layer.name]
			
		}
		if (rule.parsedtpl?.[ts]) {
			layer.parsed = interpolate(rule.parsedtpl[ts], timings, layer, bread, crumb, theme)
		}
		if (rule.jsontpl?.[ts]) {
			layer.json = interpolate(rule.jsontpl[ts], timings, layer, bread, crumb, theme)
		} else {
			if (rule.json) layer.json = rule.json[ts]
		}

	})
	return { index, status }
}
rest.addArgument('password')
rest.addResponse('set-admin', async (view) => {
	const { password } = await view.gets(['password'])
	const result = await Access.isAdmin(password)
	return { 
		ans:{result}, 
		headers: {
			'Set-Cookie':'-controller=' + encodeURIComponent(password ?? '') + '; path=/; SameSite=Strict; expires=Fri, 31 Dec 9999 23:59:59 GMT'
		}
	}
})

export default rest
