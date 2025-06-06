import Access from "/-controller/Access.js"
import Files from "/-showcase/Files.js"
import nicked from '/-nicked'
import filter from '/-nicked/filter.js'
import fs from "fs/promises"
import xlsx from "/-xlsx"

import Rest from "/-rest"
const rest = new Rest()
export default rest

import vars from '/-showcase/rest.vars.js'
rest.extra(vars)

import rest_admin from '/-controller/rest.admin.js'
rest.extra(rest_admin)


rest.addResponse('get-settings', async view => {
	await view.get('admin')
	const { db } = await view.gets(['db'])
	const tables = [
		'showcase_groups',
		'showcase_files',
		'showcase_filekeys',
		'showcase_prices',
		'showcase_tables',
		'showcase_brands',
		'showcase_props',
		'showcase_values',
		'showcase_items',
		'showcase_models',
		'showcase_iprops'
	]
	for (const i in tables) {
		const table = tables[i]
		const obj = {}
		obj.count = await db.col('select count(*) from '+table).catch(e => '-')
		obj.name = table
		tables[i] = obj
	}
	view.ans.tables = tables
	return view.ret()
})

rest.addResponse('get-state', async view => {
	const { isdb } = await view.gets(['isdb'])
	view.ans.admin = await Access.isAdmin(view.visitor.client.cookie)
	view.ans.isdb = !!isdb
	return view.ret('', 200, true)
})
rest.addResponse('get-stat', async view => {
	const { db } = await view.gets(['db'])
	if (!db) return view.err('Нет соединения с базой данных')
	view.ans.admin = await Access.isAdmin(view.visitor.client.cookie)
	if (!view.ans.admin) return view.err('Требуется авторизация', 403)
	//view.ans.count = await db.col('SELECT count(*) FROM information_schema.innodb_trx')
	await new Promise(resolve => setTimeout(resolve, 50))
	let rows = await db.all(`SHOW PROCESSLIST`)
	rows = rows.filter(row => row.User == db.conf.user && row.Command != "Sleep")
	view.ans.count = rows.length - 1
	return view.ret()
})
rest.addResponse('get-panel', async view => {
	
	
	view.ans.ready = {
		prices: true,
		tables: true,
		files: false
	}
	try {
		const { upload } = await view.gets(['upload'])
		const tables = await upload.getNewTables()
		view.ans.ready.tables = !tables.length
		const prices = await upload.getNewPrices()
		view.ans.ready.prices = !prices.length
	} catch (e) {
		return view.err()
	}
	return view.ret()
})

rest.addResponse('get-statistics', async view => {
	const { db, config, options, base } = await view.gets(['db', 'config','options', 'base'])
	const prices = []
	for (const price_title in options.prices) {
		const price = {...options.prices[price_title]}
		const handlers = Object.assign({}, price.handlers || {})
		const props = []
		
		for (const prop_title in handlers) {
			if (!price.props || !~price.props.indexOf(prop_title)) continue
			const synonyms = [...(price.synonyms[prop_title] || [])]
			props.push({
				synonyms,
				prop_title,
				handler: handlers[prop_title]
			})
		}
		for (const prop_title of price.props) {
			if (handlers[prop_title]) continue
			const synonyms = [...(price.synonyms[prop_title] || [])]
			props.push({
				synonyms,
				prop_title,
				handler:''
			})
		}
		prices.push({...price, props, price_title})
	}
	view.ans.partners = options.partners || {}
	view.ans.handlers = options.handlers || {}
	view.ans.prices = prices
	return view.ret()
})


