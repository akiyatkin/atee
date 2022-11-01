import { Dabudi } from '/-dabudi/Dabudi.js'
import { nicked } from "/-nicked/nicked.js"

import { createRequire } from "module"
const require = createRequire(import.meta.url)
const readXlsxFile = require('read-excel-file/node')
const { readSheetNames } = require('read-excel-file/node')

export const Excel = {
	loadPrice: async (src, {start = 0, starts = {}}) => {
		const listsheets = await readSheetNames(src)
		const onicked = str => {
			if (onicked[str]) return onicked[str]
			onicked[str] = nicked(str)
			return onicked[str]
		}
		const sheets = []
		for (const sheet of listsheets) {
			let rows_source = await readXlsxFile(src, { sheet })
			rows_source.slice(starts[sheet] ?? start)
			const {descr, rows_table} = Dabudi.splitDescr(rows_source)
			const {heads, rows_body} = Dabudi.splitHead(rows_table)
			const rows_items = rows_body.filter(row => row.filter(cel => cel).length)
			sheets.push({ sheet, descr, heads, rows:rows_items})
		}
		
		return {sheets}
	},
	loadTable: async (src, brand) => {
		const listsheets = await readSheetNames(src)
		const onicked = str => {
			if (onicked[str]) return onicked[str]
			onicked[str] = nicked(str)
			return onicked[str]
		}
		const models = {}
		const group_nick = nicked('Каталог')
		const groups = {}
		const root = 'Каталог'
		groups[group_nick] = {
			group_nick: nicked(root), 
			group_orig: root,
			group_title: root,
			parent_nick: false
		}
		const sheets = {}
		const brands = {}
		for (const sheet of listsheets) {
			if (sheet[0] == '.') continue
			const rows_source = await readXlsxFile(src, { sheet })
			const {descr, rows_table} = Dabudi.splitDescr(rows_source)
			const {heads, rows_body} = Dabudi.splitHead(rows_table)
			

			const indexes = {}
			indexes.brand_title = Dabudi.getColIndexOrRename(heads, 'Бренд','Производитель')
			indexes.brand_nick = Dabudi.getColIndex(heads, 'brand_nick')
			indexes.model_title = Dabudi.getColIndexOrRename(heads, 'Модель','Артикул')
			indexes.model_nick = Dabudi.getColIndex(heads, 'model_nick')
			indexes.group_nick = Dabudi.getColIndex(heads, 'group_nick')
			indexes.sheet_row = Dabudi.getColIndex(heads, 'sheet_row')
			indexes.sheet_title = Dabudi.getColIndex(heads, 'sheet_title') //Обязательно последний

			sheets[sheet] = { descr, heads, indexes }

			
			let {rows_items} = Dabudi.splitGroups(rows_body, heads, root, indexes.group_nick, groups)
			//if (sheet == 'Светодиодные ленты') console.log(1, sheet, groups, indexes.group_nick, root, heads)
			const {head_titles, head_nicks} = heads

			
			
			rows_items = rows_items.filter(row => {
				if (!row[indexes.model_title]) return false
				if (row[indexes.model_title][0] == '.') return false
				return true
			})
			
			rows_items.forEach((row, i) => {
				row[indexes.brand_title] = row[indexes.brand_title] || brand
				row[indexes.brand_nick] = nicked(row[indexes.brand_title])
				row[indexes.model_nick] = onicked(row[indexes.model_title])
				row[indexes.sheet_row] = i + 1
				row[indexes.sheet_title] = sheet
				brands[row[indexes.brand_nick]] = { brand_title:row[indexes.brand_title], brand_nick:row[indexes.brand_nick] }
			})
			rows_items.forEach(row => {
				const brandmod = row[indexes.brand_nick] + ' ' + row[indexes.model_nick]
				if (!models[brandmod]) models[brandmod] = []
				models[brandmod].push(row)
			})
		}
		
		return {groups, models, sheets, brands}
	}
}