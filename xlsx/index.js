import nxlsx from 'node-xlsx';
import fs from 'fs/promises'
import nicked from '/-nicked/nicked.js'
import cproc from "@atee/cproc"
import Dabudi from '/-xlsx/Dabudi.js'
const readJSON = async src => JSON.parse(await fs.readFile(src))


const dir = 'cache/xlsx/'
await fs.mkdir(dir, { recursive: true }).catch(e => null)

export const xlsx = {
	cache: (visitor, src) => visitor.relate(xlsx).once(src, () => cproc(xlsx, src, async () => {
		const cachename = nicked(src)
		const cachesrc = dir + cachename + '.json'
		const ishttp = /^https?:\/\//.test(src)

		const { mtime: mtimecache } = await fs.stat(cachesrc).catch(e => false)

		if (!ishttp) {
			const { mtime: mtimesrc } = await fs.stat(src).catch(e => false)
			if (!mtimesrc) return false
			if (mtimesrc <= mtimecache) return cachesrc	
		} else {
			if (mtimecache) return cachesrc //Файл из интернета кэшируется навсегда. Чтобы сбросить кэш можно передать #якорь
		}
		const t = Date.now()
		console.log('parse', src)
		const sheets = nxlsx.parse(ishttp ? Buffer.from(await fetch(src).then(r => r.arrayBuffer())) : src)
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
	},
	sheets: async (visitor, src, params = {}) => {
		const {ignore = [], start = 0, starts = {}} = params
		const listsheets = await xlsx.read(visitor, src)
		const sheets = []
		for (const sheet of listsheets) {
			if (sheet.name[0] == '.') continue
			if (~ignore.indexOf(sheet.name)) continue
			let rows_source = sheet.data
			rows_source = rows_source.slice(((starts[sheet.name] ?? start) || 1) - 1)
			const {descr, rows_table} = Dabudi.splitDescr(rows_source)
			const {head, rows_body} = Dabudi.splitHead(rows_table)

			const rows = rows_body.filter(row => row.filter(cel => cel).length > 1)
			
			
			//const indexes = Object.fromEntries(head.map((name, i) => [nicked(name), i]))
			sheets.push({ title: sheet.name, descr, head, rows})
		}
		return sheets
	},
	groups: async (visitor, src, params = {}) => {
		const {ignore = [], start = 0, starts = {}, root_title = 'Каталог', col_group = 'Группа', col_category = 'Категория'} = params
		const listsheets = await xlsx.read(visitor, src)
		const sheets = []


		const root_nick = nicked(root_title)
		const groups = {}
		groups[root_nick] = {
			group_nick: root_nick,
			group_orig: root_title,
			group_title: root_title,
			indepth:0,
			parent_nick: false
		}


		

		for (const sheet of listsheets) {
			if (sheet.name[0] == '.') continue
			if (~ignore.indexOf(sheet.name)) continue
			let rows_source = sheet.data
			rows_source = rows_source.slice(((starts[sheet.name] ?? start) || 1) - 1)
			const {descr, rows_table} = Dabudi.splitDescr(rows_source)
			const {head, rows_body} = Dabudi.splitHead(rows_table)

			const group_index = head.length
			head[group_index] = col_group
			const category_index = head.length
			head[category_index] = col_category

			let {rows_items} = Dabudi.splitGroups(rows_body, head, root_title, group_index, category_index, groups)			

			const rows = rows_items.filter(row => row.filter(cel => cel).length > 1)
			//const indexes = Object.fromEntries(head.map((name, i) => [nicked(name), i]))
			sheets.push({ title: sheet.name, descr, head, rows})
		}
		return sheets
	}
}
export default xlsx