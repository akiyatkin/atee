import { files, file } from "./files.js"
import path from 'path'
import { readFile, utimes } from "fs/promises"
import Rest from "/-rest"
import Bread from '/-controller/Bread.js'
import { router, loadJSON } from './router.js'
import { Access } from '/-controller/Access.js'
import { Once } from './Once.js'
import Layers from '/-controller/Layers.js'
import { whereisit } from './whereisit.js'
import Theme from '/-controller/Theme.js'
const { FILE_MOD_ROOT, IMPORT_APP_ROOT } = whereisit(import.meta.url)

import rest_admin from '/-controller/rest.admin.js'
import rest_path from '/-controller/rest.path.js'
import rest_funcs from '/-rest/rest.funcs.js'


const rest = new Rest(rest_admin, rest_funcs, rest_path)
rest.addResponse('get-admin', async view => {
	await view.get('admin')
	return view.ret()
})
rest.addResponse('get-access', async view => {
	const { visitor } = await view.gets(['visitor'])
	const cookie = visitor.client.cookie
	view.ans['admin'] = await Access.isAdmin(cookie)
	view.ans['update_time'] = Access.getUpdateTime()
	view.ans['access_time'] = Access.getAccessTime()
	view.ans['view_time'] = Date.now()
	return view.ret('OK', 200, true)
})

rest.addArgument('go', ['string']) //Ссылка куда перейти. Как есть попадает в заголовок Location 301
rest.addResponse('set-access', async view => {
	const { go } = await view.gets(['admin','go'])
	Access.setAccessTime()
	if (!go) return view.ret()
	view.headers.Location = go
	return view.ret('', 301)
})
rest.addResponse('set-update', async view => {
	await view.gets(['admin'])
	const time = new Date();
	const r = await utimes('../reload', time, time).catch(r => false)
	if (r) return view.ret()
	return view.err()
})


rest.addArgument('pv', ['checksearch']) //prev
rest.addArgument('nt', ['checksearch']) //next
rest.addArgument('vt', ['int#0']) //view_time
rest.addArgument('ut', ['int#0']) //update_time
rest.addArgument('st', ['int#0']) //access_time

rest.addArgument('rg', ['array']) //globals
rest.addArgument('rd', ['array']) //reloaddivs
rest.addArgument('rt', ['array']) //reloadts




rest.addResponse('get-layers', async view => {
	view.nostore = true
	view.headers = {}
	const {
		visitor, rt:reloadtss, rd:reloaddivs, pv: prev, nt: next, st: access_time, ut: update_time, vt: view_time, rg: globals 
	} = await view.gets(['visitor', 'rt', 'rd', 'pv', 'nt', 'st', 'ut', 'rg', 'vt'])	
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
	// if (globals.length) {
	// 	return view.err() //Ну или перезагрузиться	
	// }
	// view.ans.gs = globals
	
	const nroute = await router(next)
	view.ans.root = nroute.root
	
	if (nroute.rest || nroute.secure) return view.err()
	const rule = await Layers.getRule(nroute.root)
	
	if (!rule) return view.err('Bad type layers.json')

	const bread = new Bread(nroute.path, nroute.get, nroute.search, nroute.root)
	
	const theme = Theme.harvest(bread.get, cookie)
	if (bread.get.theme != null) {
		Theme.set(view, theme)
	}


	const interpolate = (val, timings, layer, bread, crumb, theme) => {
		const look = { bread, timings, theme }
		const env = { layer, crumb, ...look }
		if (layer) {
			env.sid = 'sid-' + (layer.div || layer.name) + '-' + layer.sub + '-'
			env.scope = layer.div ? '#' + layer.div : 'html'
		}
		return new Function(
			'env', 'host', 'timings', 'layer', 'bread', 'crumb', 'theme',
			'return `'+val+'`'
		)(env, host, timings, layer, bread, crumb, theme)
	}

	const { index: nopt, status, check } = Layers.getParsedIndex(rule, timings, bread, interpolate, theme) //{ index: {push, root}, status }
	
	if (!nopt?.root) return view.err()

	if (check) {
		const {ans} = await loadJSON(check, view.visitor)
		if (ans.redirect) {
			view.ans.layers = []
			view.ans.redirect = ans.redirect
			return view.ret()
		}
	}
	
		
		
	
	view.ans.checks = nopt.checks
	view.status = status
	view.ans.theme = theme
	if (prev === false) {
		view.ans.push = Layers.collectPush(rule, timings, bread, nopt.root, interpolate, theme)
		view.ans.layers = [nopt.root]
		return view.ret()
	}
	if (prev === '') {
		view.ans.layers = nopt.root.layers
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
	
	
	const { index: popt } = Layers.getParsedIndex(rule, ptimings, pbread, interpolate, ptheme)
	if (!popt.root) return view.err()

	
	
	

	view.ans.layers = getDiff(popt.root.layers, nlayers, reloaddivs, reloadtss, globals)
	if (reloaddivs.length) view.ans.rd = reloaddivs
	if (reloadtss.length) view.ans.rt = reloadtss
	if (globals.length) view.ans.rg = globals

	return view.ret()    
})




rest.addResponse('get-head', async view => {	
	let { root, path } = await view.gets(['root', 'path'])	
	
	const bread = new Bread(path, {}, path, root)

	const layers = Layers.getInstance(root)
	const source = await layers.getSource()

	const { index: { head }, depth } = Layers.getIndex(source, bread)

	return {ans:head}
})
const getDiff = (players, nlayers, reloaddivs, reloadtss, globals, layers = []) => {
	nlayers?.forEach(nlayer => {
		const player = players.find(player => {
			return nlayer.div == player.div 
			&& nlayer.ts == player.ts 
			&& nlayer.json == player.json 
			&& nlayer.html == player.html 
			&& nlayer.parsed == player.parsed 
			&& !~reloaddivs.indexOf(player.div)
			&& !~reloadtss.indexOf(player.ts)
			&& (!player.global || !globals.some(g => ~player.global.indexOf(g)))
		})
		if (player) {
			getDiff(player.layers || [], nlayer.layers, reloaddivs, reloadtss, globals, layers)
		} else {
			layers.push(nlayer) //Слой не найден, его надо показать
		}
	})
	return layers
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
