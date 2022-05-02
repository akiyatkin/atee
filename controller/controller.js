import { router } from './router.js'
import { ReadStream } from 'fs'
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
const getHTML = async (layer, seo, client) => {
	const { tpl, json, sub, div } = layer
	let html = ''
	let status = 200
	let nostore = false

	let data
	if (json) {
		let res = { ans: '', ext: 'json', status: 200, nostore: false, headers: { } }
		const {
			search, secure, get,
			rest, query, restroot
		} = await router(json)

		if (rest) res = {...res, ...(await rest(query, get, client))}
		else res.status = 500 //Если нет rest это 500 ошибка

		status = Math.max(status, res.status) //404 может быть только тут
		nostore = Math.max(nostore, res.nostore)

		data = res.ans

		if (res.ans instanceof ReadStream) {
			data = await readStream(ans)
		}
	}
	try {
		const objtpl = await import(tpl)
		const html = objtpl[sub](data, layer, seo)
		return { status, nostore, html }
	} catch (e) { //Если нет шаблона это 500 ошибка
		console.error(e)
		return { status: 500, nostore: true, html: ''}
	}

}
export const controller = async ({ layers, seo }, client) => {
	const ans = {
		html: '', 
		status: 200, 
		nostore: false
	}
	if (!layers.length) ans.status = 404

	const doc = new Doc()
	for (const layer of layers) {
		const { nostore, html, status } = await getHTML(layer, seo, client)
		ans.status = Math.max(ans.status, status)
		doc.insert(html, layer.div)
		ans.nostore = ans.nostore || nostore
	}
	ans.html = doc.get()
	return ans
}
class Doc {
	exp = /(<\w+.*?id=['"])((\w+?)['"].*?>)(.*?)</si
	divs = {'':[]}
	insert (html, div = '') {
		const r = html.split(this.exp)
		const ar = []
		if (!this.divs[div]) return
		for (let i = 0; i < r.length; i = i + 5) {
			const div = r[i + 3]
			const start = i ? '<' + r[i] : r[i]
			if (div) {
				this.divs[div] = []
				const empty = r[i + 4]
				ar.push(start + r[i + 1] + r[i + 2])
				ar.push({div, empty})
			} else {
				if (start) ar.push(start)
			}
		}
		this.divs[div] = ar
	}
	get (div = '', empty = '') {
		if (!this.divs[div].length) return empty
		let html = ''
		this.divs[div].forEach((el) => {
			if (typeof(el) == 'string') html += el
			else html += this.get(el.div, el.empty)
		})
		return html
	}
}