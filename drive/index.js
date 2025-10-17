import fs from 'fs/promises'
import nicked from '/-nicked/nicked.js'
import cproc from '/-cproc'
import config from '/-config'
import Access from '/-controller/Access.js'
import EasySheetsDef from 'easy-sheets'
import { google } from 'googleapis';
import Dabudi from '/-dabudi'
const EasySheets = EasySheetsDef.default

const dir = 'cache/drive/'
await fs.mkdir(dir, { recursive: true }).catch(e => null)

const Drive = {
	cacheRows: (gid, range, sheet = '', eternal) => {
		const store = Access.relate(Drive)
		const name = sheet + gid
		if (eternal == 'nocache') store.clear(name)
		return store.once(name, () => cproc(Drive, sheet + gid, async () => {

			const cachename = nicked(gid + '-' + range + '-' + sheet)
			const cachesrc = dir + cachename + '.json'

			if (eternal != 'nocache') {
				if (eternal && await fs.lstat(cachesrc).catch(r => false)) {
					return cachesrc
				}
			}
			const easySheets = await Drive.getEasy(gid)			
			const rows = await easySheets.getRange(range, {sheet}).catch(e => {
				console.log('Drive', gid, sheet, range, e.code)
				return []
			})
			if (!rows) return false
			console.log('Запись на диск writeFile ' + cachesrc)
			await fs.writeFile(cachesrc, JSON.stringify(rows))
			return cachesrc
		}))
	},
	getEasy: async (gid) => {
		const conf = await config('drive')
		const cert = await fs.readFile(conf.certificate, "utf8").catch(r => false)
		if (!cert) {
			console.log('Неудалось считать сертификат ' + conf.certificate)
			throw 'Неудалось считать сертификат ' + conf.certificate
		}
		const easySheets = new EasySheets(gid, btoa('{}'))
		easySheets.serviceAccountCreds = JSON.parse(cert)
		return easySheets
	},
	getGapi: async () => {
		const conf = await config('drive')
		const auth = new google.auth.GoogleAuth({
			keyFile: conf.certificate,
			scopes: ['https://www.googleapis.com/auth/drive.metadata.readonly']
		})
		const gapi = google.drive({ version: 'v3', auth })
		return gapi
	},
	cacheLists: (gid) => Access.relate(Drive).once(gid, () => cproc(Drive, gid, async () => {
		const cachename = nicked(gid)
		const cachesrc = dir + cachename + '.json'

		const easySheets = await Drive.getEasy(gid)
		
		const gauth = await easySheets.authorize()
    	const gdata = await gauth.spreadsheets.get({ spreadsheetId: gid })
    	
    	const sheets = gdata.data.sheets.filter(sheet => !~sheet.properties.title.indexOf('.'))
		
		await fs.writeFile(cachesrc, JSON.stringify(sheets))
		return cachesrc
	})),
	getLists: async (gid) => {
		const cachesrc = await Drive.cacheLists(gid)
		if (!cachesrc) return []
		const list = JSON.parse(await fs.readFile(cachesrc, "utf8"))
		return list
	}, 
	getRows: async (gid, range, sheet, eternal) => {
		const cachesrc = await Drive.cacheRows(gid, range, sheet, eternal)
		if (!cachesrc) return false
		const rows = JSON.parse(await fs.readFile(cachesrc, "utf8"))
		return rows
	},
	getModified: async (gid) => {
		try {
			const gapi = await Drive.getGapi()
			const response = await gapi.files.get({
				fileId: gid,
				fields: 'modifiedTime'
			})
			const lastModified = new Date(response.data.modifiedTime)
			return lastModified
		} catch (error) {
			console.log(error)
			return 'Ошибка: ' + error
		}
	},
	getSheet: async (gid, range, title, eternal = 'nocache') => {
		const table = await Drive.getTable(gid, range, title, eternal)
		if (!table.head_titles?.length) return false
		return {title, head: table.head_titles, rows: table.rows_body}
	},
	getTable: async (gid, range, sheet, eternal = false) => {
		const rows_source = await Drive.getRows(gid, range, sheet, eternal)
		if (!rows_source) return false
		const {descr, rows_table} = Dabudi.splitDescr(rows_source)
		const {head_titles = [], rows_body} = Dabudi.splitHead(rows_table)

		const indexes = {}
		for (const i in head_titles) {
			const nick = nicked(head_titles[i])
			indexes[nick] = i
		}

		return {descr, head_titles, indexes, rows_body}
	}
}
export default Drive