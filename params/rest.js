
import Rest from "@atee/rest"
const rest = new Rest()

import rest_funcs from "/-rest/rest.funcs.js"
rest.extra(rest_funcs)

import rest_seo from "/-sitemap/rest.seo.js"
rest.extra(rest_seo)

import rest_path from '/-controller/rest.path.js'
rest.extra(rest_path)

import Dabudi from '@atee/dabudi'
import Base from '/-showcase/Base.js'
import nicked from "@atee/nicked"
import unique from '/-nicked/unique.js'
import Access from '/-controller/Access.js'
import config from '@atee/config'
import xlsx from '@atee/xlsx'
import drive from "@atee/drive"






rest.addArgument('name')
rest.addVariable('name#required',['name', 'required'])
rest.addArgument('group', ['string'])

const getTable = async (name, eternal) => {
	const conf = await config('params')
	const range = 'A1:Z1000'
	if (conf.gid) {
		return await drive.getTable(conf.gid, range, name, eternal)
	} else if (conf.src) {
		const lists = await xlsx.read(Access, conf.src) || []
		const table = lists.find(d => d.name == name)
		if (!table) return false
		const rows_source = table.data
		if (!rows_source) return false
		const {descr, rows_table} = Dabudi.splitDescr(rows_source)
		const {head_titles, rows_body} = Dabudi.splitHead(rows_table)

		const indexes = {}
		for (const i in head_titles) {
			const nick = nicked(head_titles[i])
			indexes[nick] = i
		}
		return {name, descr, head_titles, indexes, rows_body}
	} else {
		return false
	}
}


rest.addVariable('table', async view => {
	const name = await view.get('name#required')
	
	const table = await getTable(name) //!!~view.visitor.client.host.indexOf('127.0.0.1')
	if (!table) return view.err('Ошибка в данных')
	return table

	

})




rest.addResponse('get-blocks', async view => {
	const path = '/' + await view.get('path') //Без слэша

	const rel = await getTable('REL') //, !!~view.visitor.client.host.indexOf('127.0.0.1')

	
	const list = []
	rel.rows_body.forEach(row => {
		if (!row[rel.indexes.obratno]) return
		if (row[rel.indexes.chto] != path) return
		list.push(row[rel.indexes.gde])
	})
	rel.rows_body.forEach(row => {
		if (row[rel.indexes.gde] != path) return
		list.push(row[rel.indexes.chto])
	})
	unique(list)

	const seo = await getTable('SEO') //, !!~view.visitor.client.host.indexOf('127.0.0.1')
	const blocks = list.map(path => { //path со слэшом
		const row = seo.rows_body.find(row => '/' + row[seo.indexes.href] == path)
		if (!row) return false
		return {
			description: row[seo.indexes.description],
			path,
			title: row[seo.indexes.title],
			image_src: row[seo.indexes['image-src']]
		}
	}).filter(row => row)
	
	
	view.data.descr = rel.descr
	view.data.path = path
	view.data.blocks = blocks
	return view.ret()
})



rest.addResponse('get-tables', async view => {
	const conf = await config('params')
	const range = 'A1:Z1000'
	
	let sources = []
	if (conf.gid) {
		let sheets = await drive.getLists(conf.gid) || []
		sheets = sheets.map(d => d.properties.title)
		for (const i in sheets) {
			const name = sheets[i]
			
			const rows_source = await drive.getRows(conf.gid, range, name)
			if (!rows_source) continue
			sources.push({name, rows_source})
		}
	} else if (conf.src) {
		let sheets = await xlsx.read(Access, conf.src) || []
		for (const i in sheets) { 
			const name = sheets[i].name
			const table = sheets[i]

			const rows_source = table.data
			if (!rows_source) continue
			sources.push({name, rows_source})
		}	
	} else {
		return view.err('Некорректный конфиг', 500)
	}
	const list = []
	for (const i in sources) {
		const {rows_source, name} = sources[i]
	
		const {descr, rows_table} = Dabudi.splitDescr(rows_source)
		const {head_titles, rows_body} = Dabudi.splitHead(rows_table)

		const indexes = {}
		for (const i in head_titles) {
			const nick = nicked(head_titles[i])
			indexes[nick] = i
		}
		list.push({name, descr, head_titles, indexes, rows_body})
	}
	view.data.list = list
	return view.ret()
})
rest.addResponse('get-sheets', async view => {
	const conf = await config('params')
	let sheets = []
	if (conf.gid) {
		sheets = await drive.getLists(conf.gid) || []
		sheets = sheets.map(d => d.properties.title)
	} else if (conf.src) {
		sheets = await xlsx.read(Access, conf.src) || []
		sheets = sheets.map(d => d.name)
	} else {
		return view.err('Некорректный конфиг', 500)
	}
	view.data.sheets = sheets
	return view.ret()
})


rest.addResponse('get-table', async view => {
	const table = await view.get('table')
	view.data.table = table
	return view.ret()
})

rest.addResponse('get-head', async view => {
	const path = await view.get('path') //Без слэша
	const table = await view.get('table')
	for (const row of table.rows_body) {
		const href = row[table.indexes.href] || ''
		if (!href && !Object.keys(row).filter(cell => cell.trim()).length) continue
		if (path == href) {
			const item = {
				"title": row[table.indexes.title],
				"description": row[table.indexes.description],
				"keywords": row[table.indexes.keywords],
				"robots": row[table.indexes.robots],
				"key": row[table.indexes.key],
				"image_src": row[table.indexes['image-src']]
			}
			for (const i in item) if (!item[i]) delete item[i]
			Object.assign(view.data, item)
			return view.ret()
		}
	}
	return view.err()
})
rest.addResponse('get-sitemap', async view => {
	const table = await view.get('table')
	
	const headings = {}
	for (const row of table.rows_body) {
		const href = row[table.indexes.href] || ''
		const item = {
			"title": row[table.indexes.title] || '',
			"description": row[table.indexes.description] || '',
			"keywords": row[table.indexes.keywords] || '',
			"robots": row[table.indexes.robots] || '',
			"key": row[table.indexes.key] || '',
			"image_src": row[table.indexes['image-src']] || ''
		}
		for (const i in item) if (!item[i]) delete item[i]

		if (!Object.keys(item).length) continue
		
		

		const title = row[table.indexes.group] || ''
		const heading = headings[nicked(title)] ??= {
			title,
			items:{}
		}
		heading.items[href] = item
	}
	view.data.headings = headings

	return view.ret()
})


const getSitemapGroup = async ({view}, group_name = '') => {
	const headings = await view.get('headings')
	return {
		heading: headings[group_name] || {title: group_name, items:{}, empty: true},
		headings: Object.entries(headings).filter(([nick, heading]) => nick).map(([nick, heading]) => ({title: heading.title, nick}))
	}
}
rest.addResponse('get-sitemap-root', async view => {
	const res = await getSitemapGroup({view, toString: () => 'view'}, '')
	view.data.heading = res.heading
	view.data.headings = res.headings
	return view.ret()	
})

rest.addResponse('get-sitemap-group', async view => {
	const group_name = await view.get('group')
	const res = await getSitemapGroup({view, toString: () => 'view'}, group_name)	
	if (res.heading.empty) return view.err('Группа страниц не найдена', 404)
	view.data.heading = res.heading
	view.data.headings = res.headings
	return view.ret()
})



rest.addResponse('get-menu', async view => {
	const name = await view.get('name')
	const conf = await config('params')
	const range = 'A1:Z1000'
	let list
	if (conf.gid) {
		
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
	view.data.menu = root
	return view.ret()
})


export default rest