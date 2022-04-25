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

export const server = (PORT, IP) => {

    const server = http.createServer()

	server.on('request', async (request, response) => {
        if (!~['GET','POST'].indexOf(request.method)) {
            response.writeHead(501, {
                'content-type': TYPES['txt'] + '; charset=utf-8'
            });
            return response.end('Method not implemented')
        }


        const search = request.url
        const {
            secure, get,
            rest, query,
            cont, root, crumbs
        } = await router(search)


        if (secure) {
            response.writeHead(403, {
                'сontent-type': TYPES['txt'] + '; charset=utf-8'
            });
			return stream.end('Forbidden')//'Forbidden'
		}
        const post = await getPost(request)
        const req = { ...get, ...post }
        if (rest) {
            const myrest = await rest(query, req)
            if (myrest) {
                const {ans, ext = 'json', status = 200, nostore = false, headers = { }} = myrest
                headers['content-type'] ??= TYPES[ext] + '; charset=utf-8'
                headers['cache-control'] ??= nostore ? 'no-store' : 'public, max-age=31536000, immutable'
                if (ans instanceof ReadStream) {
                    ans.on('open', is => {
                        response.writeHead(status, headers)
        		        ans.pipe(response)
        		    });
        		    return ans.on('error', () => {
                        headers['content-type'] = TYPES['txt'] + '; charset=utf-8'
                        response.writeHead(404, headers)
        		        response.end('Not found')
        		    })
                } else {
                    response.writeHead(status, headers)
                    if (ext == 'json' || ( typeof(ans) != 'string' && typeof(ans) != 'number') ) {
                        return response.end(JSON.stringify(ans))
                    } else {
                        return response.end(ans)
                    }
                }
            }
            //Если rest вернул false или restа нет переходим на контроллер?
        }
        if (request.headers.origin?.split('://')[1] == request.headers.host) { //Если это запрос из контроллера то 404
            response.writeHead(404)
            response.end()
        }
        if (cont) {

            const { layers } = await meta.get('layers', {
                cookie: request.headers.cookie || '',
                host: request.headers.host,
                prev: false,
                next: search
            })

            const { html = '', status = 404, nostore = false, ar = [] } = await controller(layers)
            response.setHeader('Link', ar.join(','));
            response.writeHead(status, {
                'content-type': TYPES['html'] + '; charset=utf-8',
                'cache-control': nostore ? 'no-store' : 'public, max-age=31536000, immutable'
            })
			return response.end(html)
        } else { //Это может быть новый проект без всего
            response.writeHead(404, 'layers.json not found')
            response.end()
        }
	});
	server.listen(PORT, IP)
    console.log(`Запущен на ${IP}:${PORT}`)
}
