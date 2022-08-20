
import { Files } from "/-showcase/Files.js"
import { Access } from "/-controller/Access.js"
import { Excel } from "/-showcase/Excel.js"
import fs from "fs/promises"

import { nicked } from '/-nicked/nicked.js'
import { unique } from '/-nicked/unique.js'

import { whereisit } from '/-controller/whereisit.js'
const { FILE_MOD_ROOT, IMPORT_APP_ROOT } = whereisit(import.meta.url)

export const restset = (meta) => {
	meta.addAction('set-reset', async view => {
		await view.get('admin')
		const { db } = await view.gets(['db'])

		const res = await db.exec(`DROP TABLE IF EXISTS 
			showcase_groups,
			showcase_prices,
			showcase_tables,
			showcase_brands,
			showcase_articles,
			showcase_props,
			showcase_values,
			showcase_items,
			showcase_models,
			showcase_search,
			showcase_iprops,
			showcase_gprops
		`)
		await db.start()
		const src = FILE_MOD_ROOT + '/update.sql'
		const sql = await fs.readFile(src).then(buffer => buffer.toString())
		const sqls = sql.split(';')
		const promises = sqls.map(sql => {
			sql = sql.trim()
			if (!sql) return Promise.resolve()
			return db.exec(sql)
		})
		db.commit()
		await Promise.all(promises)
		
		Access.setAccessTime()
		return view.ret('База пересоздана')
	})
	meta.addAction('set-brands-clearempty', async view => {
		await view.get('admin')
		const { db } = await view.gets(['db'])
		await db.changedRows(`
			DELETE b
			FROM showcase_brands b
			LEFT JOIN showcase_models m on m.brand_id = b.brand_id
			WHERE m.brand_id is null
		`)
		Access.setAccessTime()
		return view.ret('Удалено')
	})
	meta.addAction('set-groups-clearempty', async view => {
		await view.get('admin')
		const { db } = await view.gets(['db'])

		await db.start()
		const groups = await db.all(`
			SELECT 
				g.group_title,
				g.group_nick,
				g.group_id,
				g.parent_id,
				count(m.model_id) as models
			FROM showcase_groups g
			LEFT JOIN showcase_models m on m.group_id = g.group_id
			GROUP BY g.group_id
		`)
		const objgroups = {}
		for (const group of groups) {
			objgroups[group.group_id] = group
		}
		for (const group of groups) {
			if (!group.parent_id) continue
			objgroups[group.parent_id].models += group.models
		}
		for (const group of groups) {
			if (group.models > 0) continue
			await db.changedRows(`
				DELETE g
				FROM showcase_groups g
				WHERE g.group_id = :group_id
			`, group)
		}
		await db.commit()
		Access.setAccessTime()
		return view.ret('Удалено')
	})
	
	meta.addAction('set-props-move', async view => {
		await view.get('admin')
		const { db, before_id, after_id } = await view.gets(['db','before_id','after_id'])

		await db.start()
		const props = await db.all(`
			SELECT 
				p.prop_id,
				p.ordain
			FROM showcase_props p
			ORDER by ordain
		`)
		let ordain = 0
		let before, after
		props.forEach(prop => {
			if (prop.prop_id == after_id) after = prop
			if (prop.prop_id == before_id) before = prop
			ordain = ordain + 2
			prop.ordain = ordain
		})
		if (!before || !after) return view.err('Не найдены свойства')
		before.ordain = after.ordain - 1

		for (const prop of props) {
			await db.changedRows(`
				UPDATE
					showcase_props 
				SET
					ordain = :ordain
				WHERE prop_id = :prop_id
			`, prop)
		}
		await db.changedRows(`
			DELETE v
			FROM showcase_values v
			LEFT JOIN showcase_iprops ip on ip.value_id = v.value_id
			WHERE ip.value_id is null
		`)
		await db.commit()
		Access.setAccessTime()
		return view.ret('Удалено')
	})
	meta.addAction('set-values-clearempty', async view => {
		await view.get('admin')
		const { db } = await view.gets(['db'])
		await db.changedRows(`
			DELETE v
			FROM showcase_values v
			LEFT JOIN showcase_iprops ip on ip.value_id = v.value_id
			WHERE ip.value_id is null
		`)
		Access.setAccessTime()
		return view.ret('Удалено')
	})
	meta.addAction('set-props-clearempty', async view => {
		await view.get('admin')
		const { db } = await view.gets(['db'])
		await db.changedRows(`
			DELETE p
			FROM showcase_props p
			LEFT JOIN showcase_iprops ip on ip.prop_id = p.prop_id
			WHERE ip.prop_id is null
		`)
		Access.setAccessTime()
		return view.ret('Удалено')
	})
	meta.addAction('set-models-clearempty', async view => {
		await view.get('admin')
		const { db } = await view.gets(['db'])
		const models = await db.all(`
			DELETE m
			FROM showcase_groups g, showcase_brands b, showcase_models m
			LEFT JOIN showcase_items i on i.model_id = m.model_id
			WHERE m.brand_id = b.brand_id and g.group_id = m.group_id and i.model_id is null
		`)
		Access.setAccessTime()
		return view.ret('Удалено')
	})

	meta.addAction('set-tables-clear', async view => {
		await view.get('admin')
		const { upload, name } = await view.gets(['upload', 'name'])
		const row = await upload.clearTable(name)
		view.ans.row = row
		Access.setAccessTime()
		return view.ret('Очищено')
	})
	meta.addAction('set-tables-loadall', async view => {
		await view.get('admin')
		const { upload } = await view.gets(['upload'])
		const files = await upload.getNewTables()
		let count = 0
		await Promise.all(files.map(async of => {
			const { quantity = 0 } = await upload.loadTable(of.name)
			count += quantity
		}))
		Access.setAccessTime()
		return view.ret('Внесено ' + count)
	})
	meta.addAction('set-tables-load', async view => {
		await view.get('admin')
		const { upload, name } = await view.gets(['upload','name'])
		/*
			Центральная таблица для ячеек 
			iprops - очищается
			items - очищается, items из других таблиц сохранятся
			models - остаётся, будет модель без позиций, РЕДАКТИРУЕТСЯ без ordain
			tables (prices) - остаётся, с меткой loaded:0

			и связанные с ними объекты
			brands - остаётся, РЕДАКТИРУЕТСЯ
			values - остаётся, РЕДАКТИРУЕТСЯ без ordain
			props - остаётся, РЕДАКТИРУЕТСЯ без ordain
			groups - остаётся, РЕДАКТИРУЕТСЯ

			РЕДАКТИРУЕТСЯ: можно менять ordain и регистр, можно удалить если нет позиций, показывается нередактируемый nick
		*/
		const row = await upload.loadTable(name)
		view.ans.row = row
		
		Access.setAccessTime()
		return view.ret('Внесено ' + row.quantity)
	})
	meta.addAction('set-prices-clearall', async view => {
		await view.get('admin')
		const { upload, db } = await view.gets(['upload', 'db'])
		const rows = await db.all(`
			SELECT
				price_title
			FROM showcase_prices
		`)
		await Promise.all(rows.map(({price_title}) => {
			return upload.clearPrice(price_title)
		}))
		Access.setAccessTime()
		
		return view.ret('Прайсы очищены')
	})
	meta.addAction('set-tables-clearall', async view => {
		await view.get('admin')
		const { upload, db } = await view.gets(['upload', 'db'])
		const rows = await db.all(`
			SELECT
				table_title
			FROM showcase_tables
		`)
		await Promise.all(rows.map(({table_title}) => {
			return upload.clearTable(table_title)
		}))
		Access.setAccessTime()
		return view.ret('Данные очищены')
	})
	meta.addAction('set-prices-clear', async view => {
		await view.get('admin')
		const { upload, name } = await view.gets(['upload', 'name'])
		const row = await upload.clearPrice(name)
		view.ans.row = row
		Access.setAccessTime()
		return view.ret('Очищено')
	})
	meta.addAction('set-prices-load', async view => {
		await view.get('admin')
		const { upload, name } = await view.gets(['upload','name'])
		
		const row = await upload.loadPrice(name)
		view.ans.row = row
		
		Access.setAccessTime()
		return view.ret('Внесено ' + row.quantity)
	})
	meta.addAction('set-prices-loadall', async view => {
		await view.get('admin')
		const { upload } = await view.gets(['upload'])
		const files = await upload.getNewPrices()
		let count = 0
		await Promise.all(files.map(async of => {
			const { quantity = 0 } = await upload.loadPrice(of.name)
			count += quantity
		}))
		Access.setAccessTime()
		return view.ret('Внесено ' + count)
	})
	meta.addAction('set-files-loadall', async view => {
		await view.get('admin')
		const { visitor, db, config, upload } = await view.gets(['visitor', 'db', 'config', 'upload'])

		const parts = {}
		let part, count = 0

		
		part = 'groupicons'
		await db.changedRows(`
			UPDATE
				showcase_groups
			SET
				icon = null
		`)
		parts[part] = await Files.readdirDeep(visitor, config[part])
		await Files.filterDeep(parts[part], async (dirinfo, fileinfo, level) => {
			if (!~Files.exts.image.indexOf(fileinfo.ext)) return false
			const src = dirinfo.dir+fileinfo.file	
			const group_nick = nicked(fileinfo.name)
			const is = await db.changedRows(`
				UPDATE
					showcase_groups
				SET
					icon = :src
				WHERE
					group_nick = :group_nick
				`, {group_nick, src})
			if (is) count++
			return false
		})

		part = 'brandlogos'
		await db.changedRows(`
			UPDATE
				showcase_brands
			SET
				logo = null
		`)
		parts[part] = await Files.readdirDeep(visitor, config[part])
		await Files.filterDeep(parts[part], async (dirinfo, fileinfo, level) => {
			if (!~Files.exts.image.indexOf(fileinfo.ext)) return false
			const src = dirinfo.dir+fileinfo.file	
			const brand_nick = nicked(fileinfo.name)
			const is = await db.changedRows(`
				UPDATE
					showcase_brands
				SET
					logo = :src
				WHERE
					brand_nick = :brand_nick
				`, {brand_nick, src})
			if (is) count++
			return false
		})

		const props = {}
		props.images = await upload.receiveProp('images')
		props.files = await upload.receiveProp('files')
		props.texts = await upload.receiveProp('texts')
		props.videos = await upload.receiveProp('videos')
		props.slides = await upload.receiveProp('slides')
		props.art = await upload.receiveProp('Арт')


		// part = 'videos'
		// parts[part] = await Files.readdirDeep(visitor, config[part])
		// for (const root of parts[part].dirs) {
		// 	const brand_nick = nicked(root.name)
		// 	const brand_id = await db.col('SELECT brand_id FROM showcase_brands where brand_nick = :brand_nick', {brand_nick})
		// 	if (!brand_id) continue
		// 	await Files.filterDeep(root, async (dirinfo, fileinfo, level) => {
		// 		if (!~Files.exts.video.indexOf(fileinfo.ext)) return false
		// 		const src = nicked(dirinfo.dir + fileinfo.file)
		// 		const is = await db.col('SELECT 1 FROM showcase_values where value_nick = :src LIMIT 1', {src})
		// 		if (is) return false
		// 		return true
		// 	})
		// }

		// part = 'texts'
		// parts[part] = await Files.readdirDeep(visitor, config[part])
		// for (const root of parts[part].dirs) {
		// 	const brand_nick = nicked(root.name)
		// 	const brand_id = await db.col('SELECT brand_id FROM showcase_brands where brand_nick = :brand_nick', {brand_nick})
		// 	if (!brand_id) continue
		// 	await Files.filterDeep(root, async (dirinfo, fileinfo, level) => {
		// 		if (!~Files.exts.text.indexOf(fileinfo.ext)) return false
		// 		const src = nicked(dirinfo.dir + fileinfo.file)
		// 		const is = await db.col('SELECT 1 FROM showcase_values where value_nick = :src LIMIT 1', {src})
		// 		if (is) return false
		// 		return true
		// 	})
		// }

		// part = 'files'
		// parts[part] = await Files.readdirDeep(visitor, config[part])
		// for (const root of parts[part].dirs) {
		// 	const brand_nick = nicked(root.name)
		// 	const brand_id = await db.col('SELECT brand_id FROM showcase_brands where brand_nick = :brand_nick', {brand_nick})
		// 	if (!brand_id) continue
		// 	await Files.filterDeep(root, async (dirinfo, fileinfo, level) => {
		// 		if (!~Files.exts.file.indexOf(fileinfo.ext)) return false
		// 		const src = nicked(dirinfo.dir + fileinfo.file)
		// 		const is = await db.col('SELECT 1 FROM showcase_values where value_nick = :src LIMIT 1', {src})
		// 		if (is) return false
		// 		return true
		// 	})
		// }


		// part = 'slides'
		// parts[part] = await Files.readdirDeep(visitor, config[part])
		// for (const root of parts[part].dirs) {
		// 	const brand_nick = nicked(root.name)
		// 	const brand_id = await db.col('SELECT brand_id FROM showcase_brands where brand_nick = :brand_nick', {brand_nick})
		// 	if (!brand_id) continue
		// 	await Files.filterDeep(root, async (dirinfo, fileinfo, level) => {
		// 		if (!~Files.exts.image.indexOf(fileinfo.ext)) return false
		// 		const src = nicked(dirinfo.dir + fileinfo.file)
		// 		const is = await db.col('SELECT 1 FROM showcase_values where value_nick = :src LIMIT 1', {src})
		// 		if (is) return false
		// 		return true
		// 	})
		// }

		// part = 'folders'
		// parts[part] = await Files.readdirDeep(visitor, config[part])
		// for (const root of parts[part].dirs) {
		// 	const brand_nick = nicked(root.name)
		// 	const brand_id = await db.col('SELECT brand_id FROM showcase_brands where brand_nick = :brand_nick', {brand_nick})
		// 	if (!brand_id) continue
		// 	await Files.filterDeep(root, async (dirinfo, fileinfo, level) => {
		// 		//В папке любой файл должен быть связан вне зависимости от расширения
		// 		const src = nicked(dirinfo.dir + fileinfo.file)
		// 		const is = await db.col('SELECT 1 FROM showcase_values where value_nick = :src LIMIT 1', {src})
		// 		if (is) return false
		// 		return true
		// 	})
		// }


		part = 'images'
		await db.changedRows(`
			DELETE FROM showcase_iprops
			WHERE prop_id = :prop_id
		`, props[part])
		parts[part] = await Files.readdirDeep(visitor, config[part])
		for (const root of parts[part].dirs) {
			const brand_nick = nicked(root.name)
			const brand_id = await db.col('SELECT brand_id FROM showcase_brands where brand_nick = :brand_nick', {brand_nick})
			if (!brand_id) continue
			await Files.filterDeep(root, async (dirinfo, fileinfo, level) => {
				if (!~Files.exts.image.indexOf(fileinfo.ext)) return false
				const model_nick = nicked(fileinfo.name)
				let model_id = await db.col('SELECT model_id FROM showcase_models WHERE brand_id = :brand_id and model_nick = :model_nick', {model_nick, brand_id})
				let item_num = null
				let res
				if (!model_id) {
					const value_id = await db.col('SELECT value_id FROM showcase_values WHERE value_nick = :model_nick', {model_nick})
					if (!value_id) return false
					res = await db.all(`
						SELECT m.model_id, ip.item_num 
						FROM showcase_iprops ip, showcase_models m
						WHERE 
						ip.model_id = m.model_id and m.brand_id = :brand_id
						and ip.value_id = :value_id and ip.prop_id = :prop_id
					`, {value_id, prop_id:props.art.prop_id, brand_id})
					if (!res.length) return false

				} else {
					res = await db.all('SELECT model_id, item_num FROM showcase_items WHERE model_id = :model_id', {model_id})
				}

				const src = dirinfo.dir + fileinfo.file
				const value = upload.receiveValue(src)
				for (const item of res) {

					const is = await db.changedRows(`
						INSERT INTO
							showcase_iprops
						SET
							value_id = :value_id,
							model_id = :model_id,
							prop_id = :prop_id
					`, {...item, ...value, ...props[part]})
					count++
				}
				
				return false
			})
		}
		
		return view.ret('Связано ' + count)
	})
}