import Dabudi from '/-dabudi/Dabudi.js'
import nicked from "/-nicked"
import xlsx from "/-xlsx"
import Files from "./Files.js"


export const Excel = {
	read: async (visitor, src) => {
		const info = Files.nameInfo(src)
		if (info.ext == 'xlsx') return await xlsx.read(visitor, src)
		if (info.ext == 'js') {
			const rest = await import('/' + src).then(r => r.default)
			if (rest.list['get-data']) {
				const reans = await rest.get('get-data', {}, visitor)
				return reans.ans || []
			}
		}
		return []
	},
	loadPrice: async (visitor, src, {start = 0, starts = {}, ignore = []}, base) => {
		const listsheets = await Excel.read(visitor, src)
		const sheets = []
		for (const sheet of listsheets) {
			if (sheet.name[0] == '.') continue
			if (~ignore.indexOf(sheet.name)) continue
			let rows_source = sheet.data
			rows_source = rows_source.slice(((starts[sheet.name] ?? start) || 1) - 1)
			const {descr, rows_table} = Dabudi.splitDescr(rows_source)
			const {heads, rows_body} = Dabudi.splitHead(rows_table, base)
			//const rows_items = rows_body.filter(row => row.filter(cel => cel).length)
			const rows_items = rows_body.filter(row => row.filter(cel => cel).length > 1)
			sheets.push({ sheet: sheet.name, descr, heads, rows:rows_items})
		}
		return { sheets }
	},
	loadTable: async (visitor, src, brand, base, msgs = [], root_title) => {
		const listsheets = await Excel.read(visitor, src)
		const models = {}
		const root = root_title
		const root_nick = base.onicked(root)
		const groups = {}
		
		groups[root_nick] = {
			group_nick: root_nick,
			group_orig: root,
			group_title: root,
			indepth:0,
			parent_nick: false
		}
		const sheets = {}
		const brands = {}
		let sheet_index = 0
		for (const sheet of listsheets) {
			sheet_index++
			if (sheet.name[0] == '.') continue
			const rows_source = sheet.data
			const {descr, rows_table} = Dabudi.splitDescr(rows_source)
			const {heads, rows_body} = Dabudi.splitHead(rows_table, base)
			
			const indexes = {}
			indexes.brand_title = Dabudi.recColIndexOrRename(heads, 'Бренд','Производитель', base)
			indexes.brand_nick = Dabudi.recColIndex(heads, 'brand_nick', base)
			indexes.model_title = Dabudi.recColIndexOrRename(heads, 'Модель','Артикул', base)
			indexes.model_nick = Dabudi.recColIndex(heads, 'model_nick', base)
			indexes.group_nick = Dabudi.recColIndex(heads, 'group_nick', base)
			indexes.sheet_row = Dabudi.recColIndex(heads, 'sheet_row', base)
			indexes.sheet_index = Dabudi.recColIndex(heads, 'sheet_index', base)
			indexes.sheet_title = Dabudi.recColIndex(heads, 'sheet_title', base) //Обязательно последний

			sheets[sheet.name] = { descr, heads, indexes }

			
			let {rows_items} = Dabudi.splitGroups(rows_body, heads, root, indexes.group_nick, base, groups)
			
			//if (sheet == 'Светодиодные ленты') console.log(1, sheet, groups, indexes.group_nick, root, heads)
			const {head_titles, head_nicks} = heads

			
			
			rows_items = rows_items.filter(row => {
				if (!row[indexes.model_title]) return false
				if (row[indexes.model_title][0] == '.') return false
				return true
			})
			
			rows_items.forEach((row, i) => {
				row[indexes.brand_title] = row[indexes.brand_title] || brand
				row[indexes.brand_nick] = base.onicked(row[indexes.brand_title])
				row[indexes.model_nick] = base.onicked(row[indexes.model_title])

				
				const len = String(row[indexes.model_title]).length
				if (len > base.LONG) {
					msgs.push(`
						<b>${head_titles[indexes.model_title]}</b> model <b>${row[indexes.model_title]}</b>. 
						Длинна ${len} > ${base.LONG}. Значение обрезано. 
						${brand}, лист ${sheet.name}. 
					`)
				}

				row[indexes.brand_title] = row[indexes.brand_title].slice(-base.LONG).trim()
				row[indexes.model_title] = row[indexes.model_title].slice(-base.LONG).trim()

				row[indexes.sheet_row] = i + 1
				row[indexes.sheet_index] = sheet_index
				row[indexes.sheet_title] = sheet.name.slice(-base.LONG).trim()
				row.splice(indexes.sheet_title + 1)
				brands[row[indexes.brand_nick]] = { brand_title:row[indexes.brand_title], brand_nick:row[indexes.brand_nick] }
			})
			rows_items.forEach(row => {
				const brandmod = row[indexes.brand_nick] + ' ' + row[indexes.model_nick]
				if (!models[brandmod]) models[brandmod] = []
				models[brandmod].push(row)
			})
		}
		for (const group_nick in groups) {
			if (!groups[group_nick].indepth) delete groups[group_nick]
		}
		return {groups, models, sheets, brands}
	}
}
export default Excel