rest.addResponse('get-prices', async view => {
	await view.get('admin')
	const { upload, base, db, config, options } = await view.gets(['base', 'db','config','options','upload'])

	const files = await upload.getAllPrices()

	const rows = await db.all(`
		SELECT 
			price_id,
			price_title,
			price_nick,
			unix_timestamp(loadtime)*1000 as loadtime,
			quantity,
			loaded,
			duration
		FROM showcase_prices
	`)	
	files.forEach(of => {
		const index = rows.findIndex(row => row.price_nick == base.onicked(of.name))
		if (!~index) return
		const row = rows.splice(index, 1)[0]
		of.row = row
		if (row.loaded && row.loadtime > of.mtime) of.ready = true
	})
	rows.forEach(row => {
		files.push({name:row.price_title, row})
	})
	files.forEach(of => {
		of.options = options.prices[of.name]
	})
	
	view.ans.files = files
	view.ans.rows = rows
	return view.ret()
})


rest.addResponse('get-tables', async view => {
	await view.get('admin')
	const { upload, db, config, options, base } = await view.gets(['db', 'config','options', 'base', 'upload'])	
	const files = await upload.getAllTables()
	
	const rows = await db.all(`
		SELECT 
			table_id,
			table_title,
			table_nick,
			unix_timestamp(loadtime)*1000 as loadtime,
			quantity,
			loaded,
			duration
		FROM showcase_tables
	`).catch(e => ([]))

	files.forEach(of => {
		const index = rows.findIndex(row => row.table_nick == base.onicked(of.name))
		if (!~index) return
		const row = rows.splice(index, 1)[0]
		of.row = row
		if (row.loaded && row.loadtime > of.mtime) of.ready = true
	})

	rows.forEach(row => {
		files.push({name:row.table_title, row, num: 0})
	})
	files.forEach(of => {
		of.options = options.tables[of.name]
	})
	//files.sort((b, a) => a.num - b.num)
	view.ans.files = files
	view.ans.rows = rows
	return view.ret()
})
rest.addResponse('get-model', async view => {
	await view.get('admin')
	const { base, id, db, upload } = await view.gets(['base', 'db','upload','id'])
	const model = await db.fetch(`
		SELECT 
			m.model_id,
			m.model_title,
			m.model_nick,
			g.group_title,
			g.group_nick,
			b.brand_title,
			b.brand_nick
		FROM showcase_groups g, showcase_brands b, showcase_models m
		WHERE m.brand_id = b.brand_id and g.group_id = m.group_id and m.model_id = :model_id
	`, {model_id: id})

	if (!model) return view.err('Модель не найдена', 404)
	const items = await db.all(`
		SELECT 
			i.item_num, t.table_title, i.ordain
		FROM showcase_items i
			LEFT JOIN showcase_tables t on t.table_id = i.table_id
		WHERE i.model_id = :model_id
	`, {model_id: id})
	model.items = {}
	items.forEach(item => {
		item.more = {}
		model.items[item.item_num] = item
	})
	
	
	const props = await db.all(`
		SELECT 
			ip.model_id, 
			f.src, 
			bo.bond_title, 
			ip.item_num, 
			ip.number, 
			ip.text, 
			v.value_title, 
			p.prop_title, 
			p.prop_nick, 
			pr.price_title
		FROM showcase_iprops ip
			LEFT JOIN showcase_prices pr on ip.price_id = pr.price_id
			LEFT JOIN showcase_values v on v.value_id = ip.value_id
			LEFT JOIN showcase_files f on f.file_id = ip.file_id
			LEFT JOIN showcase_bonds bo on bo.bond_id = ip.bond_id
			LEFT JOIN showcase_props p on p.prop_id = ip.prop_id
		WHERE ip.model_id = :model_id
	`, {model_id: id})
	
	
	for (const prop of props) {
		prop.type = await base.getPropTypeByNick(prop.prop_nick)
		if (prop.type == 'number') {
			prop.number = Number(prop.number)
		}
		model.items[prop.item_num].more[prop.prop_title] ??= {value: [], ...prop}
		model.items[prop.item_num].more[prop.prop_title].value.push(prop.text ?? prop.value_title ?? prop.number ?? prop.src ?? prop.bond_title)
	}

	model.items = Object.values(model.items)
	model.items.sort((a, b) => a.ordain - b.ordain)


	model.items.forEach(item => {
		for( const prop_title in item.more) {
			item.more[prop_title].value = item.more[prop_title].value.join(', ')
		}
	})
	const more = {...model.items[0]?.more}
	model.items.forEach(item => {
		for (const prop_title in item.more) {
			if (more[prop_title]?.value == item.more[prop_title].value) continue
			delete more[prop_title]
		}
	})

	
	model.more = more
	model.items.forEach(item => {
		for (const prop_title in item.more) {
			if (!more[prop_title]) continue
			delete item.more[prop_title]
		}
	})
	view.ans.model = model

	return view.ret()
})
rest.addResponse('get-models', async view => {
	await view.get('admin')
	const { db, upload } = await view.gets(['db','upload'])
	const cost = await upload.receiveProp('Цена')
	const models = await db.all(`
		SELECT 
			m.model_id,
			m.model_title,
			m.model_nick,
			g.group_title,
			g.group_nick,
			b.brand_title,
			b.brand_nick,
			i.ordain,
			(select number from showcase_iprops ip where ip.model_id = m.model_id and ip.prop_id = :cost_id limit 1) as cost,
			count(i.model_id) as items
		FROM showcase_groups g, showcase_brands b, showcase_models m
		LEFT JOIN showcase_items i on i.model_id = m.model_id
		WHERE m.brand_id = b.brand_id and g.group_id = m.group_id
		GROUP BY m.model_id
		ORDER BY i.ordain

	`,{cost_id: cost.prop_id})
	view.ans.models = models
	return view.ret()
})
rest.addResponse('get-values', async view => {
	await view.get('admin')
	const { db } = await view.gets(['db'])
	const values = await db.all(`
		SELECT 
			v.value_nick,
			v.value_title,
			v.value_id,
			count(ip.value_id) as props
		FROM showcase_values v
		LEFT JOIN showcase_iprops ip on ip.value_id = v.value_id
		GROUP BY v.value_id
		ORDER by props DESC
		-- ORDER by value_nick
	`)
	view.ans.values = values
	// await new Promise(resolve => {
	// 	setTimeout(resolve, 1000)
	// })
	return view.ret()
})
rest.addResponse('get-brands', async view => {
	await view.get('admin')
	const { db } = await view.gets(['db'])
	// (select i.item_num from showcase_items i where i.model_id = m.model_id limit 1)
	const brands = await db.all(`
		SELECT 
			b.brand_title,
			b.brand_nick,
			b.brand_id,
			b.ordain
		FROM showcase_brands b
		ORDER by b.ordain
	`)
	for (const brand of brands) {
		brand.models = await db.col('select count(*) from showcase_models m, showcase_items i where m.model_id = i.model_id and item_num = 1 and m.brand_id = :brand_id', brand)
	}
	view.ans.brands = brands
	return view.ret()
})
rest.addResponse('get-files', async view => {
	await view.get('admin')
	const { db, config } = await view.gets(['db', 'config'])
	
	//Надо показать что не привязано

	const res = {}
	res['Всего файлов в индексе'] = await db.col('select count(*) from showcase_files where status = "200"')
	res['Бесхозных'] = 0
	
	
	/*
		Собираем папку с подсказкой производитель и модель
		dirs = [{
			files: [info],
			dirs:[{
				files:[info],
				dirs:[...]
			}]
		}]
		files: [{info}]

		Собираем по подсказке что указано в базе и оставляем только то чего нет
	*/

	//pages данамическая папка, подключается на лету для любого запроса поиска и т.п.
	//groupicons папка [картинки] с файлами по группам и свободной иерархией
	//brandlogos папка [картинки] с файлами по брендам и свободной иерархией

	//Для items файлы записываются, как обычные свойства [images, slides, texts, files, videos]

	//folders по брендам папки [картинки, тексты, файлы] с папками по моделям

	//images по брендам папки [картинки] с файлами по моделям и свободной иерархией
	//texts по брендам папки [тексты] с файлами по моделям и свободной иерархией
	//files по брендам папки [файлы] с файлами по моделям и свободной иерархией
	//videos по брендам папки [видео] с файлами по моделям и свободной иерархией
	//slides по брендам папки [картинки] с файлами по моделям и свободной иерархией
	
	const parts = {}
	let part
	let count = 0
	part = 'groupicons'
	parts[part] = await db.all(`
		SELECT f.src from showcase_files f 
		LEFT JOIN showcase_groups g on f.file_id = g.icon_id
		WHERE g.icon_id is null and f.destiny=:part and f.status = '200'
	`, {part})
	res['Бесхозных'] += parts[part].length

	part = 'brandlogos'
	parts[part] = await db.all(`
		SELECT f.src from showcase_files f 
		LEFT JOIN showcase_brands b on f.file_id = b.logo_id
		WHERE b.logo_id is null and f.destiny=:part and f.status = '200'
	`, {part})
	res['Бесхозных'] += parts[part].length


	for (const part of Object.keys(Files.destinies)) { //['slides','files','images','texts','videos']
		parts[part] = await db.all(`
			SELECT f.src from showcase_files f 
			LEFT JOIN showcase_iprops ip on f.file_id = ip.file_id
			WHERE ip.file_id is null and f.destiny = :part and f.status = '200'
		`, {part})
		res['Бесхозных'] += parts[part].length	
	}
	parts['Без назначения'] = await db.all(`
		SELECT f.src from showcase_files f 
		LEFT JOIN showcase_iprops ip on f.file_id = ip.file_id
		WHERE ip.file_id is null and f.destiny is null and f.status = '200'
	`)
	res['Бесхозных'] += parts['Без назначения'].length	

	view.ans.res = Object.entries(res)
	view.ans.parts = Object.entries(parts)
	return view.ret()
})

