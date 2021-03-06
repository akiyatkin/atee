import { files, file } from "./files.js"
import path from 'path'
import { readFile, utimes } from "fs/promises"

import { Meta } from "./Meta.js"
import { parse, explode, split } from './Spliter.js'

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
meta.addHandler('admin', async (view) => {
	const { cookie } = await view.gets(['cookie'])
	view.ans.status = 403
	view.ans.nostore = true
	if (!await Access.isAdmin(cookie)) return view.err('Access denied')
})
// meta.addArgument('password')
// meta.addAction('set-access', async view => {
// 	const { password } = await view.gets(['password'])
// })
meta.addAction('get-access', async view => {
	const { cookie } = await view.gets(['cookie'])
	view.ans['admin'] = await Access.isAdmin(cookie)
	view.ans['update_time'] = Access.getUpdateTime()
	view.ans['access_time'] = Access.getAccessTime()
	view.ans['view_time'] = Date.now()
	view.ans.nostore = true
	return view.ret()
})
meta.addAction('set-access', view => {
	Access.setAccessTime()
	return view.ret()
})
meta.addAction('set-update', async view => {
	const { cookie } = await view.gets(['admin'])
	const time = new Date();
	await utimes('../reload', time, time)
	return view.ret()
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



const interpolate = function(string, params) {
	const names = Object.keys(params)
	const vals = Object.values(params)
	return new Function(...names, 'return `'+string+'`')(...vals)
}


const wakeup = (rule) => {
	if (!rule) return
	if (!rule.layout) return
	for (const pts in rule.layout) {
		for (const div in rule.layout[pts]) {
			const tsf = rule.layout[pts][div]
			const [name, subframe] = tsf ? split(':', tsf) : ['','ROOT']
			const [sub, frame = ''] = split('.', subframe)
			const frameid = frame ? 'FRAMEID-' + frame.replaceAll('.','-') : ''
			const ts = tsf ? name + ':' + sub : ''
			const layer = { ts, tsf, name, sub, div, frame, frameid }
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
	//?????????? ???????????????? ???????????? ?? ??????????????
	runByIndex(rule, (root) => {
		//???????????????????????? ???? ?? ??????????-???? div ???????? ?? frame
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
	//root ???????????? ???????? ?????? ???????????????? ?????????? ?? ???????????????? ?? ??????????????
	
	if (root) root = '-' + root
	const { default: rule } = await import('/' + root + '/layers.json', {assert: { type: "json" }})
	

	applyframes(rule) //???????????????????? ????????????
	wakeup(rule, rule) //?????????????? ??????????
	spread(rule) //childs ??????????????????????????????
	
	const tsf = rule.index
	const [name, subframe] = split(':', tsf)
	const [sub, frame = ''] = split('.', subframe)
	const frameid = frame ? 'FRAMEID-' + frame.replaceAll('.','-') : ''
	const ts = tsf ? name + ':' + sub : ''
	runByIndex(rule, r => { //???????????? ???????????? root ???? ??????????
		r.root = { tsf, ts, name, sub, frame, frameid }	
		maketree(r.root, r.layout, rule)
		delete r.layout
		const push = []
		const pushtpl = []
		let head = {}
		runByRootLayer(r.root, layer => {
			const ts = layer.ts
			if (rule.animate && rule.animate[ts]) layer.animate = rule.animate[ts]
			if (rule.push && rule.push[ts]) push.push(...rule.push[ts])
			if (rule.pushtpl && rule.pushtpl[ts]) pushtpl.push(...rule.pushtpl[ts])
			if (rule.head && rule.head[ts]) head = rule.head[ts]
		})
		r.ready_pushtpl = pushtpl
		r.ready_push = push
		r.ready_head = head
	})
	return rule
})
meta.addAction('sitemap', async view => {
	const { root } = await view.gets(['root'])
	const rule = await getRule(root)
	if (!rule) return view.err()
	/*
		?????????? ???????????????????????? ?????? ?????? ???????????? ???????????????? ???? ???????????? ?????? update
		?? ?????? ???????? ????????????
		{
			child
			childs:{
				crumb1:*
				crumb2:*
			}
		}
		?????????? ???????????? ???????????? ?????????? ?????????????????????????????? head ????????????
	*/
	
	const list = []
	const date = new Date(Access.getUpdateTime())
	let dd = date.getDate();
	if (dd < 10) dd = '0' + dd;
	let mm = date.getMonth() + 1; // ?????????? 1-12
	if (mm < 10) mm = '0' + mm;
	const modified = date.getFullYear() + '-' + mm + '-' + dd
	const client = await view.get('client')
	let promise = Promise.resolve()
	runByIndex(rule, async (index, path) => {
		if (~path.indexOf(false)) return
		if (~['404','403','500'].indexOf(path[0])) return
		if (index.ready_head.hidden) return			
		if (index.ready_head.jsontpl) {
			const req = {path, get: {}}
			index.ready_head.json = interpolate(index.ready_head.jsontpl, req)
		}
		if (index.ready_head.json) {
			const json = index.ready_head.json
			promise = promise.then(() => loadJSON(json, client).then(data => {
				if (!Array.isArray(data)) data = [data]
				let h = path.join('/')
				data.forEach(data => {
					const href = data.child ? h + '/' + data.child : h
					index.ready_head = {...index.ready_head, ...data}
					list.push({
						...index.ready_head,
						modified,
						href
					})
				})
			}))
		} else {
			promise = promise.then(() => {
				list.push({
					...index.ready_head,
					modified,
					href: path.join('/')
				})
			})
		}
	})
	await promise
	return list
})
// meta.addAction('get-push', async view => {
// 	const { nt: next } = await view.gets(['nt'])
// })
meta.addArgument('client')
meta.addAction('get-layers', async view => {
	view.ans.nostore = true
	const {
		pv: prev, nt: next, host, cookie, st: access_time, ut: update_time, vt: view_time, gs: globals 
	} = await view.gets(['pv', 'ip', 'nt', 'host', 'cookie', 'st', 'ut', 'gs', 'vt'])
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
	//next ?? prev globals ???? ????????????????, ?????? ???????????????? ???? ?????? globals
	if (update_time && update_time < timings.update_time) {
		//update_time - reload
		return view.err()
	}
	if (access_time && access_time < timings.access_time) {
		//access_time - ?????? ???????? ???????? ???????????????? ????????????
		return view.err() //???? ?????? ??????????????????????????????
	}
	if (globals.length) {
		//access_time - ??????????-???? ???????? ???????? ???????????????? ????????????
		return view.err() //???? ?????? ??????????????????????????????	
	}
	
	//?????????? ???????????????? ?????????? globals update_time access_time ?????????????????? ???????????? ????????????
	//???????? ???? ???????????? ?????????? ???? ???????????????? update_time ?? access_time ???????????? ???????? ???? ????????????????
	//???????? ???????????? ?????????????? ???????????? ???????????? ?? ???????? ?????????????? ???????? ???????????? ???????? ?? ???????????? ?????????? ???????????? ??????????????, ?????? ???????? ???????????????????? 
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
	
	
	const { index: nopt, status, controller_request } = getIndex(rule, nroute, timings) //{ index: {head, push, root}, status }

	if (!nopt?.root) return view.err()
	view.ans.status = status
	//const req = {path:nroute.path, get: nroute.get, ...timing}
	
	if (!prev) {
		view.ans.push = nopt.ready_push
		view.ans.head = nopt.ready_head
		
		if (nopt.ready_pushtpl.length) {
			nopt.ready_pushtpl.forEach((val) => {
				view.ans.push.push(interpolate(val, controller_request))	
			})
		}
		if (view.ans.head.jsontpl) {
			view.ans.head.json = interpolate(view.ans.head.jsontpl, controller_request)
		}
		if (view.ans.head.json) {
			const child = nroute.crumbs ? nroute.crumbs[1] : nroute.path
			const client = await view.get('client')
			const json = view.ans.head.json
			const data = await loadJSON(json, client).then(data => {
				if (!Array.isArray(data)) data = [data]
				let h = path.join('/')
				return data.find(data => {
					if (data.child == child) return data
				})
			});
			view.ans.head = {...view.ans.head, ...data}
		}
		view.ans.layers = [nopt.root]
		return view.ret()
	}

	const proute = await router(prev)

	if (proute.rest || proute.secure) return view.err()
	if (proute.root != nroute.root) return view.err()

	const nlayers = structuredClone(nopt.root.layers)
	const { index: popt } = getIndex(rule, proute, ptimings)
	if (!popt.root) return view.err()

	view.ans.layers = getDiff(popt.root.layers, nlayers)
	
	if (nroute.search != proute.search) {
		view.ans.head = nopt.ready_head
		view.ans.push = nopt.ready_push
		if (nopt.ready_pushtpl) {
			nopt.ready_pushtpl.forEach((val) => {
				view.ans.push.push(interpolate(val, controller_request))	
			})
		}
		if (view.ans.head.jsontpl) {
			view.ans.head.json = interpolate(view.ans.head.jsontpl, controller_request)
		}
		if (view.ans.head.json) {
			const child = nroute.crumbs ? nroute.crumbs[1] : nroute.path
			const client = await view.get('client')
			const json = view.ans.head.json
			const data = await loadJSON(json, client).then(data => {
				if (!Array.isArray(data)) data = [data]
				let h = path.join('/')
				return data.find(data => {
					if (data.child == child) return data
				})
			});
			view.ans.head = {...view.ans.head, ...data}
		}
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
			layers.push(nlayer) //???????? ???? ????????????, ?????? ???????? ????????????????
		}
	})
	return layers
}


const getIndex = (rule, route, timings, options = {push: [], head: {}}, status = 200, oroute = {}) => {
	const crumb = route.crumbs ? route.crumbs[0] : route.path
	const ocrumb = (oroute.crumbs ? oroute.crumbs[0] : oroute.path) || crumb
	if (route.path && (!rule.childs || !rule.childs[crumb])) {
		if (route.path == '404') return []
		return getIndex(rule, {crumbs:['404'], path:'404', get: route.get}, timings, options, 404, route)
	}	
	const index = route.path ? rule.childs[crumb] : rule
	const controller_request = {
		path: oroute.path || route.path, 
		get: oroute.get || route.get, 
		crumb: ocrumb,
		child: oroute.crumbs ? (oroute.crumbs[1] || '') : (route.crumbs[1] || ''), 
		...timings
	}

	//const req = { get: route.get, host, cookie, root }
	runByRootLayer(index.root, layer => {
		const ts = layer.ts
		//const { default: rule } = await import(path.posix.join(IMPORT_APP_ROOT, root, 'layers.json'), {assert: { type: "json" }})
		if (layer.name) layer.tpl = rule.tpl[layer.name]
		
		if (rule.parsedtpl && rule.parsedtpl[ts]) {

			layer.parsed = interpolate(rule.parsedtpl[ts], controller_request)
			if (ts == 'errors:ER404' )console.log(layer)

		}
		if (rule.jsontpl && rule.jsontpl[ts]) {
			layer.json = interpolate(rule.jsontpl[ts], controller_request)
		} else {
			if (rule.json && rule.json[ts]) layer.json = rule.json[ts]
		}
	})
	return { index, status, controller_request }
}

meta.addAction('sitemap.xml', async view => {
	const { sitemap, host } = await view.gets(['sitemap','host'])
	return SITEMAP_XML( sitemap, { host } )
})
meta.addAction('robots.txt', async view => {
	const { host } = await view.gets(['host'])
	return ROBOTS_TXT( true, { host } )
})
export const rest = async (query, get, client) => {
	if (query == 'set-admin') {
		const result = await Access.isAdmin(get.password)
		return { ans:{result}, status: 200, nostore: true, ext: 'json', 
			headers: {
				'Set-Cookie':'-controller=' + (get.password ?? '') + '; path=/; expires=Fri, 31 Dec 9999 23:59:59 GMT'
			}
		}	
	}
	const req = {root:'', ...get, ...client, client}
	const ans = await meta.get(query, req)
	if (query == 'robots.txt') return { ans, ext:'txt', nostore: true }
	if (query == 'sitemap.xml') return { ans, ext:'xml', nostore: true }
	if (query == 'get-layers') ans.status = 200
	const { ext = 'json', status = 200, nostore = ~query.indexOf('set-')} = ans
	delete ans.status
	delete ans.nostore
	delete ans.ext
	delete ans.push
	return { ans, status, nostore, ext }
	
}
