import { Access } from "/-controller/Access.js"
import { Files } from "/-showcase/Files.js"
import { nicked } from '/-nicked/nicked.js'
import fs from "fs/promises"

export const restget = (meta) => {
	meta.addAction('get-settings', async view => {
		await view.get('admin')
		const { db } = await view.gets(['db'])
		const rows = await db.all(`
			SELECT 
			     table_name AS 'name', 
			     round(((data_length + index_length) / 1024 / 1024), 2) 'size',
			     table_rows as length 
			FROM information_schema.TABLES 
			WHERE table_schema = :dbname and table_name like 'showcase_%'
			ORDER BY size DESC, length DESC
		`,{ dbname: db.conf.database })
		view.ans.list = rows
		return view.ret()
	})

	meta.addAction('get-state', async view => {
		const { isdb, visitor } = await view.gets(['isdb', 'visitor'])
		view.ans.admin = await Access.isAdmin(visitor.client.cookie)
		view.ans.isdb = !!isdb
		return view.ret()
	})
	meta.addAction('get-stat', async view => {
		const { visitor, db } = await view.gets(['visitor','db'])
		if (!db) return view.err('Нет соединения с базой данных')
		view.ans.admin = await Access.isAdmin(visitor.client.cookie)
		if (!view.ans.admin) return view.err('Требуется авторизация')
		view.ans.count = await db.col('SELECT count(*) FROM information_schema.innodb_trx')
		return view.ret()
	})
	meta.addAction('get-panel', async view => {
		const { upload } = await view.gets(['upload'])
		
		view.ans.ready = {
			prices: true,
			tables: true,
			files: false
		}
		try {
			const tables = await upload.getNewTables()
			view.ans.ready.tables = !tables.length
			const prices = await upload.getNewPrices()
			view.ans.ready.prices = !prices.length
		} catch (e) {
			return view.err()
		}
		return view.ret()
	})
	meta.addAction('get-prices', async view => {
		await view.get('admin')
		const { visitor, db, config, options } = await view.gets(['visitor', 'db','config','options'])
		const dir = config['prices']
		const files = await Files.readdirext(visitor, dir, ['xlsx']) //{ name, ext, file }
		await Promise.all(files.map(async (of) => {
			const stat = await fs.stat(dir + of.file)
			of.size = Math.round(stat.size / 1024 / 1024 * 100) / 100
			of.mtime = new Date(stat.mtime).getTime()
		}))

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
			const index = rows.findIndex(row => row.price_nick == nicked(of.name))
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
	meta.addAction('get-tables', async view => {
		await view.get('admin')
		const { visitor, db, config, options } = await view.gets(['visitor', 'db', 'config','options'])
		const dir = config['tables']
		const files = await Files.readdirext(visitor, dir, ['xlsx']) //{ name, ext, file }
		await Promise.all(files.map(async (of) => {
			const stat = await fs.stat(dir + of.file)
			of.size = Math.round(stat.size / 1024 / 1024 * 100) / 100
			of.mtime = new Date(stat.mtime).getTime()
		}))

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
		`)
		files.forEach(of => {
			const index = rows.findIndex(row => row.table_nick == nicked(of.name))
			if (!~index) return
			const row = rows.splice(index, 1)[0]
			of.row = row
			if (row.loaded && row.loadtime > of.mtime) of.ready = true
		})
		rows.forEach(row => {
			files.push({name:row.table_title, row})
		})
		files.forEach(of => {
			of.options = options.tables[of.name]
		})
		
		view.ans.files = files
		view.ans.rows = rows
		return view.ret()
	})

	meta.addAction('get-models', async view => {
		await view.get('admin')
		const { db } = await view.gets(['db'])
		
		const models = await db.all(`
			SELECT 
				m.model_title,
				m.model_nick,
				g.group_title,
				g.group_nick,
				b.brand_title,
				b.brand_nick,
				count(i.model_id) as items
			FROM showcase_groups g, showcase_brands b, showcase_models m
			LEFT JOIN showcase_items i on i.model_id = m.model_id
			WHERE m.brand_id = b.brand_id and g.group_id = m.group_id
			GROUP BY m.model_id
		`)
		view.ans.models = models
		return view.ret()
	})
	meta.addAction('get-values', async view => {
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
		`)
		view.ans.values = values
		// await new Promise(resolve => {
		// 	setTimeout(resolve, 1000)
		// })
		return view.ret()
	})
	meta.addAction('get-brands', async view => {
		await view.get('admin')
		const { db } = await view.gets(['db'])
		const brands = await db.all(`
			SELECT 
				b.brand_title,
				b.brand_nick,
				b.brand_id,
				count(m.brand_id) as models
			FROM showcase_brands b
			LEFT JOIN showcase_models m on m.brand_id = b.brand_id
			GROUP BY b.brand_id
			ORDER by models DESC
		`)
		view.ans.brands = brands
		return view.ret()
	})
	meta.addAction('get-files', async view => {
		await view.get('admin')
		const { visitor, db, config } = await view.gets(['visitor', 'db', 'config'])
		
		//Надо показать иерархию. Часто папки объединяются
		//Содержимое папок под контролем полностью и надо показать что не привязано

		
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

		//grouptexts данамическая папка, подключается на лету для любого запроса поиска и т.п.
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
		parts[part] = await Files.readdirDeep(visitor, config[part])
		await Files.filterDeep(parts[part], async (dirinfo, fileinfo, level) => {
			if (!~Files.exts['images'].indexOf(fileinfo.ext)) return ++count
			const src = dirinfo.dir+fileinfo.file
			const is = await db.col('SELECT 1 FROM showcase_groups where icon = :src LIMIT 1', {src})
			if (is) return false
			return ++count
		})

		part = 'brandlogos'
		parts[part] = await Files.readdirDeep(visitor, config[part])
		await Files.filterDeep(parts[part], async (dirinfo, fileinfo, level) => {
			if (!~Files.exts['images'].indexOf(fileinfo.ext)) return ++count
			const src = dirinfo.dir+fileinfo.file
			const is = await db.col('SELECT 1 FROM showcase_brands where logo = :src LIMIT 1', {src})
			if (is) return false
			return ++count
		})

		for (const part of ['slides','files','images','texts','videos']) {
			parts[part] = await Files.readdirDeep(visitor, config[part])
			for (const root of parts[part].dirs) {
				const brand_nick = nicked(root.name)
				const brand_id = await db.col('SELECT brand_id FROM showcase_brands where brand_nick = :brand_nick', {brand_nick})
				if (!brand_id) continue
				await Files.filterDeep(root, async (dirinfo, fileinfo, level) => {
					if (!~Files.exts[part].indexOf(fileinfo.ext)) return true
					const src = nicked(dirinfo.dir + fileinfo.file)
					const is = await db.col('SELECT 1 FROM showcase_values where value_nick = :src LIMIT 1', {src})
					if (is) return false
					return true
				})
			}
			for (const root of parts[part].dirs) {
				await Files.filterDeep(root, async (dirinfo, fileinfo, level) => {
					count++
					return true
				})
			}
		}

		part = 'folders'
		parts[part] = await Files.readdirDeep(visitor, config[part])
		for (const dirinfo of parts[part].dirs) { //Бренды
			const brand_nick = nicked(dirinfo.name)
			const brand_id = await db.col('SELECT brand_id FROM showcase_brands where brand_nick = :brand_nick', {brand_nick})
			if (!brand_id) continue
			for (const subinfo of dirinfo.dirs) { //Модели
				for (const fileinfo of subinfo.files) { //Файлы
					//В папке любой файл должен быть связан вне зависимости от расширения
					const src = nicked(dirinfo.dir + fileinfo.file)
					const is = await db.col('SELECT 1 FROM showcase_values where value_nick = :src LIMIT 1', {src})
					if (is) return false
					return ++count
				}
			}
		}
		for (const root of parts[part].dirs) {
			for (const subinfo of dirinfo.dirs) {
				count += subinfo.files.length
			}
		}

		view.ans.count = count
		view.ans.parts = parts

		return view.ret()
	})

	meta.addAction('get-props', async view => {
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
	meta.addAction('get-groups', async view => {
		await view.get('admin')
		const { db } = await view.gets(['db'])
		const groups = await db.all(`
			SELECT 
				g.group_title,
				g.group_nick,
				g.group_id,
				g.parent_id,
				count(m.group_id) as models
			FROM showcase_groups g
			LEFT JOIN showcase_models m on m.group_id = g.group_id
			GROUP BY g.group_id
			ORDER by ordain
		`)
		const objgroups = {}
		for (const group of groups) {
			objgroups[group.group_id] = group
		}
		let root
		for (const group of groups) {
			if (!group.parent_id) {
				root = group
				continue
			}
			objgroups[group.parent_id].childs ??= []
			objgroups[group.parent_id].childs.push(group)
			objgroups[group.parent_id].models += group.models
		}		
		view.ans.count = groups.length
		view.ans.root = root
		return view.ret()
	})
}