import fs from 'fs/promises'
import nicked from '/-nicked/nicked.js'
import cproc from '/-cproc'
import config from '/-config'
import Access from '/-controller/Access.js'
import EasySheetsDef from 'easy-sheets'
import dabudi from '/-dabudi'
const EasySheets = EasySheetsDef.default

const dir = 'cache/drive/'
await fs.mkdir(dir, { recursive: true }).catch(e => null)

export const drive = {
	getTable: async (gid, range, sheet) => {
		const rows_source = await drive.getRows(gid, range, sheet)
		const {descr, rows_table} = dabudi.splitDescr(rows_source)
		const {heads, rows_body} = dabudi.splitHead(rows_table)

		const indexes = {}
		for (const i in heads.head_nicks) {
			indexes[heads.head_nicks[i]] = i
		}
		heads.indexes = indexes

		return {descr, heads, rows_body}
	},
	cacheRows: (gid, range, sheet = '') => Access.relate(drive).once(sheet + gid, () => cproc(drive, sheet + gid, async () => {
		const cachename = nicked(gid + '-' + range)
		const cachesrc = dir + cachename + '.json'
		const conf = await config('drive')

		const easySheets = new EasySheets(gid, btoa('{}'))
		easySheets.serviceAccountCreds = JSON.parse(await fs.readFile(conf.certificate, "utf8"))
		
		const rows = await easySheets.getRange(range, {sheet}).catch(e => {
			console.log('drive', gid, sheet, range, e.code)
			return []
		})
		await fs.writeFile(cachesrc, JSON.stringify(rows))
		return cachesrc
	})),
	getRows: async (gid, range, sheet) => {
		const cachesrc = await drive.cacheRows(gid, range, sheet)
		if (!cachesrc) return false
		const rows = JSON.parse(await fs.readFile(cachesrc, "utf8"))
		return rows
	}
}
export default drive