import nicked from "/-nicked"
import Rest from "/-rest"
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
import rest_funcs from '/-rest/funcs.js'
const rest = new Rest(rest_admin, rest_funcs)

rest.addArgument('src', (view, src, prop) => {
	if (/^https?:\/\//i.test(src)) {
		return view.end({status:404})
	}
	if (!!~src.indexOf('/.') || src[0] == '.' || src[0] == '/') {
		return view.end({status:404})
	}
	if (!conf.constraint || conf.constraint[prop].some(s => src.indexOf(s) === 0)) return src //Адрес начинается с разрешённого начала
	const m = 'Imager constraint worked for '+prop
	console.log(m, view.req.src, 'referer:', view.req.visitor.client.referer)
	return view.err(m, 403)
})
rest.addArgument('w',['int'], (view, v, prop) => {
	if (!conf.constraint || ~conf.constraint[prop].indexOf(v)) return v
	const m = 'Imager constraint worked for '+prop+'='+v
	console.log(m, view.req.src, 'referer:', view.req.visitor.client.referer)
	return view.err(m, 403)
})
rest.addArgument('h',['int'], (view, v, prop) => {
	if (!conf.constraint || ~conf.constraint[prop].indexOf(v)) return v
	const m = 'Imager constraint worked for '+prop+'='+ v
	console.log(m, view.req.src, 'referer:', view.req.visitor.client.referer)
	return view.err(m, 403)
})
rest.addArgument('cache', ['isset'])


rest.addArgument('fit', ['string'], (view, fit) => {
	if (~['cover','contain','outside','fill','inside'].indexOf(fit)) return fit
	//return 'contain'
	return 'inside'	
})
const isFreshCache = Access.cache(async (src, store) => {
	const cstat = await fs.lstat(store).catch(e => null)
	if (!cstat) return false
	const ostat = await fs.stat(src).catch(e => null)
	return cstat.mtime > ostat.mtime
})
const STAT = {h:{},w:{}}
rest.addResponse('get-stat', async view => {
	const { admin } = await view.gets(['admin'])
	const w = Object.keys(STAT.w).map(v => Number(v))
	const h = Object.keys(STAT.h).map(v => Number(v))
	view.ans.stat = {w, h}
	return view.ret()
})
rest.addResponse('webp', async view => {
	const { src, h, w, fit, cache } = await view.gets(['src','h','w','fit','cache'])
	STAT.h[h] = true
	STAT.w[w] = true

	const ext = 'webp'
	let store
	if (cache) {
		store = `cache/imager/${nicked([src,h,w,fit].join('-'))}.webp`
		if (await isFreshCache(src, store)) return {ext, ans:createReadStream(store)}
	}
	const inStream = createReadStream(src)

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
	if (!cache) return {ext, ans:duplex};
	(async () => {
		const chunks = []
		duplex.on('data', chunk => {
			chunks.push(chunk)
		})
		duplex.on('data', chunk => {
			createWriteStream(store).write(Buffer.concat(chunks))
		})
	})()
	return {ext, ans:duplex}
})

export default rest