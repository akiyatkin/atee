import { router } from './router.js'
import http from 'http'
import fs from 'fs/promises'
import { ReadStream } from 'fs'
import { meta } from './rest.js'

import { controller } from './controller.js'

import { parse, getPost } from './headers.js'

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
            if (!~['GET','POST'].indexOf(request.method)) {
                response.writeHead(501, 'Method not implemented', {
                    'content-type': TYPES['txt'] + '; charset=utf-8'
                });
                return response.end()
            }

            const {
                search, secure, get,
                rest, query, restroot,
                cont, root, crumbs
            } = await router(request.url)

            if (secure) {
                response.writeHead(403, 'Forbidden', {
                    'сontent-type': TYPES['txt'] + '; charset=utf-8'
                });
    			return stream.end()
    		}
            if (rest) {
                const post = await getPost(request)
                const req = post ? { ...get, ...post } : get
                const { ans = false, ext = 'json', status = 200, nostore = false, headers = { } } = await rest(query, req)
                if (!ans) {
                    response.writeHead(500, 'Internal Server Error')
                    return response.end()
                }
                headers['content-type'] ??= TYPES[ext] + '; charset=utf-8'
                headers['cache-control'] ??= nostore ? 'no-store' : 'public, max-age=31536000, immutable'
                if (ans instanceof ReadStream) {

                    ans.on('open', is => {
                        response.writeHead(status, headers)
        		        ans.pipe(response)
        		    });
        		    return ans.on('error', () => {
                        headers['content-type'] = TYPES['txt'] + '; charset=utf-8'
                        response.writeHead(404, 'Not found', headers)
        		        response.end()
        		    })
                } else {

                    response.writeHead(status, headers)
                    if (ext == 'json' || ( typeof(ans) != 'string' && typeof(ans) != 'number') ) {
                        return response.end(JSON.stringify(ans))
                    } else {
                        return response.end(ans)
                    }
                }
                //Если rest вернул false или restа нет переходим на контроллер?
            }
            if (request.headers.origin?.split('://')[1] == request.headers.host) { //Если это запрос из контроллера то 404
                response.writeHead(404)
                return response.end()
            }
            const error = (code, status) => {
                response.writeHead(code, status)
                return response.end()
            }

            if (cont) {
                const req = {
                    root: root,
                    globals: '',
                    cookie: request.headers.cookie || '',
                    host: request.headers.host,
                    update_time: 0,
                    access_time: 0,
                    prev: false,
                    next: search
                }
                let res = await meta.get('layers', req)
                if (res.layers) {
                    let info = await controller(res)
                    if (info.status == 404) {
                        req.next = '/404'
                        res = await meta.get('layers', req)
                        info = await controller(res)
                    }
                    if (info.status == 500) {
                        req.next = '/500'
                        res = await meta.get('layers', req)
                        info = await controller(res)
                    }
                    response.setHeader('Link', res.push.join(','));
                    response.writeHead(info.status, {
                        'content-type': TYPES['html'] + '; charset=utf-8',
                        'cache-control': info.nostore ? 'no-store' : 'public, max-age=31536000, immutable'
                    })
        			return response.end(info.html)
                } else if (!res) {
                    return error(500, 'layers have bad definition')
                } else {
                    return error(500, 'layers not defined')
                }
            } else { //Это может быть новый проект без всего
                return error(404, 'layers.json not found')
            }
    	});
    	server.listen(PORT, IP)
        console.log(`Запущен на ${IP}:${PORT}`)
    }
}
