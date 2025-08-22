import { router, readTextStream, loadJSON, loadTEXT } from './router.js'
import http from 'node:http'
import fs from 'fs/promises'
import { ReadStream } from 'fs'
import { pipeline } from 'stream/promises'
import { Duplex } from 'stream'
import Access from '/-controller/Access.js'
import rest from '/-controller/rest.js'
import Bread from './Bread.js'
import Doc from './Doc.js'
import getPost from './getPost.js'
import config from '/-config'
import Visitor from '/-controller/Visitor.js'

const conf = await config('controller')

const Server = {
	follow: (PORT = 8888, IP = "127.0.0.1") => {
		const server = http.createServer()
		server.on('request', async (request, response) => {

			const error_after = (code, status) => {
				console.log('error_after content', request.url, code, status)
				return response.end()
			}
			const error_before = (code, status) => {
				//console.log('error_before content', request.url, code, status)
				response.writeHead(code, status)
				return response.end()
			}
			if (!~['GET','POST'].indexOf(request.method)) {
				return error_before(501, 'Method ' + request.method + ' not implemented')
			}
			const usersearch = request.url.replace(/\/+/,'/').replace(/\/$/,'')//Дубли и слешей не ломают путь, но это плохо...
			const route = await router(usersearch || '/')
			if (route.secure) return error_before(403, 'Forbidden')
			// const {
			// 	search, secure, get, path, ext,
			// 	rest, query, restroot,
			// 	cont, root
			// } = route

			const visitor = new Visitor({
				cookie: request.headers.cookie || '', 
				referer: request.headers.referer || '',
				host: request.headers.host, 
				ip: request.headers['x-forwarded-for'] || request.socket.remoteAddress
			})
			//request.headers['x-forwarded-for']
			
			if (route.rest) {
				const reans = {
					ext: 'json', 
					status: 200, 
					nostore: false
				}
				
				const post = await getPost(request)

				const req = { ...route.get, ...post }
				try {
					const r = typeof(route.rest) == 'function' ? route.rest(route.query, req, visitor) : route.rest.req(route.query, req, visitor)
					Object.assign(reans, await r)
				} catch (e) {
					console.error(e)				
				}

				
				if (!reans?.data) return error_before(404, 'Empty answer')
				//if (!reans?.data) return error_before(500, 'Not a suitable answer')

				const headers = {}
				if (conf.types[reans.ext]) {
					headers['Content-Type'] = conf.types[reans.ext] + '; charset=utf-8'
				} else {
					console.log(route.path, 'Unregistered extension')
					return error_before(403, 'Wrong content type, ext not found')
				}
				headers['Cache-Control'] = reans.nostore ? 'no-store' : 'public, max-age=31536000'
				Object.assign(headers, reans.headers)
				
				const data = reans.data

				if (data instanceof ReadStream) {
					data.on('open', is => {
						response.writeHead(reans.status, headers)
						data.pipe(response)
					})
					return data.on('error', () => error_after(404, 'Not found'))
				} else if (data instanceof Duplex) {
					response.writeHead(reans.status, headers)
					data.pipe(response)
					return data.on('error', () => error_after(404, 'Not found'))
				} else {
					response.writeHead(reans.status, headers)
					if (reans.ext == 'json' || ( typeof(data) != 'string' && typeof(data) != 'number') ) {
						return response.end(JSON.stringify(data))
					} else {
						return response.end(data)
					}
				}
			}

			if (route.path[0] == '-') return error_before(404, 'Not found')

			if (route.cont) {
				//cookie: request.headers.cookie || '',
				//host: request.headers.host,

				const req = {
					gs: '',
					ut: Access.getUpdateTime(),
					st: Access.getAccessTime(),
					pv: false,
					nt: route.search
				}
				
				const reans = await rest.get('get-layers', req, visitor)
				let json = reans.data
				
				let status = json.status
				const headers = {...reans.headers}

				//if (!json) return error_before(500, 'layers have bad definition')
				//const headers = []
				let info
				
				if (json.redirect) {
					status = 301	
					headers['Location'] = json.redirect
					info = { nostore: true, html: '' }
					//return view.err('', 301)
				} else {
					//if (json.push?.length) response.setHeader('Link', json.push.join(','));
					if (json.push?.length && response.writeEarlyHints) {
						// response.writeEarlyHints({
						// 	'link': json.push
						// })
					}


					// if (!json.layers) return error_before(500, 'layers not defined')
					// if (!json.layers.length) return error_before(500, 'layers empty')
					const bread = new Bread(route.path, route.get, route.search, json.root) //root+path+get = search
					bread.status = status
					try {

						if (!json.layers?.length) throw { status:404 }
						info = await controller(json, visitor, bread) //client передаётся в rest у слоёв, чтобы у rest были cookie, host и ip
						status = Math.max(info.status, status)
						bread.status = status
					} catch (e) {
						status = e.status || 500
						//const bread = new Bread('error/' + e.status, {}, '/error/' + e.status, json.root) //root+path+get = search
						const root = json.root ? '/' + json.root + '/' : '/'

						req.nt = root + 'error'
						const reans = await rest.get('get-layers', req, visitor) //, visitor
						json = reans.data

						bread.status = status
						if (status != 404) console.log(e)
						try {
							info = await controller(json, visitor, bread)

						} catch(e) {
							return error_before(500, 'erorr in error controller')
						}
					}
					



				}
				response.writeHead(status, {
					'Content-Type': conf.types['html'] + '; charset=utf-8',
					'Cache-Control': info.nostore ? 'no-store' : 'public, max-age=31536000',
					...headers
				})
				return response.end(info.html)
			} else { //Это может быть новый проект без всего
				return error_before(404, 'layers.json not found')
			}
		});
		server.listen(PORT, IP)
		console.log(`Запущен на ${IP}:${PORT}`)
	}
}

