import xlsx from 'node-xlsx';
import fs from 'fs/promises'
import nicked from '/-nicked/nicked.js'
import { loadJSON } from '/-controller/router.js'

const mkdir = async (dir) => {
	if (await fs.access(dir).then(e => true).catch(e => false)) return
	await fs.mkdir(dir, { recursive: true })
}
await mkdir('data/auto/excel/')


const proc = {}
export default (visitor, src, re) => {
	return visitor.relate(proc).once(src, async () => {
		proc[src] ??= new Promise(async resolve => {
			const cachename = nicked(src)
			const cachesrc = 'data/auto/excel/' + cachename + '.json'
			const { mtime: mtimesrc } = await fs.stat(src).catch(e => false)
			if (!mtimesrc) return resolve(false)
			const { mtime: mtimecache } = await fs.stat(cachesrc)
			if (!re && mtimesrc && mtimesrc <= mtimecache) {
				return resolve(loadJSON('/'+cachesrc, visitor))
			}
			console.log('parse', src)
			const sheets = xlsx.parse(src)
			await fs.writeFile(cachesrc, JSON.stringify(sheets), 'utf8')
			return resolve(sheets)
		}).then(e => {
			delete proc[src]
			return e
		})
		return proc[src]
	})
}