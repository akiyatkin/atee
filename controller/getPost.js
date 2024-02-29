import Theme from '/-controller/Theme.js'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

import config from "/-config"

import { createRequire } from "module"
const require = createRequire(import.meta.url)
const busboy = require('busboy')

const timer = Math.round(Date.now() / 1000)
let count = 0

const getExt = (str) => {
    const i = str.lastIndexOf('.')
    return ~i ? str.slice(i + 1) : ''
}


export const getPost = (request) => {
	if (request.method != 'POST') return {}
	return new Promise(async (resolve, reject) => {
		const r = request.headers['content-type'].split(';')
		if (r[0] === 'multipart/form-data') {
			const conf = await config('controller')
			const formData = {}
			const bb = busboy({ 
				headers: request.headers,
				limits : conf.busboy.limits
			})
			bb.on('file', (name, file, info) => {
				if (!info.filename) return file.resume()

				formData[name] = info
				info.ext = getExt(info.filename)
				info.result = false
				if (!~conf.busboy.types.indexOf(info.mimeType)){
					file.resume()
					info.msg = 'getPost ERROR: Invalid file format ' + info.mimeType
					console.log(info.msg)
					return
				}
				
				if (!conf.types[info.ext]) {
					file.resume()
					info.msg = 'getPost ERROR: Invalid file extension ' + info.ext
					console.log(info.msg)
					return
				}

				const tempsrc = path.join(os.tmpdir(), `busboy-upload-${timer}-${++count}.${info.ext}`)
				file.pipe(fs.createWriteStream(tempsrc))
				info.src = tempsrc
				info.result = true
				
				file.on('limit', () => {
					info.msg = 'getPost ERROR: Invalid file size or reached other limit. File truncated.'
					console.log(info.msg, name, info)
					info.result = false
					delete info.src
				})
			})
			bb.on('field', (name, val, info) => {
				formData[name] = val
			})
			bb.on('close', () => {
				//response.writeHead(200, { 'Connection': 'close' })
				//response.end()
				resolve(formData)
			})
			request.pipe(bb)
			//console.log('getPost ERROR multipart/form-data')
			
		} else if (r[0] === 'application/x-www-form-urlencoded') {
			let requestBody = ''
			request.on('data', data => {
				requestBody += data
				if (requestBody.length < 1e7) return
				console.log('getPost ERROR: Request Entity Too Large')
				requestBody = ''
				request.end()
				//resolve({})
			})
			request.on('end', () => {
				const formData = Theme.parse(requestBody, '&')
				resolve(formData)
			})
		} else {
			console.log('getPost ERROR: ' + request.headers['content-type'])
			resolve({})
		}
	})
}
export default getPost