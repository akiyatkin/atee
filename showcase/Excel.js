import { Dabudi } from '/-dabudi/Dabudi.js'
import { nicked } from "/-nicked/nicked.js"

import { createRequire } from "module"
const require = createRequire(import.meta.url)
const readXlsxFile = require('read-excel-file/node')
const { readSheetNames } = require('read-excel-file/node')

export const Excel = {
	load: async (src, brand) => {
		const listsheets = await readSheetNames(src)
		//const nicked = (str) => view.once('nicked', [str], nicked(str))
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
			group_title: root,
			parent_nick: false
		}
		const sheets = {}
		const brands = {}
		for (const sheet of listsheets) {
			const rows_source = await readXlsxFile(src, { sheet })
			const {descr, rows_table} = Dabudi.splitDescr(rows_source)
			const {heads, rows_body} = Dabudi.splitHead(rows_table)
			

			const indexes = {}
			indexes.brand_title = Dabudi.getColIndex(heads, 'Бренд')
			indexes.brand_nick = Dabudi.getColIndex(heads, 'brand_nick')
			indexes.model_title = Dabudi.getColIndex(heads, 'Модель')
			indexes.model_nick = Dabudi.getColIndex(heads, 'model_nick')
			indexes.group_nick = Dabudi.getColIndex(heads, 'group_nick')
			indexes.sheet_title = Dabudi.getColIndex(heads, 'sheet_title') //Обязательно последний

			sheets[sheet] = { descr, heads, indexes }


			let {rows_items} = Dabudi.splitGroups(rows_body, heads, root, indexes.group_nick, groups)
			const {head_titles, head_nicks} = heads

			
			
			rows_items = rows_items.filter(row => {
				if (!row[indexes.model_title]) return false
				if (row[indexes.model_title][0] == '.') return false
				return true
			})
			
			rows_items.forEach(row => {
				row[indexes.brand_title] = row[indexes.brand_title] || brand
				row[indexes.brand_nick] = nicked(row[indexes.brand_title])
				row[indexes.model_nick] = onicked(row[indexes.model_title])
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