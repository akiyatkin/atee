import nxlsx from 'node-xlsx';
import fs from 'fs/promises'
import nicked from '/-nicked/nicked.js'
import cproc from '/-cproc'
const readJSON = async src => JSON.parse(await readFile(src))

const dir = 'cache/xlsx/'
if (!await fs.access(dir).then(e => true).catch(e => false)) fs.mkdir(dir, { recursive: true })

export const xlsx = {
	cache: (visitor, src) => visitor.relate(xlsx).once(src, () => cproc(xlsx, src, async () => {
		const cachename = nicked(src)
		const cachesrc = dir + cachename + '.json'
		const { mtime: mtimesrc } = await fs.stat(src).catch(e => false)
		if (!mtimesrc) return false
		const { mtime: mtimecache } = await fs.stat(cachesrc).catch(e => false)
		if (mtimesrc && mtimesrc <= mtimecache) return cachesrc
		console.log('parse', src)
		const sheets = nxlsx.parse(src)
		await fs.writeFile(cachesrc, JSON.stringify(sheets))
		return cachesrc
	})),
	read: async (visitor, src) => {
		const cachesrc = await xlsx.cache(visitor, src)
		const ans = await readJSON(cachesrc, visitor)
		return cachesrc ? ans.data : false
	}
}
export default xlsx