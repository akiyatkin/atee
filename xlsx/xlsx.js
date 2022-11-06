import nxlsx from 'node-xlsx';
import fs from 'fs/promises'
import nicked from '/-nicked/nicked.js'
import { loadJSON } from '/-controller/router.js'

const dir = 'cache/xlsx/'
if (!await fs.access(dir).then(e => true).catch(e => false)) fs.mkdir(dir, { recursive: true })

const proc = {}
export const xlsx = {
	cache: (visitor, src) => {
		return visitor.relate(proc).once(src, () => {
			proc[src] ??= new Promise(async resolve => {
				const cachename = nicked(src)
				const cachesrc = dir + cachename + '.json'

				const { mtime: mtimesrc } = await fs.stat(src).catch(e => false)
				if (!mtimesrc) return resolve(false)
				const { mtime: mtimecache } = await fs.stat(cachesrc).catch(e => false)
				if (mtimesrc && mtimesrc <= mtimecache) return resolve(cachesrc)
				
				console.log('parse', src)
				const sheets = nxlsx.parse(src)
				await fs.writeFile(cachesrc, JSON.stringify(sheets), 'utf8')

				return resolve(cachesrc)
			}).then(cachesrc => {

				delete proc[src]
				return cachesrc
			})
			return proc[src]
		})
	},
	read: async (visitor, src) => {
		const cachesrc = await xlsx.cache(visitor, src)
		const ans = await loadJSON('/' + cachesrc, visitor)
		return cachesrc ? ans.data : false
	}
}
export default xlsx