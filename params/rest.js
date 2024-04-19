import Dabudi from '/-dabudi'
import Base from '/-showcase/Base.js'
import nicked from '/-nicked'
import Access from '/-controller/Access.js'
import Rest from "/-rest"
const rest = new Rest()

import rest_funcs from "/-rest/rest.funcs.js"
rest.extra(rest_funcs)

import rest_seo from "/-sitemap/rest.seo.js"
rest.extra(rest_seo)

import config from '/-config'
import xlsx from '/-xlsx'

import drive from '/-drive'






rest.addArgument('name')
rest.addVariable('name#required',['name', 'required'])


rest.addVariable('table', async view => {
	const name = await view.get('name#required')
	const conf = await config('params')

	if (conf.gid) {
		return await drive.getTable(conf.gid, 'A1:Z1000', name)
		
	} else if (conf.src) {
		const lists = await xlsx.read(Access, conf.src) || []
		const table = lists.find(d => d.name == name)
		if (!table) return view.err('Лист не найден')
		const rows_source = table.data
		if (!rows_source) return view.err('Лист не найден')
		const {descr, rows_table} = dabudi.splitDescr(rows_source)
		const {head_titles, rows_body} = dabudi.splitHead(rows_table)

		const indexes = {}
		for (const i in head_titles) {
			const nick = nicked(head_titles[i])
			indexes[nick] = i
		}

		return {name, descr, head_titles, indexes, rows_body}
	} else {
		return view.err('Некорректный конфиг', 500)
	}

})

import rest_path from '/-controller/rest.path.js'
rest.extra(rest_path)

rest.addResponse('get-head', async view => {
	const path = await view.get('path') //Без слэша
	const table = await view.get('table')
	for (const row of table.rows_body) {
		const href = row[table.indexes.href]
		const crumb = row[table.indexes.crumb]
		if ((href ? href + '/' : '') + crumb == path) {
			const child = {
				"title": row[table.indexes.title] || '',
				"description": row[table.indexes.description] || '',
				"keywords": row[table.indexes.keywords] || '',
				"image_src": row[table.indexes['image-src']] || ''
			}
			Object.assign(view.ans, child)
			return view.ret()
		}
	}
	return view.err()
})
rest.addResponse('get-sitemap', async view => {
	
	const table = await view.get('table')
	const headings = {}
	for (const row of table.rows_body) {
		const href = row[table.indexes.href]
		const crumb = row[table.indexes.crumb]
		if (crumb[0] == '.') continue
		const title = row[table.indexes.group]
		const nick = nicked(title)
		
		const child = {
			"title": row[table.indexes.title] || '',
			"description": row[table.indexes.description] || '',
			"keywords": row[table.indexes.keywords] || '',
			"image_src": row[table.indexes['image-src']] || ''
		}
		for (const i in child) if (!child[i]) delete child[i]

		const heading = headings[nick] ??= {
			title,
			href,
			childs:{}
		}
		heading.childs[crumb] = child
	}
	view.ans.headings = headings

	return view.ret()
})
rest.addResponse('get-sitemap-root', async view => {
	

	const headings = await view.get('headings')
	Object.assign(view.ans, headings[''] || {})
	
	view.ans.headings = Object.entries(headings).map(([nick, heading]) => ({title: heading.title, nick}))
	return view.ret()
})
rest.addArgument('group', ['string'])
rest.addResponse('get-sitemap-group', async view => {
	const headings = await view.get('headings')
	const group = await view.get('group')
	Object.assign(view.ans, headings[group] || {})
	return view.ret()
})




rest.addResponse('get-table', async view => {
	const table = await view.get('table')
	view.ans.table = table
	return view.ret()
})
rest.addResponse('get-menu', async view => {
	const name = await view.get('name')
	const conf = await config('params')
	let list

	if (conf.gid) {
		const range = 'A1:Z1000'
		list = {
			title: name,
			data: await drive.getRows(conf.gid, range, name)
		}
	} else if (conf.src) {
		const lists = await xlsx.read(Access, conf.src) || []
		list = lists.find(d => d.name == name)
		if (!list) return view.err('Лист не найден')
	} else {
		return view.err('Некорректный конфиг', 500)
	}
	const base = new Base(view)
	const {descr, rows_table} = Dabudi.splitDescr(list.data)
	const {heads, rows_body} = Dabudi.splitHead(rows_table, base)
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