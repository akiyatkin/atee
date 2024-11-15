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

const rest = new Rest()
import rest_admin from '/-controller/rest.admin.js'
rest.extra(rest_admin)
import rest_path from '/-controller/rest.path.js'
rest.extra(rest_path)
import rest_funcs from '/-rest/rest.funcs.js'
rest.extra(rest_funcs)



rest.addResponse('get-admin', async view => {
	await view.get('admin')
	return view.ret()
})
rest.addResponse('get-access', async view => {
	const visitor = view.visitor
	const cookie = visitor.client.cookie
	view.ans['admin'] = await Access.isAdmin(cookie)
	view.ans['update_time'] = Access.getUpdateTime()
	view.ans['access_time'] = Access.getAccessTime()
	view.ans['view_time'] = Date.now()
	return view.ret('OK', 200, true)
})

rest.addArgument('go', ['string']) //Ссылка куда перейти. Как есть попадает в заголовок Location 301


rest.addAction('set-access', async view => {
	//await view.get('admin')
	view.nostore = true
	Access.setAccessTime()

	const go = await view.get('go')
	if (!go) return view.ret()

	view.headers.Location = encodeURI(go)
	return view.ret('', 301)
})




rest.addResponse('set-update', async view => {
	await view.gets(['admin'])
	const time = new Date();
	await utimes('../reload', time, time).catch(r => false)
	return view.ret('Выполнена команда touch ../reload. Сервер перезапуститсь если такой механизм поддерживается.')
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
	const req = await view.gets(['rt', 'rd', 'pv', 'nt', 'st', 'ut', 'rg', 'vt'])	

	const {
		rt:reloadtss, 
		rd:reloaddivs, 
		pv: prev, 
		nt: next, 
		st: access_time, 
		ut: update_time, 
		vt: view_time, 
		rg: globals 
	} = req
	//console.log(req)
	const visitor = view.visitor
	const host = visitor.client.host
	const cookie = visitor.client.cookie
	const ptimings = { access_time, update_time, view_time }

	const timings = {
		update_time: Access.getUpdateTime(),
		view_time: Date.now(),
		access_time: Access.getAccessTime()
	}
	view.data.ut = timings.update_time
	view.data.st = timings.access_time
	view.data.vt = timings.view_time
	

	if (!next) return view.err()
	// if (globals.length) {
	// 	return view.err() //Ну или перезагрузиться	
	// }
	// view.data.gs = globals
	
	const nroute = await router(next)
	view.data.root = nroute.root
	
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

	const { index: nopt, status } = Layers.getParsedIndex(rule, timings, bread, interpolate, theme) //{ index: {push, root}, status }
	if (!nopt?.root) return view.err()
	
	if (nopt.check) {
		const {data} = await loadJSON(nopt.check, view.visitor)
		if (data.redirect) {
			view.data.layers = []
			view.data.redirect = data.redirect
			return view.ret()
		}
	}

	
		
		
	
	//view.data.checks = nopt.checks //wtf?
	view.status = status
	

	view.data.theme = theme
	if (prev === false) {
		view.data.push = Layers.collectPush(rule, timings, bread, nopt.root, interpolate, theme)
		view.data.layers = [nopt.root]
		return view.ret()
	}
	if (prev === '') {
		view.data.layers = nopt.root.layers
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
	//view.data.status = Math.max()
	if (!popt.root) return view.err()

	
	
	

	view.data.layers = getDiff(popt.root.layers, nlayers, reloaddivs, reloadtss, globals)
	if (reloaddivs.length) view.data.rd = reloaddivs
	if (reloadtss.length) view.data.rt = reloadtss
	if (globals.length) view.data.rg = globals
	
	return view.ret()    
})




rest.addResponse('get-head', async view => {	
	let { root, path } = await view.gets(['root', 'path'])	
	
	const bread = new Bread(path, {}, path, root)

	const layers = Layers.getInstance(root)
	const source = await layers.getSource()

	const { index: { head }, depth } = Layers.getIndex(source, bread)

	return head
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
		data:{result}, 
		headers: {
			'Set-Cookie':'-controller=' + encodeURIComponent(password ?? '') + '; path=/; SameSite=Strict; expires=Fri, 31 Dec 9999 23:59:59 GMT'
		}
	}
})


export default rest