rest.addResponse('get-props', async view => {
	await view.get('admin')
	const { db, upload } = await view.gets(['db','upload'])
	let props = await db.all(`
		SELECT 
			p.prop_title,
			p.prop_nick,
			p.prop_id,
			p.ordain,
			count(ip.prop_id) as items
		FROM showcase_props p
		LEFT JOIN showcase_iprops ip on ip.prop_id = p.prop_id
		GROUP BY p.prop_id
		ORDER by ordain
	`)
	const specs = []
	specs.push(await upload.receiveProp('images'))
	specs.push(await upload.receiveProp('files'))
	specs.push(await upload.receiveProp('texts'))
	specs.push(await upload.receiveProp('videos'))
	specs.push(await upload.receiveProp('slides'))
	specs.push(await upload.receiveProp('Фото'))
	props = props.filter(prop => !specs.some(spec => spec.prop_id == prop.prop_id))
	view.ans.props = props
	return view.ret()
})
rest.addResponse('get-groups', async view => {
	await view.get('admin')
	const { db } = await view.gets(['db'])
	const groups = await db.all(`
		SELECT 
			g.group_title,
			g.group_nick,
			g.group_id,
			g.parent_id,
			g.ordain
		FROM showcase_groups g
		ORDER by g.ordain
	`)
	for (const group of groups) {
		group.direct = await db.col('select count(*) from showcase_models m, showcase_items i where m.model_id = i.model_id and item_num = 1 and m.group_id = :group_id', group)
	}

	const objgroups = {}
	for (const group of groups) {
		objgroups[group.group_id] = group
		group.inside = group.direct
	}
	let root = {childs:[], direct:0}
	for (const group of groups) {
		if (!group.parent_id) {
			root = group
			break
		}
	}

	for (const group of groups) {
		if (!group.parent_id) continue
		objgroups[group.parent_id].childs ??= []
		objgroups[group.parent_id].childs.push(group)
	}
	

	for (let group of groups) {
		const direct = group.direct
		while (group.parent_id) {
			group = objgroups[group.parent_id]
			group.inside += direct
		}
		
	}

	view.ans.count = groups.length
	view.ans.root = root
	return view.ret()
})

