import mammoth from 'mammoth';
import fs from 'fs/promises'
import nicked from '/-nicked/nicked.js'
import cproc from '/-cproc'


const dir = 'cache/docx/'
await fs.mkdir(dir, { recursive: true }).catch(e => null)

export const docx = {
	cache: (cache, src) => cache.relate(docx).once(src, () => cproc(docx, src, async () => {
		const cachename = nicked(src)
		const cachesrc = dir + cachename + '.html'
		const { mtime: mtimesrc } = await fs.stat(src).catch(e => false)
		if (!mtimesrc) return false
		const { mtime: mtimecache } = await fs.stat(cachesrc).catch(e => false)
		if (mtimesrc <= mtimecache) return cachesrc
		console.log('parse', src)
		const res = await mammoth.convertToHtml({path: src})
		const text = res.value
		console.log(res.messages)
		await fs.writeFile(cachesrc, text)

		return cachesrc
	})),
	read: async (cache, src) => {
		const cachesrc = await docx.cache(cache, src)
		if (!cachesrc) return false
		const text = await fs.readFile(cachesrc, 'utf8')
		return text
	}
}
export default docx