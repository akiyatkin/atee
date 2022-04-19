import { router } from './router.js'

//import http2 from 'http2'
import http from 'http'
import fs from 'fs/promises'
import { join } from 'path'
import { ReadStream } from 'fs'

import { meta } from './rest.js'

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

	server.on('request', async (req, response) => {
        if (!~['GET','POST'].indexOf(req.method)) {
            response.writeHead(501, {
                'content-type': TYPES['txt'] + '; charset=utf-8'
            });
            return response.end('Method not implemented')
        }
        const {
            secure, get,
            rest, query,
            cont, root, crumbs
        } = await router('./public/', req.url, req)
        console.log(req.url)
        if (secure) {
            response.writeHead(403, {
                'сontent-type': TYPES['txt'] + '; charset=utf-8'
            });
			return stream.end('Forbidden')//'Forbidden'
		}

        if (rest) {
            const myrest = await rest(query, get)
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
                        response.writeHead(404, headers)
        		        response.end('Not found')
        		    })
                } else {
                    response.writeHead(status, headers)
                    if (ext === 'json'
                        || (typeof(ans) != 'string' && typeof(ans) != 'number')) {
                        return response.end(JSON.stringify(ans))
                    } else {
                        return response.end(ans)
                    }
                }
            }
        }
        if (cont) {
            const { layers } = await meta.get('layers', {prev:1,next:1})
            const { tpl, json } = layers
            //Контроллер root, crumbs, get
            const ar = []
            ar.push('</images/logo.svg>; rel=preload; as=image; type=image/svg+xml')
            response.setHeader('Link', ar.join(','));
            response.writeHead(200, {
                'content-type': TYPES['html'] + '; charset=utf-8',
                'cache-control': 'public, max-age=31536000, immutable'
            })
            const { default: data }  = await import('../public/' + json, {assert: { type: 'json' }})
			const { root } = await import('../public/' + tpl)
			const html = root(data)
			return response.end(html)
        }
	});
	server.listen(PORT, IP)
    console.log(`Запущен на ${IP}:${PORT}`)
}
