import fs from 'fs/promises'
import nicked from '/-nicked/nicked.js'
import cproc from '/-cproc'
import config from '/-config'
import Access from '/-controller/Access.js'
import EasySheetsDef from 'easy-sheets'
import Dabudi from '/-dabudi'
const EasySheets = EasySheetsDef.default

const dir = 'cache/drive/'
await fs.mkdir(dir, { recursive: true }).catch(e => null)

export const drive = {
	cacheRows: (gid, range, sheet = '') => Access.relate(drive).once(sheet + gid, () => cproc(drive, sheet + gid, async () => {
		const cachename = nicked(gid + '-' + range + '-' + sheet)
		const cachesrc = dir + cachename + '.json'
		const conf = await config('drive')

		const cert = await fs.readFile(conf.certificate, "utf8").catch(r => false)
		if (!cert) {
			console.log('Неудалось считать сертификат ' + conf.certificate)
			return false
		}

		const easySheets = new EasySheets(gid, btoa('{}'))
		easySheets.serviceAccountCreds = JSON.parse(cert)
		
		const rows = await easySheets.getRange(range, {sheet}).catch(e => {
			console.log('drive', gid, sheet, range, e.code)
			return []
		})
		if (!rows) return false
		await fs.writeFile(cachesrc, JSON.stringify(rows))
		return cachesrc
	})),
	cacheLists: (gid) => Access.relate(drive).once(gid, () => cproc(drive, gid, async () => {
		const cachename = nicked(gid)
		const cachesrc = dir + cachename + '.json'
		const conf = await config('drive')

		

		
		const cert = await fs.readFile(conf.certificate, "utf8").catch(r => false)

		if (!cert) {
			console.log('Неудалось считать сертификат ' + conf.certificate)
			return false
		}

		const easySheets = new EasySheets(gid, btoa('{}'))
		easySheets.serviceAccountCreds = JSON.parse(cert)
		
		const gauth = await easySheets.authorize()
    	const gdata = await gauth.spreadsheets.get({ spreadsheetId: gid })
    	
    	const sheets = gdata.data.sheets.filter(sheet => !~sheet.properties.title.indexOf('.'))
		
		await fs.writeFile(cachesrc, JSON.stringify(sheets))
		return cachesrc
	})),
	getLists: async (gid) => {
		const cachesrc = await drive.cacheLists(gid)
		if (!cachesrc) return []
		const list = JSON.parse(await fs.readFile(cachesrc, "utf8"))
		return list
	}, 
	getRows: async (gid, range, sheet) => {
		const cachesrc = await drive.cacheRows(gid, range, sheet)
		if (!cachesrc) return false
		const rows = JSON.parse(await fs.readFile(cachesrc, "utf8"))
		return rows
	},
	getTable: async (gid, range, sheet) => {
		const rows_source = await drive.getRows(gid, range, sheet)
		if (!rows_source) return false
		const {descr, rows_table} = Dabudi.splitDescr(rows_source)
		const {head_titles, rows_body} = Dabudi.splitHead(rows_table)

		const indexes = {}
		for (const i in head_titles) {
			const nick = nicked(head_titles[i])
			indexes[nick] = i
		}

		return {descr, head_titles, indexes, rows_body}
	}
}
export default drive