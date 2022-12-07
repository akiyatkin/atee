import Dabudi from '/-dabudi/Dabudi.js'
import nicked from '/-nicked'
import Access from '/-controller/Access.js'
import Rest from "/-rest"

import config from '/-config'
import xlsx from '/-xlsx'

const CONFIG = await config('params')
const lists = await xlsx.read(Access, CONFIG.src)

const rest = new Rest()

rest.addArgument('name')
rest.addResponse('get-menu', async view => {
	const { name } = await view.gets(['name'])
	const list = lists.find(d => d.name == name)
	if (!list) return view.err('Лист не найден')
	
	const {descr, rows_table} = Dabudi.splitDescr(list.data)
	const {heads, rows_body} = Dabudi.splitHead(rows_table)
	const titles = heads.head_titles
	const rows = rows_body.filter(row => row.filter(cel => cel).length)
	const sheet = { descr, heads, rows}
	if (!titles.length) return view.err('Данные не найдены')

	const data = rows.map(row => {
		const obj = {}
		for (const i in row) obj[titles[i]] = row[i]
		return obj
	})

	data.forEach(obj => {
		if (!obj['Уровень']) obj['Уровень'] = 1
	})

	const root = { "Уровень": 0, parent: false }
	let prev = root
	data.forEach(obj => {
		if (obj['Уровень'] < prev['Уровень']) {
			obj.parent = prev.parent?.parent || root
		} else if (obj['Уровень'] > prev['Уровень']) {
			obj.parent = prev
		} else { // group['Уровень'] == obj['Уровень']
			obj.parent = prev.parent
		}
		obj.parent.childs ??= []
		obj.parent.childs.push(obj)
		prev = obj
	})
	
	data.forEach(obj => delete obj.parent)
	view.ans.menu = root
	return view.ret()
})




rest.addResponse('get-sheet', async view => {
	const { name } = await view.gets(['name'])
	view.ans.sheet = await getList(name)
	return view.ret()
})

export default rest