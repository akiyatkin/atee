import nicked from "/-nicked"
import Rest from "/-rest"
import http from "http"
import https from "https"
import config from "/-config"
import Access from '/-controller/Access.js'
import fs from 'fs/promises'
import { ReadStream, createReadStream, createWriteStream } from 'fs'
import { createRequire } from "module"
const require = createRequire(import.meta.url)
const sharp = require('sharp')
const conf = await config('imager')
await fs.mkdir('cache/imager/', { recursive: true }).catch(e => null)
import rest_admin from '/-controller/rest.admin.js'
import rest_funcs from '/-rest/rest.funcs.js'
const rest = new Rest(rest_admin, rest_funcs)

const forbidden = (view, m) => {
	console.log(m, view.req.src, 'referer:', view.req.visitor.client.referer)
	return view.err(m, 403)
}
rest.addArgument('src', (view, src, prop) => {
	const remote = /^https?:\/\//i.test(src)
	src = src.replace(/^\/\-imager\/webp\?src=/,'')	
	if (/^\//.test(src)) {
		src = src.replace(/^\/+/,'')
		//return forbidden(view, 'Imager constraint worked for a src starting with a slash')
	}
	if (remote && !conf.constraint?.remote) {
		return forbidden(view, 'Imager constraint worked for remote src')
	}
	if (remote && conf.constraint?.hosts && !~conf.constraint.hosts.indexOf(new URL(src).hostname)) {
		return forbidden(view, 'Imager constraint worked for host in src')
	}
	if (!remote && !!~src.indexOf('/.') || src[0] == '.' || src[0] == '/') {
		return forbidden(view, 'Imager constraint worked for hidden src')
	}
	if (!remote && conf.constraint && !conf.constraint[prop].some(s => src.indexOf(s) === 0)) {
		return forbidden(view, 'Imager constraint worked for a start src')
	}
	return src
})
rest.addArgument('w',['int'], (view, v, prop) => {
	if (conf.constraint?.[prop] && !~conf.constraint[prop].indexOf(v)) {
		return forbidden(view, 'Imager constraint worked for ' + prop + '=' + v)
	}
	return v
})
rest.addArgument('h',['int'], (view, v, prop) => {
	if (conf.constraint?.[prop] && !~conf.constraint[prop].indexOf(v)) {
		return forbidden(view, 'Imager constraint worked for ' + prop + '=' + v)
	}
	return v
})
rest.addArgument('cache', ['isset'])


rest.addArgument('fit', ['string'], (view, fit) => {
	if (~['cover','contain','outside','fill','inside'].indexOf(fit)) return fit
	//return 'contain'
	return 'inside'	
})

const STAT = {h:{},w:{}, hosts: {}}
const AccessCache = Access.relate(STAT)
rest.addResponse('get-stat', async view => {
	const { admin } = await view.gets(['admin'])
	const w = Object.keys(STAT.w).map(v => Number(v))
	const h = Object.keys(STAT.h).map(v => Number(v))
	const hosts = Object.keys(STAT.hosts)
	view.ans.stat = {w, h, hosts}
	return view.ret()
})
rest.addResponse('get-size', async view => {
	const { src } = await view.gets(['src'])
	const {width, height} = await AccessCache.konce('get-size', src, async () => {
		const {width, height} = await sharp(src).metadata().catch(e => false)
		return {width, height}
	})
	if (!width) return view.err()
	view.ans.w = width
	view.ans.h = height
	return view.ret()
})
rest.addResponse('webp', async view => {
	const ext = 'webp'
	const { src, h, w, fit, cache } = await view.gets(['src','h','w','fit','cache'])

	const file = (i => ~i ? src.slice(i + 1) : src)(src.lastIndexOf('/'))
	const name = (i => ~i ? file.slice(0, i) : file)(file.lastIndexOf('.'))
	const headers = {
		'Content-Disposition': `filename=${encodeURIComponent(name)}.webp`,
	}
	
	STAT.h[h] = true
	STAT.w[w] = true
	const remote = /^https?:\/\//i.test(src)
	const hostname = remote ? new URL(src).hostname : ''
	if (remote) STAT.hosts[hostname] = true
	
	let store
	const iscache = cache||conf.constraint?.alwayscache
	
	if (iscache) {
		const name = nicked([src,h,w,fit].join('-')).slice(-127)
		store = `cache/imager/${name}.webp`
		const is = await AccessCache.once('isFreshCache' + store, async () => {
			const cstat = await fs.lstat(store).catch(e => null)
			if (!cstat) return false
			if (remote) return true //для remote кэш всегда свежий. Чтобы сбросить нужно вручную удалить папку cache
			const ostat = await fs.stat(src).catch(e => null)
			return cstat.mtime > ostat.mtime
		})
		if (is) return {ext, ans:createReadStream(store), headers}
	}

	let inStream
	if (remote) {
		const provider = /^https:\/\//i.test(src) ? https : http
		inStream = await new Promise((resolve, reject) => provider.get(src, resolve))
	} else {
		inStream = createReadStream(src)
	}

	const withoutEnlargement = (w && h && fit == 'contain') ? false : true
	const transform = sharp().resize({ 
		width: w || null, 
		height: h || null,
		fit: sharp.fit[fit],
		position: 'centre',
		withoutReduction: false,
		withoutEnlargement: withoutEnlargement, //Пропорции недолжны меняться размеров оригинала не зватает
		background: { r: 255, g: 255, b: 255, alpha: 0 }
	}).webp({
		quality: 80,
		lossless: false
	})
	const duplex = inStream.pipe(transform)
	inStream.on('error', e => duplex.destroy(e))
	if (!iscache) 
		return {ext, ans:duplex, headers};

	(() => {
		const chunks = []
		duplex.on('data', chunk => {
			chunks.push(chunk)
		})
		duplex.on('error', chunk => {
			console.log('Imager stream error', src, view.visitor.client.referer)
		})
		duplex.on('end', async chunk => {
			const ws = createWriteStream(store)
			await ws.write(Buffer.concat(chunks))
			ws.close()
			AccessCache.set('isFreshCache' + store, true)
		})
	})()
	return {ext, ans:duplex, headers}
})

export default rest