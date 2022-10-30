import { nicked } from "/-nicked/nicked.js"
import { Meta } from "/-controller/Meta.js"
import { Access } from '/-controller/Access.js'
import fs from 'fs/promises'
import { ReadStream, createReadStream, createWriteStream } from 'fs'
import { pipeline, Duplex, Readable } from 'stream'
import https from 'https'

import { createRequire } from "module"
const require = createRequire(import.meta.url)
const sharp = require('sharp')


const mkdir = async (dir) => {
	if (await fs.access(dir).then(e => true).catch(e => false)) return
	await fs.mkdir(dir, { recursive: true })
}
await mkdir('cache/imager/')

export const meta = new Meta()
meta.addFunction('string', (view, n) => n || '')
meta.addFunction('int', (view, n) => Number(n) || 0)
meta.addFunction('isset', (view, v) => v !== null)
meta.addArgument('src', (view, src) => {
	if (/^https?:\/\//i.test(src)) {
		view.ans.status = 404
		return view.end()
	}
	if (!!~src.indexOf('/.') || src[0] == '.' || src[0] == '/') {
		view.ans.status = 404
		return view.end()
	}
	
	return src
})
meta.addArgument('w',['int'])
meta.addArgument('cache', ['isset'])
meta.addArgument('h',['int'])
//meta.addArgument('type',['string'])
// meta.addArgument('ext', ['string'], (view, ext) => {
// 	if (!ext) {
// 		const { src } = await view.gets(['src'])
// 		const i = src.lastIndexOf('.')
// 		if (!~i) return view.err('Некорректное расширение файла')
// 		ext = src.slice(i + 1).toLowerCase()
// 	}
// 	return ext
// })
meta.addArgument('fit', ['string'], (view, fit) => {
	if (~['cover','contain','outside','fill','inside'].indexOf(fit)) return fit
	return 'inside'
	return 'contain'
	return 'cover'
})
const isFreshCache = Access.cache(async (src, store) => {
	const cstat = await fs.lstat(store).catch(e => null)
	if (!cstat) return false
	const ostat = await fs.stat(src).catch(e => null)
	return cstat.mtime > ostat.mtime
})
meta.addAction('webp', async view => {
	const { src, h, w, fit, cache } = await view.gets(['src','h','w','fit','cache'])
	let store
	if (cache) {
		store = `cache/imager/${nicked([src,h,w,fit].join('-'))}.webp`
		if (await isFreshCache(src, store)) return createReadStream(store)
	}
	const inStream = createReadStream(src)	
	const transform = sharp().resize({ 
		width: w || null, 
		height: h || null,
		fit: sharp.fit[fit],
		position: 'centre',
		withoutEnlargement: true, //Пропорции недолжны меняться размеров оригинала не зватает
		background: { r: 255, g: 255, b: 255, alpha: 0 }
	}).webp({
		quality: 80,
		lossless: false
	})
	const duplex = inStream.pipe(transform)
	inStream.on('error', e => duplex.destroy(e))
	if (!cache) return duplex;
	(async () => {
		const chunks = []
		duplex.on('data', chunk => {
			chunks.push(chunk)
		})
		duplex.on('data', chunk => {
			createWriteStream(store).write(Buffer.concat(chunks))
		})
	})()
	return duplex
})


export const rest = async (query, get, visitor) => {
    let ans = await meta.get(query, { ...get, visitor } )
    let ext = 'json'
    let status = 200
    if (ans instanceof ReadStream) {
    	ext = query
    } else if (ans instanceof Duplex) {
    	ext = query
    } else {
    	status = ans.status || status
    	ans = ''
    	
    }
    return { ans, ext, status, nostore: false }
}