const getLastStack = (e) => {
	if (!e.stack) return ''
	try {
		const msg = e.stack.split(' at ')[1].split('/').slice(-1).join('').slice(0,-5)
		return msg.trim()
	} catch (e) {
		return ''
	}
}
const errmsg = (layer, e, msg = '') => `
	${e.toString()}${console.log(msg, e) || ''}
	<div>${msg ? msg + ' ' : ''}</div>
	<div>${getLastStack(e)}</div>
	<div><code>${layer.ts}</code></div>
`

const interpolate = (val, data, env) => new Function('data', 'env', 'return `'+val+'`')(data, env)


const getHTML = async (layer, env, visitor) => {
	const res = {
		nostore: false, 
		status: 200, 
		html: ''
	}

	let data = layer.data
	if (layer.json) {
		const reans = await loadJSON(layer.json, visitor)
		data = reans.data
		res.nostore = res.nostore || reans.nostore
		res.status = Math.max(reans.status, res.status)
	}
	
	
	//Статика
	if (layer.html || layer.htmltpl) {

		if (layer.htmltpl) layer.html = interpolate(layer.htmltpl, data, env)


		const reans = await loadTEXT(layer.html, visitor)
		res.html = layer.html
		res.status = Math.max(reans.status, res.status)
		res.nostore = res.nostore || reans.nostore
		res.html = reans.data
		if (reans.status != 200) {
			//reans.status = 404 //rest статики может ответить bad request 400. С точки зрения статики может быть 404 или 200
			throw reans
		}
			
		return res
	} 

	//Динамика
	if (layer.tpltpl || layer.replacetpl || layer.tpl) {
		if (layer.replacetpl) {
			layer.tpl = interpolate(layer.replacetpl, data, env)
		}
		if (layer.tpltpl) {
			layer.tpl = interpolate(layer.tpltpl, data, env)
		}
		if (layer.tpl) {
			let tplobj = await import(layer.tpl).catch(e => {
				e.tpl = layer.tpl
				res.html = errmsg(layer, e) //Ошибка покажется вместо шаблона
				res.status = 500
				res.nostore = true
			})
			if (tplobj) {
				if (tplobj.default) tplobj = tplobj.default
				try {
					res.html = tplobj[layer.sub](data, env)
				} catch(e) {
					res.html = errmsg(layer, e) //Ошибка покажется вместо шаблона
					res.status = 500
				}
			}
		}
	}
	return res
}

const runLayers = async (layers, fn, parent) => {
	let promises = []
	for (const layer of layers) {
		const promise = fn(layer, parent)
		promises.push(promise)
		if (layer.onlyclient) continue //Дочерние слои игнорируем собирутся в браузере
		if (layer.layers?.length) promises.push(runLayers(layer.layers, fn, layer))
	}
	return Promise.all(promises)
}
const controller = async ({ vt, st, ut, layers, theme }, visitor, bread) => {
	const ans = {
		html: '',
		status: 200,
		nostore: false
	}
	const timings = {view_time:vt, access_time:st, update_time:ut}
	const host = visitor.client.host
	const look = {bread, timings, theme, host} //???head - этим отличается look в interpolate в get-layers head нет
	const doc = new Doc()
	//console.log(layers[0].layers[0])
	await runLayers(layers, async layer => {

		const env = { layer, ...look }
		env.crumb = look.bread.getCrumb(layer.depth)

		env.sid = 'sid-' + (layer.div || layer.name) + '-' + layer.sub + '-'
		env.scope = layer.div ? '#' + layer.div : 'html'

		if (layer.onlyclient) {
			const { ROOT } = await import('/-controller/onlyclient.html.js')
			const html = ROOT(layer, env)
			doc.insert(html, layer.div)
		} else {
			const { nostore, html, status } = await getHTML(layer, env, visitor)
			ans.nostore = Math.max(ans.nostore, nostore)
			ans.status = Math.max(ans.status, status)
			doc.insert(html, layer.div, layer.layers?.length)
		}	
	})
	
	try {
		ans.html = doc.get()
	} catch (e) {
		ans.html = 'doc ' + e.toString() + ' ' + doc.counter
		ans.status = 500
	}
	return ans
}

export default Server