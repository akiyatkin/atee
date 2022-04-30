import { files } from "./files.js"
import path from 'path'
import { readFile, utimes } from "fs/promises"

import { Meta, View } from "./Meta.js"
import { parse } from './headers.js'
import { whereisit } from './whereisit.js'
import { router } from './router.js'
import { Access } from '@atee/controller/Access.js'

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
meta.addArgument('prev')
meta.addArgument('next')
meta.addArgument('root')
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
}
const divtplsub = (dts, inherit) => {
	let rf, rs, div, tpl, sub
	rf = dts.split('/')
	if (rf.length > 1) {
		div = rf[0]
		rs = rf[1].split(':')
		if (rs.length > 1) {
			sub = rs[1]
			tpl = rs[0]
		} else {
			tpl = rf[1]
			sub = 'ROOT'
		}
	} else {
		rs = dts.split(':')
		if (rs.length > 1) {
			tpl = rs[0]
			div = sub = rs[1]
		} else {
			if (inherit) {
				tpl = inherit
				sub = div = dts
			} else {
				tpl = dts
				sub = 'ROOT'
				div = ''
			}
		}
	}
	return {div, tpl, sub}
}
meta.addAction('layers', async view => {
	const {
		prev, next, host, cookie, root, access_time, update_time, globals 
	} = await view.gets(['prev', 'next', 'host', 'cookie', 'root', 'access_time', 'update_time', 'globals'])
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
	const {
		search, secure, get,
		rest, query, restroot,
		cont, root: nextroot, crumbs
	} = await router(next)

	if (rest || secure || root != nextroot) return view.err()

	const { default: rules } = await import(path.posix.join(IMPORT_APP_ROOT, root, 'layers.json'), {assert: { type: "json" }})
	
	if (rules.type != 'landing') return view.err('Bad type layers.json')
	
	let { json, jsontpl, seo, tpl, tpls } = rules
	const req = {get, host, cookie, root}
	if (jsontpl) json = interpolate(jsontpl, req)
	
	const layers = []
	
	const dts = divtplsub(tpl)
	const id = 1
	layers.push({
		id, 
		json, 
		tpl:tpls[dts.tpl], 
		sub: dts.sub, 
		div:dts.div
	})
	const push = []
	push.push('</images/logo.svg>; rel=preload; as=image; type=image/svg+xml')
	view.ans.push = push
	view.ans.seo = seo
	view.ans.layers = layers

	return view.ret()    
	
	
})

export const rest = async (query, get) => {
	if (query == 'init.js') return file(FILE_MOD_ROOT + 'init.js', 'js')
	if (query == 'test.js') return files(FILE_MOD_ROOT + 'test.js', 'js')

	const ans = await meta.get(query, get)
	delete ans.push
	if (query == 'sw') {
		return { ans, ext: 'js', status: 200, nostore: false, headers: { 'Service-Worker-Allowed': '/' }}
	} else if (~query.indexOf('set-') || ~['access','layers'].indexOf(query)) {
		return { ans, status: 200, nostore: true, ext: 'json' }
	} else {
		return { ans, status: 200, nostore: false, ext: 'json' }
	}
}
