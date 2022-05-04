import { router } from './router.js'
import http from 'http'
import fs from 'fs/promises'
import { ReadStream } from 'fs'
import { Access } from '@atee/controller/Access.js'
import { meta } from './rest.js'

import { Doc } from './Doc.js'

import { parse } from './pathparse.js'
import { getPost } from './getPost.js'

const TYPES = {
	txt: 'text/plain',
	json: 'application/json',
	js: 'application/javascript',
	woff2: 'font/woff2',
	webm: 'video/webm',
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
				ip:request.socket.localAddress 
			}
			if (route.rest) {
				const post = await getPost(request)
				const req = post ? { ...route.get, ...post } : route.get
				const res = await rest(route.query, req, client)
				
				if (!res?.ans) return error(404, 'There is no suitable answer')
				const { 
					ans = false, ext = 'json', status = 200, nostore = false, headers = { } 
				} = res
				headers['Content-Type'] ??= TYPES[ext] + '; charset=utf-8'
				headers['Cache-Control'] ??= nostore ? 'no-store' : 'public, max-age=31536000, immutable'
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
					globals: '',
					update_time: Access.getUpdateTime(),
					access_time: Access.getAccessTime(),
					prev: false,
					next: search
				}
                
				let res = await meta.get('layers', req)
				if (!res) return error(500, 'layers have bad definition')
                if (!res.layers) return error(500, 'layers not defined')
				
				const crumb = {
					path: route.path, 
					search: route.search
				}
                let status = res.status
                let info
                try {
				    info = await controller(res, client, crumb) //client передаётся в rest у слоёв, чтобы у rest были cookie, host и ip
                    status = Math.max(info.status, status)
                } catch (e) {
                    console.log(500,e)
                    req.next = '/500'
                    res = await meta.get('layers', req)
                    info = await controller(res, client, crumb)
                    status = 500
                }

				if (res.push.length) response.setHeader('Link', res.push.join(','));
				response.writeHead(status, {
					'Content-Type': TYPES['html'] + '; charset=utf-8',
					'Cache-Control': info.nostore ? 'no-store' : 'public, max-age=31536000, immutable'
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
const getHTML = async (layer, { seo, client, crumb }) => {
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
        if (!rest) throw 500
		res = {...res, ...(await rest(query, get, client))}
        if (res.status == 500) throw 500
	
		status = Math.max(status, res.status) //404 может быть только тут
		nostore = Math.max(nostore, res.nostore)

		data = res.ans

		if (res.ans instanceof ReadStream) {
			data = await readStream(ans)
		}
	}
	//try {
	const objtpl = await import(tpl)
	const html = objtpl[sub](data, {layer, crumb, seo, host: client.host, cookie: client.cookie})
	return { status, nostore, html }
	// } catch (e) { //Если нет шаблона это 500 ошибка
	// 	console.error(e)
	// 	return { status: 500, nostore: true, html: ''}
	// }

}

const runLayers = async (layers, fn, parent) => {
	let promises = []
	for (const layer of layers) {
		promises.push(fn(layer, parent))
		if (layer.layers.length) promises.push(runLayers(layer.layers, fn, layer))
	}
	return Promise.all(promises)
}
export const controller = async ({ layers, seo }, client, crumb) => {
	const ans = {
		html: '',
        status: 200,
		nostore: false
	}
	const look = {seo, client, crumb}
	const doc = new Doc()
	await runLayers(layers, async layer => {
		const { nostore, html, status } = await getHTML(layer, look)
		ans.nostore = Math.max(ans.nostore, nostore)
        ans.status = Math.max(ans.status, status)
		doc.insert(html, layer.div, layer.layers.length)
	})
	ans.html = doc.get()
	return ans
}
