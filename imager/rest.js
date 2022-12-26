import nicked from "/-nicked"
import Rest from "/-rest"
import funcs from "/-rest/funcs.js"
import Access from '/-controller/Access.js'
import fs from 'fs/promises'
import { ReadStream, createReadStream, createWriteStream } from 'fs'
import { createRequire } from "module"
const require = createRequire(import.meta.url)
const sharp = require('sharp')

await fs.mkdir('cache/imager/', { recursive: true }).catch(e => null)

const rest = new Rest(funcs)

rest.addArgument('src', (view, src) => {
	if (/^https?:\/\//i.test(src)) {
		return view.end({status:404})
	}
	if (!!~src.indexOf('/.') || src[0] == '.' || src[0] == '/') {
		return view.end({status:404})
	}
	return src
})
rest.addArgument('w',['int'])
rest.addArgument('cache', ['isset'])
rest.addArgument('h',['int'])

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
rest.addResponse('webp', async view => {
	const { src, h, w, fit, cache } = await view.gets(['src','h','w','fit','cache'])
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