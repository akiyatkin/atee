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
const apply = (ans, rule, source, divs, applyfn, inherit) => {
	const dts = divtplsub(source, inherit)
	applyfn(ans, rule, dts, source, divs)
	if (!rule.env[source]) return
	rule.env[source].forEach(source => apply(ans, rule, source, dts.divs, applyfn, dts.name))
}
const applyfn = (ans, rule, layer, source, divs) => {
	layer.json = rule.json[source]
	layer.tpl = rule.tpl[layer.name]
	divs[layer.div] = layer
	if (rule.push[source]) ans.push.push(...rule.push[source])
	const shortsource = layer.name + (layer.sub == 'ROOT' ? '' : `:${layer.sub}`)
	if (rule.seo[shortsource]) ans.seo = rule.seo[shortsource]
}
const divs2layers = (layer, fn) => {
	for (const i in layer.divs) divs2layers(layer.divs[i])
	layer.layers = Object.values(layer.divs)
	delete layer.divs
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

	const route = await router(next)
	
	// || prevroute.root != nextroute.root
	if (route.rest || route.secure) return view.err()

	const rule = await getRule(route.root)
	if (!rule) return view.err('Bad type layers.json')
	
	const ans = view.ans
	

	ans.push = []
	ans.seo = {}

	if (route.path && !rule.childs[route.path]) {
		ans.layers = []
		return view.err()
	}

	const source = rule.index || 'index'
	ans.divs = {}
	
	apply(ans, rule, source, ans.divs, applyfn)
	if (route.path) {
		apply(ans, rule, rule.childs[route.path], ans.divs[''].divs, applyfn, source)	
	}
	//console.log(ans.divs[''])
	divs2layers(ans)
	//ans.divs = Object.values(ans.divs)


	return view.ret()    
})

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
