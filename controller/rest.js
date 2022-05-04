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
meta.addFunction('int', n => Number(n))
meta.addFunction('array', n => explode(',', n))
meta.addArgument('host')
meta.addArgument('ip')
meta.addArgument('prev')
meta.addArgument('next')
meta.addArgument('update_time', ['int'])
meta.addArgument('access_time', ['int'])
meta.addArgument('globals','array')


meta.addAction('sw', async view => {
	const res = await view.get('access')
	const script = await readFile(FILE_MOD_ROOT + '/sw.js', 'utf-8')
	const ans = `
		let UPDATE_TIME = ${res.UPDATE_TIME}
		let ACCESS_TIME = ${res.ACCESS_TIME}
		${script}`
	return ans
})

const interpolate = function(strings, params) {
	const names = Object.keys(params)
	const vals = Object.values(params)
	return new Function(...names, `return \`${strings}\``)(...vals)
	//const req = { get: route.get, host, cookie, root }
	//const json = rule.jsontpl ? interpolate(rule.jsontpl, req) : rule.json
}
const divtplsub = (dts, inherit) => {
	let rf, rs, div, name, sub
	rf = dts.split('/')
	if (rf.length > 1) {
		div = rf[0]
		rs = rf[1].split(':')
		if (rs.length > 1) {
			sub = rs[1]
			name = rs[0]
		} else {
			name = rf[1]
			sub = 'ROOT'
		}
	} else {
		rs = dts.split(':')
		if (rs.length > 1) {
			name = rs[0]
			div = sub = rs[1]
		} else {
			if (inherit) {
				name = inherit
				sub = div = dts
			} else {
				name = dts
				sub = 'ROOT'
				div = ''
			}
		}
	}
	return {div, name, sub, divs:{}}
}



const getRule = Once.proxy( async root => {
	const { default: rule } = await import(path.posix.join(IMPORT_APP_ROOT, root, 'layers.json'), {assert: { type: "json" }})
	if (rule.type != 'landing') return false
	return rule
})


meta.addAction('layers', async view => {
	const {
		prev, next, host, cookie, access_time, update_time, globals 
	} = await view.gets(['prev', 'ip', 'next', 'host', 'cookie', 'access_time', 'update_time', 'globals'])

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
	view.ans.globals = globals
	view.ans.update_time = Access.getUpdateTime()
	view.ans.access_time = Access.getAccessTime()

	
	const nroute = await router(next)
	if (nroute.rest || nroute.secure) return view.err()
	const rule = await getRule(nroute.root)
	if (!rule) return view.err('Bad type layers.json')
	const nopt = getLayers(rule, nroute.path)
	if (!nopt.layers) return view.err()
	
	view.ans.status = nopt.status

	if (!prev) {
		view.ans.push = nopt.push
		view.ans.seo = nopt.seo
		view.ans.layers = nopt.layers
		return view.ret()
	}
	const proute = await router(prev)
	if (proute.rest || proute.secure) return view.err()
	if (proute.root != nroute.root) return view.err()
	const popt = getLayers(rule, proute.path)
	if (!popt.layers) return view.err()


	view.ans.seo = nopt.seo
	view.ans.layers = getDiff(popt.layers, nopt.layers)

	return view.ret()    
})
const getDiff = (players, nlayers, layers = []) => {
	nlayers.forEach(nlayer => {
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
const apply = (rule, source, divs, applyfn, options, inherit) => {
	const dts = divtplsub(source, inherit)
	applyfn(rule, dts, source, divs, options)
	if (!rule.env[source]) return
	rule.env[source].forEach(source => apply(rule, source, dts.divs, applyfn, options, dts.name))
}
const applyfn = (rule, layer, source, divs, options) => {
	layer.json = rule.json[source]
	layer.tpl = rule.tpl[layer.name]
	divs[layer.div] = layer
	if (rule.push[source]) options.push.push(...rule.push[source])
	const shortsource = layer.name + (layer.sub == 'ROOT' ? '' : `:${layer.sub}`)
	if (rule.seo[shortsource]) options.seo = rule.seo[shortsource]
}
const divs2layers = (divs, fn) => {
	for (const i in divs) {
		divs[i].layers = divs2layers(divs[i].divs)
		delete divs[i].divs
	}
	return Object.values(divs)
}
const getLayers = (rule, path, options = {push: []}, status = 200) => {
	if (path && !rule.childs[path]) {
		if (path == '404') return []
		return getLayers(rule, '404', options, 404)
	}
	const source = rule.index || 'index'
	
	const divs = {}
	apply(rule, source, divs, applyfn, options)
	if (path) {
		apply(rule, rule.childs[path], divs[''].divs, applyfn, options, source)	
	}
	const layers = divs2layers(divs)
	return { seo: options.seo, push: options.push, layers, status }
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
