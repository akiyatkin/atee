import { Dabudi } from '/-dabudi/Dabudi.js'
import { nicked } from "/-nicked/nicked.js"
import { Access } from '/-controller/Access.js'
import { Meta } from "/-controller/Meta.js"
import CONFIG from '/params.json' assert {type: "json"}

import { createRequire } from "module"
const require = createRequire(import.meta.url)
const readXlsxFile = require('read-excel-file/node')
const { readSheetNames } = require('read-excel-file/node')

const sheets = await readSheetNames(CONFIG.src)
const getList = await Access.mcache(CONFIG.src, async (list, src) => {
	if (!~sheets.indexOf(list)) return false
	const	rows_source = await readXlsxFile(src, { sheet: list })
	const {descr, rows_table} = Dabudi.splitDescr(rows_source)
	const { heads: { head_titles }, rows_body} = Dabudi.splitHead(rows_table)
	const data = []
	rows_body.forEach((row, i) => {
		const r = {}
		row.forEach((val, i) => r[head_titles[i]] = val)
		data.push(r)
	})
	return {descr, data, head_titles}
})

export const meta = new Meta()
meta.addArgument('name')
meta.addAction('get-menu', async view => {
	const { name } = await view.gets(['name'])
	const {descr, data, head} = await getList(name)
	if (!head) return view.err("Данные не найдены")
	const root = {'Уровень':false}
	let prev = root
	data.forEach(row => {
		if (!row['Уровень']) row['Уровень'] = 1
		if (row['Уровень'] < prev['Уровень']) {
			row.parent = prev.parent.parent
		} else if (row['Уровень'] > prev['Уровень']) {
			row.parent = prev
		} else if (row['Уровень'] == prev['Уровень']) {
			row.parent = prev.parent
		}
		row.parent.childs ??= []
		row.parent.childs.push(row)
		prev = row
	})
	data.forEach(row => delete row.parent)
	view.ans.menu = root
	return view.ret()
})




meta.addAction('get-sheet', async view => {
	const { name } = await view.gets(['name'])
	view.ans.sheet = await getList(name)
	return view.ret()
})
export const rest = async (query, get, { client }) => {
    const ans = await meta.get(query, { ...get, ...client } )
    const status = ans.result ? 200 : 422
    return { ans, ext: 'json', status, nostore:false }
}