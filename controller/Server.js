import { router } from './router.js'
import http from 'http'
import fs from 'fs/promises'
import { ReadStream } from 'fs'
import { Access } from '@atee/controller/Access.js'
import { meta } from './rest.js'

import { Doc } from './Doc.js'

import { parse } from './Spliter.js'
import { getPost } from './getPost.js'

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
				cont, root, crumbs
			} = route
			const client = {
				cookie: request.headers.cookie, 
				host: request.headers.host, 
				ip:request.headers['x-forwarded-for'] || request.socket.remoteAddress
			}
			//request.headers['x-forwarded-for']
			if (route.rest) {

				const post = await getPost(request)
				const req = post ? { ...route.get, ...post } : route.get
				let res

				try {
					res = await rest(route.query, req, client)
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
					...client,
					client,
					gs: '',
					ut: Access.getUpdateTime(),
					st: Access.getAccessTime(),
					pv: false,
					nt: search
				}
				let res = await meta.get('get-layers', req)
				if (!res) return error(500, 'layers have bad definition')
                if (!res.layers) return error(500, 'layers not defined')
				
				const crumb = {
					crumbs: route.crumbs,
					get: route.get,
					root: route.root,
					path: route.path, 
					search: route.search
				}
                let status = res.status
                let info
                try {
				    info = await controller(res, client, crumb) //client ???????????????????? ?? rest ?? ??????????, ?????????? ?? rest ???????? cookie, host ?? ip
                    status = Math.max(info.status, status)
                } catch (e) {
                	console.error(e)
                	status = e.status || 500
                	const root = crumb.root ? '/' + crumb.root + '/' : '/'
                    req.nt = root + status
                    res = await meta.get('get-layers', req)
                    info = await controller(res, client, crumb)
                }
				if (res.push.length) response.setHeader('Link', res.push.join(','));
				response.writeHead(status, {
					'Content-Type': TYPES['html'] + '; charset=utf-8',
					'Cache-Control': info.nostore ? 'no-store' : 'public, max-age=31536000'
				})
				return response.end(info.html)
			} else { //?????? ?????????? ???????? ?????????? ???????????? ?????? ??????????
				return error(404, 'layers.json not found')
			}
		});
		server.listen(PORT, IP)
		console.log(`?????????????? ???? ${IP}:${PORT}`)
	}
}


const readStream = stream => {
	return new Promise((resolve, reject) => {
		let data = ''
		stream.on('readable', () => {
			const d = stream.read()
			if (d === null) return
			data += d
		})
		stream.on('error', reject)
		stream.on('end', () => {
			resolve(JSON.parse(data))
		})
	})
}
const getHTML = async (layer, { head, client, crumb, timings }) => {
	const { tpl, json, sub, div } = layer
	let nostore = false
    let status = 200
	let data
	if (json) {
		let res = { ans: '', ext: 'json', status: 200, nostore: false, headers: { } }
		const {
			search, secure, get,
			rest, query, restroot
		} = await router(json)
        if (!rest) throw { status: 500, json }
		res = {...res, ...(await rest(query, get, client))}
        if (res.status != 200) throw { status: res.status, json }
	
		status = Math.max(status, res.status) //404 ?????????? ???????? ???????????? ??????
		nostore = Math.max(nostore, res.nostore)

		data = res.ans

		if (res.ans instanceof ReadStream) {
			data = await readStream(ans)
		}
	}
	let html = ''
	if (tpl) {
		const objtpl = await import(tpl)
        try {
        	const env = {...layer, ...crumb, host: client.host, cookie: client.cookie, head, ...timings}
            html = objtpl[sub](data, env)
        } catch(e) {
            html = `<pre><code>${layer.ts}<br>${e.toString()}</code></pre>`
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
export const controller = async ({ vt, st, ut, layers, head }, client, crumb) => {
	const ans = {
		html: '',
        status: 200,
		nostore: false
	}
	const timings = {view_time:vt, access_time:st, update_time:ut}
	const look = {head, client, crumb, timings}
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
