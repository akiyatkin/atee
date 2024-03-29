import nxlsx from 'node-xlsx';
import fs from 'fs/promises'
import nicked from '/-nicked/nicked.js'
import cproc from '/-cproc'
const readJSON = async src => JSON.parse(await fs.readFile(src))


const dir = 'cache/xlsx/'
await fs.mkdir(dir, { recursive: true }).catch(e => null)

export const xlsx = {
	cache: (visitor, src) => visitor.relate(xlsx).once(src, () => cproc(xlsx, src, async () => {
		const cachename = nicked(src)
		const cachesrc = dir + cachename + '.json'
		const { mtime: mtimesrc } = await fs.stat(src).catch(e => false)
		if (!mtimesrc) return false
		const { mtime: mtimecache } = await fs.stat(cachesrc).catch(e => false)
		if (mtimesrc <= mtimecache) return cachesrc
		const t = Date.now()
		console.log('parse', src)
		const sheets = nxlsx.parse(src)
		for (const i in sheets) {
			sheets[i].name = sheets[i].name.trim()
			sheets[i].data = sheets[i].data.map(row => {
				return row.map(i => typeof(i) == 'string' ? i.trim() : String(i))
			})
			// sheets[i].data = sheets[i].data.filter(row => {
			// 	return !!row.join('')
			// })
		}
		console.log((Date.now() - t)+'ms')
		await fs.writeFile(cachesrc, JSON.stringify(sheets))
		return cachesrc
	})),
	read: async (visitor, src) => {
		const cachesrc = await xlsx.cache(visitor, src)
		if (!cachesrc) return false
		const ans = await readJSON(cachesrc)
		return ans
	}
}
export default xlsx