import { nicked } from "/-nicked/nicked.js"
import { Meta } from "/-controller/Meta.js"
import fs from 'fs'
import { ReadStream } from 'fs'
import { pipeline, Duplex, Readable } from 'stream'
import https from 'https'

import { createRequire } from "module"
const require = createRequire(import.meta.url)
const sharp = require('sharp')


export const meta = new Meta()
meta.addFunction('string', (view, n) => n || '')
meta.addFunction('int', (view, n) => Number(n) || 0)
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
	if (~['cover','contain','outside','fill'].indexOf(fit)) return fit
	return 'contain'
})
meta.addAction('webp', async view => {
	const { src, h, w, fit } = await view.gets(['src','h','w','fit'])
	view.ans.src = src
	// let inStream
	// if (/^https?:\/\//i.test(src)) {
	// 	inStream = await fetch(src).then((response) => response.body)
		
	// 	//inStream = new ReadStream(inStream)
	// 	inStream = new Readable().wrap(inStream);
	// 	console.log(inStream)
	// } else {
	// 	inStream = fs.createReadStream(src)	
	// }
	let inStream = fs.createReadStream(src)	
	
	const transform = sharp().resize({ 
		width: w || null, 
		height: h || null,
		fit: sharp.fit[fit],
		position: 'centre',
		withoutEnlargement: true,
		background: { r: 255, g: 255, b: 255, alpha: 0 }
	}).webp({
		quality: 80,
		lossless: false
	}) //{ lossless: true }
	//const duplex = pipeline(inStream, pipeline)
	//const duplex = inStream.pipeThrough(transform)
	const duplex = inStream.pipe(transform)
	//const duplex = transform.pipe(inStream)
	inStream.on('error', (e) => {
		duplex.destroy(e)
	})
	return duplex
})


export const rest = async (query, get, visitor) => {
    let ans = await meta.get(query, { ...get, visitor } )

    let ext = 'json'
    let status = 200
    if (ans instanceof ReadStream) ext = query
    else if (ans instanceof Duplex) ext = query
    else {
    	ans = ''
    	status = ans.status || status
    }
    return { ans, ext, status, nostore: false }
}