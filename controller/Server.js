import { router, readTextStream, loadJSON, loadTEXT } from './router.js'
import http from 'http'
import fs from 'fs/promises'
import { ReadStream } from 'fs'
import { Access } from '@atee/controller/Access.js'
import { meta } from './rest.js'
import { Bread } from './Bread.js'

import { Doc } from './Doc.js'

import { parse } from './Spliter.js'
import { getPost } from './getPost.js'
import Visitor from './Visitor.js'

const TYPES = {
	txt: 'text/plain',
	json: 'application/json',
	js: 'application/javascript',
	woff2: 'font/woff2',
	webm: 'video/webm',
	xml: 'application/xml',
	html: 'text/html',
	css: 'text/css',
	ico: 'image/x-icon',
	jpg: 'image/jpeg',
	png: 'image/png',
	jpeg: 'image/jpeg',
	webp: 'image/webp',
	avif: 'image/avif',
	svg: 'image/svg+xml',
	pdf: 'application/pdf'
};

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
			const route = await router(request.url)
			if (route.secure) return error(403, 'Forbidden')

			const {
				search, secure, get, path, ext,
				rest, query, restroot,
				cont, root
			} = route
			const visitor = new Visitor(request)
			//request.headers['x-forwarded-for']
			if (route.rest) {

				const post = await getPost(request)
				const req = post ? { ...route.get, ...post } : route.get
				let res

				try {
					res = await rest(route.query, req, visitor)
				} catch (e) {
					console.error(e)
					res = false
				}

				if (!res?.ans) return error(404, 'There is no suitable answer')

				const { 
					ans = false, ext = 'json', status = 200, nostore = false, headers = { } 
				} = res
				headers['Content-Type'] ??= TYPES[ext] + '; charset=utf-8'
				headers['Cache-Control'] ??= nostore ? 'no-store' : 'public, max-age=31536000'
				if (ans instanceof ReadStream) {
					ans.on('open', is => {
						response.writeHead(status, headers)
						ans.pipe(response)
					});
					return ans.on('error', () => error(404, 'Not found'))
				} else {
					response.writeHead(status, headers)
					if (ext == 'json' || ( typeof(ans) != 'string' && typeof(ans) != 'number') ) {
						return response.end(JSON.stringify(ans))
					} else {
						return response.end(ans)
					}
				}
			}

			if (path[0] == '-') return error(404, 'Not found')

			if (route.cont) {
				//cookie: request.headers.cookie || '',
				//host: request.headers.host,
				const req = {
					...visitor.client,
					visitor,
					client: visitor.client,
					gs: '',
					ut: Access.getUpdateTime(),
					st: Access.getAccessTime(),
					pv: false,
					nt: search
				}
				let json = await meta.get('get-layers', req)
				if (!json) return error(500, 'layers have bad definition')
                if (!json.layers) return error(500, 'layers not defined')

                //console.log(route)
                const bread = new Bread(route.path, get, search, json.root) //root+path+get = search
                let status = json.status
                let info
                try {
				    info = await controller(json, visitor, bread) //client передаётся в rest у слоёв, чтобы у rest были cookie, host и ip
                    status = Math.max(info.status, status)
                } catch (e) {
                	console.error(e)
                	status = e.status || 500
                	const root = bread.root ? '/' + bread.root + '/' : '/'
                    req.nt = root + status
                    json = await meta.get('get-layers', req)
                    info = await controller(json, visitor, bread)
                }
				if (json.push.length) response.setHeader('Link', json.push.join(','));
				response.writeHead(status, {
					'Content-Type': TYPES['html'] + '; charset=utf-8',
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

const errmsg = (layer, e) => `
	<pre><code>${layer.ts}<br>${e.toString()}${console.log(e) || ''}</code></pre>
`
const getHTML = async (layer, { head, visitor, bread, timings, theme }) => {
	const crumb = bread.getCrumb(layer.depth)
	const { tpl, json, sub, div } = layer
	let nostore = false
    let status = 200
	let data
	
	let html = ''
	if (layer.html) {
		const ans = await loadTEXT(layer.html, visitor).catch(e => { 
			return {data: errmsg(layer, e), nostore: true} 
		})
		html = ans.data
		nostore = nostore || ans.nostore
	} else if (tpl) {
		if (json) {
			const ans = await loadJSON(json, visitor)
			data = ans.data
			nostore = nostore || ans.nostore
		}
		let tplobj = await import(tpl).catch(e => {
    		e.tpl = tpl
    		throw e
    	})
    	if (tplobj.default) tplobj = tplobj.default
        try {
        	const env = {
        		layer, 
        		crumb,
        		bread,
        		host: visitor.client.host, 
        		head, //только этим отличается от interpolate в get-layers
        		timings,
        		theme
        	}
        	//cookie: visitor.client.cookie, 
            html = tplobj[sub](data, env)
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
	const look = {head, visitor, bread, timings, theme}
	const doc = new Doc()
	await runLayers(layers, async layer => {
		
		const { nostore, html, status } = await getHTML(layer, look)
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
