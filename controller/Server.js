import { router, readTextStream, loadJSON, loadTEXT } from './router.js'
import http from 'http'
import fs from 'fs/promises'
import { ReadStream } from 'fs'
import { pipeline } from 'stream/promises'
import { Duplex } from 'stream'
import Access from '/-controller/Access.js'
import meta from './rest.js'
import Bread from './Bread.js'
import Doc from './Doc.js'
//import Theme from './Theme.js'
import getPost from './getPost.js'
import config from '/-config'
import Visitor from './Visitor.js'

const conf = await config('controller')

export const Server = {
	follow: (PORT = 8888, IP = "127.0.0.1") => {
		const server = http.createServer()
		server.on('request', async (request, response) => {
			const error = (code, status) => {
				response.writeHead(code, status)
				return response.end()
			}
			if (!~['GET','POST'].indexOf(request.method)) {
				return error(501, 'Method not implemented')
			}
			const usersearch = request.url.replace(/\/+/,'/').replace(/\/$/,'')//Дубли и слешей не ломают путь, но это плохо...
			const route = await router(usersearch || '/')
			if (route.secure) return error(403, 'Forbidden')
			// const {
			// 	search, secure, get, path, ext,
			// 	rest, query, restroot,
			// 	cont, root
			// } = route
			const visitor = new Visitor(request)
			//request.headers['x-forwarded-for']
			if (route.rest) {
				const reans = {
					ext: 'json', 
					status: 200, 
					nostore: false
				}
				const req = { ...route.get, ...(await getPost(request) || {}) }
				try {
					const r = typeof(route.rest) == 'function' ? route.rest(route.query, req, visitor) : route.rest.get(route.query, req, visitor)
					Object.assign(reans, await r)
				} catch (e) {
					console.error(e)					
				}
				
				if (!reans?.ans) return error(404, 'Not a suitable answer')

				const headers = {}
				if (conf.types[reans.ext]) headers['Content-Type'] = conf.types[reans.ext] + '; charset=utf-8'
				else return error(501, 'Wrong content type, ext not found')
				headers['Cache-Control'] = reans.nostore ? 'no-store' : 'public, max-age=31536000'
				Object.assign(headers, reans.headers)
				
				const ans = reans.ans
				if (ans instanceof ReadStream) {
					ans.on('open', is => {
						response.writeHead(reans.status, headers)
						ans.pipe(response)
					});
					return ans.on('error', () => error(404, 'Not found'))
				} else if (ans instanceof Duplex) {
					response.writeHead(reans.status, headers)
					ans.pipe(response)
					return ans.on('error', () => error(404, 'Not found'))
				} else {
					response.writeHead(reans.status, headers)
					if (reans.ext == 'json' || ( typeof(ans) != 'string' && typeof(ans) != 'number') ) {
						return response.end(JSON.stringify(ans))
					} else {
						return response.end(ans)
					}
				}
			}

			if (route.path[0] == '-') return error(404, 'Not found')

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
				const a = await meta.get('get-layers', req, visitor)
				let json = a.ans
				let status = a.status
			
				if (!json) return error(500, 'layers have bad definition')
                if (!json.layers) return error(500, 'layers not defined')

                const bread = new Bread(route.path, route.get, route.search, json.root) //root+path+get = search
                
                let info
                try {
				    info = await controller(json, visitor, bread) //client передаётся в rest у слоёв, чтобы у rest были cookie, host и ip
                    status = Math.max(info.status, status)
                } catch (e) {
                	console.error(bread.path, e)
                	status = e.status || 500
                	const root = bread.root ? '/' + bread.root + '/' : '/'
                    req.nt = root + status
                    const a = await meta.get('get-layers', req, visitor)
                    json = a.ans
                    info = await controller(json, visitor, bread)
                }
				if (json.push.length) response.setHeader('Link', json.push.join(','));
				response.writeHead(status, {
					'Content-Type': conf.types['html'] + '; charset=utf-8',
					'Cache-Control': info.nostore ? 'no-store' : 'public, max-age=31536000',
					...json.headers
				})
				return response.end(info.html)
			} else { //Это может быть новый проект без всего
				return error(404, 'layers.json not found')
			}
		});
		server.listen(PORT, IP)
		console.log(`Запущен на ${IP}:${PORT}`)
	}
}

const errmsg = (layer, e, msg = '') => `
	<pre>${msg}<code>${layer.ts}<br>${e.toString()}${console.log(e) || ''}</code></pre>
`

const interpolate = (val, data, env) => new Function('data', 'env', 'return `'+val+'`')(data, env)
const getHTML = async (layer, look, visitor) => {
	const env = { layer, ...look }
	env.crumb = look.bread.getCrumb(layer.depth)
	env.sid = 'sid-' + (layer.div || layer.name) + '-' + layer.sub + '-'
	env.scope = layer.div ? '#' + layer.div : 'html'
	let nostore = false
    let status = 200
	let data
	let html = ''

	if (layer.json) {
		//const ans = await loadJSON(layer.json, visitor)
		const reans = await loadJSON(layer.json, visitor).catch(res => {
			console.log('getHTML loadJSON')
			throw res
		})
		data = reans.ans
		nostore = nostore || reans.nostore
	}

	
	if (layer.replacetpl) layer.tpl = interpolate(layer.replacetpl, data, env)
	if (layer.htmltpl) layer.html = interpolate(layer.htmltpl, data, env)
	if (layer.html) {
		const reans = await loadTEXT(layer.html, visitor).catch(e => { 
			status = 500
			throw {status, data: errmsg(layer, e), nostore: true, from: 'Server.getHTML'} 
		})
		if (reans.status == 404) throw reans //Выкидываем на стандартную страницу 404

		status = Math.max(reans.status, status)
		html = typeof(reans.ans) == 'string' ? reans.ans : ''
		nostore = nostore || reans.nostore
	} else if (layer.tpl) {
		let tplobj = await import(layer.tpl).catch(e => {
    		e.tpl = layer.tpl
    		throw e
    	})
    	if (tplobj.default) tplobj = tplobj.default
        try {
            html = tplobj[layer.sub](data, env)
        } catch(e) {
            html = errmsg(layer, e)
            status = 500
        }
	}
	return { status, nostore, html }	
}

const runLayers = async (layers, fn, parent) => {
	let promises = []
	for (const layer of layers) {
		promises.push(fn(layer, parent))
		if (layer.layers?.length) promises.push(runLayers(layer.layers, fn, layer))
	}
	return Promise.all(promises)
}
export const controller = async ({ vt, st, ut, layers, head, theme }, visitor, bread) => {
	const ans = {
		html: '',
        status: 200,
		nostore: false
	}
	const timings = {view_time:vt, access_time:st, update_time:ut}
	const host = visitor.client.host
	const look = {head, bread, timings, theme, host} //head - этим отличается look в interpolate в get-layers head нет
	const doc = new Doc()
	await runLayers(layers, async layer => {
		const { nostore, html, status } = await getHTML(layer, look, visitor)
		ans.nostore = Math.max(ans.nostore, nostore)
        ans.status = Math.max(ans.status, status)
		doc.insert(html, layer.div, layer.layers?.length)
	})
	try {
		ans.html = doc.get()
	} catch (e) {
		ans.html = e.toString()
		ans.status = 500
	}
	return ans
}
