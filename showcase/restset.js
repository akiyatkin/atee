import { Files } from "/-showcase/Files.js"
import { Excel } from "/-showcase/Excel.js"
import fs from "fs/promises"

import { nicked } from '/-nicked/nicked.js'
import { unique } from '/-nicked/unique.js'

import { whereisit } from '/-controller/whereisit.js'
const { FILE_MOD_ROOT, IMPORT_APP_ROOT } = whereisit(import.meta.url)

export const restset = (meta) => {
	meta.addAction('set-reset', async view => {
		await view.gets(['admin','start'])
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
			showcase_iprops
		`)
		
		const src = FILE_MOD_ROOT + '/update.sql'
		const sql = await fs.readFile(src).then(buffer => buffer.toString())
		const sqls = sql.split(';')
		const promises = sqls.map(sql => {
			sql = sql.trim()
			if (!sql) return Promise.resolve()
			return db.exec(sql)
		})
		
		await Promise.all(promises)
		
		return view.ret('База пересоздана')
	})
	meta.addAction('set-brands-clearempty', async view => {
		await view.gets(['admin','start'])
		const { db } = await view.gets(['db'])
		await db.changedRows(`
			DELETE b
			FROM showcase_brands b
			LEFT JOIN showcase_models m on m.brand_id = b.brand_id
			WHERE m.brand_id is null
		`)
		return view.ret('Удалено')
	})
	meta.addAction('set-groups-clearempty', async view => {
		await view.gets(['admin','start'])
		const { db } = await view.gets(['db'])

		
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
		
		return view.ret('Удалено')
	})
	meta.addAction('set-brands-move', async view => {
		await view.gets(['admin','start'])
		const { db, before_id, after_id } = await view.gets(['db','before_id','after_id'])
		await db.start()
		const brands = await db.all(`
			SELECT 
				p.brand_id,
				p.ordain
			FROM showcase_brands p
			ORDER by ordain
		`)
		let ordain = 0
		let before, after
		brands.forEach(brand => {
			if (brand.brand_id == after_id) after = brand
			if (brand.brand_id == before_id) before = brand
			ordain = ordain + 2
			brand.ordain = ordain
		})
		if (!before || !after) return view.err('Не найдены свойства')
		before.ordain = after.ordain - 1

		for (const brand of brands) {
			await db.changedRows(`
				UPDATE
					showcase_brands 
				SET
					ordain = :ordain
				WHERE brand_id = :brand_id
			`, brand)
		}
	
		await db.commit()
		return view.ret('Перенесено')
	})
	meta.addAction('set-groups-move', async view => {
		await view.gets(['admin','start'])
		const { db, before_id, after_id } = await view.gets(['db','before_id','after_id'])
		await db.start()
		const groups = await db.all(`
			SELECT 
				p.group_id,
				p.ordain
			FROM showcase_groups p
			ORDER by ordain
		`)
		let ordain = 0
		let before, after
		groups.forEach(group => {
			if (group.group_id == after_id) after = group
			if (group.group_id == before_id) before = group
			ordain = ordain + 2
			group.ordain = ordain
		})
		if (!before || !after) return view.err('Не найдены свойства')
		before.ordain = after.ordain - 1

		for (const group of groups) {
			await db.changedRows(`
				UPDATE
					showcase_groups 
				SET
					ordain = :ordain
				WHERE group_id = :group_id
			`, group)
		}
	
		await db.commit()
		return view.ret('Перенесено')
	})
	meta.addAction('set-props-move', async view => {
		await view.gets(['admin','start'])
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
		
		await db.commit()
		return view.ret('Упорядочено')
	})
	meta.addAction('set-values-clearempty', async view => {
		await view.gets(['admin','start'])
		const { db } = await view.gets(['db'])
		await db.changedRows(`
			DELETE v
			FROM showcase_values v
			LEFT JOIN showcase_iprops ip on ip.value_id = v.value_id
			WHERE ip.value_id is null
		`)
		return view.ret('Удалено')
	})
	meta.addAction('set-props-clearempty', async view => {
		await view.gets(['admin','start'])
		const { db } = await view.gets(['db'])
		await db.changedRows(`
			DELETE p
			FROM showcase_props p
			LEFT JOIN showcase_iprops ip on ip.prop_id = p.prop_id
			WHERE ip.prop_id is null
		`)
		return view.ret('Удалено')
	})
	meta.addAction('set-models-clearempty', async view => {
		await view.gets(['admin','start'])
		const { db } = await view.gets(['db'])
		
		const models = await db.all(`
			DELETE m
			FROM showcase_groups g, showcase_brands b, showcase_models m
			LEFT JOIN showcase_items i on i.model_id = m.model_id
			WHERE m.brand_id = b.brand_id and g.group_id = m.group_id and i.model_id is null
		`)
		
		return view.ret('Удалено')
	})


	meta.addAction('set-tables-loadall', async view => {
		await view.gets(['admin','start'])
		const { db, upload } = await view.gets(['db', 'upload'])
		
		const files = await upload.getNewTables()
		let count = 0
		await Promise.all(files.map(async of => {
			const { quantity = 0 } = await upload.loadTable(of.name)
			count += quantity
		}))
		view.ans.count = count
		
		return view.ret('Внесено ' + count)
	})

	meta.addAction('set-prices-clearall', async view => {
		await view.gets(['admin','start'])
		const { upload, db } = await view.gets(['upload', 'db'])
		const rows = await db.all(`
			SELECT
				price_title
			FROM showcase_prices
		`)
		await Promise.all(rows.map(({price_title}) => {
			return upload.clearPrice(price_title)
		}))
		return view.ret('Прайсы очищены')
	})
	meta.addAction('set-tables-clearall', async view => {
		await view.gets(['admin','start'])
		const { upload, db } = await view.gets(['upload', 'db'])
		
		await upload.clearAllTable()
		// const rows = await db.all(`
		// 	SELECT
		// 		table_title
		// 	FROM showcase_tables
		// `)
		// await Promise.all(rows.map(({table_title}) => {
		// 	return upload.clearTable(table_title)
		// }))
		
		return view.ret('Данные очищены')
	})

	meta.addAction('set-tables-clear', async view => {
		await view.gets(['admin','start'])
		const { upload, name } = await view.gets(['upload', 'name'])
		view.ans.name = name
		const row = await upload.clearTable(name)
		row.ready = false
		view.ans.row = row
		return view.ret('Очищено')
	})
	meta.addAction('set-tables-load', async view => {
		await view.gets(['admin','start'])
		const { upload, name } = await view.gets(['upload','name'])
		view.ans.name = name
		const row = await upload.loadTable(name)
		row.ready = true
		view.ans.row = row
		return view.ret('Внесено ' + row.quantity)
	})
	meta.addAction('set-prices-clear', async view => {
		await view.gets(['admin','start'])
		const { upload, name } = await view.gets(['upload', 'name'])
		view.ans.name = name
		const row = await upload.clearPrice(name)
		row.ready = false
		view.ans.row = row
		
		return view.ret('Очищено')
	})
	meta.addAction('set-prices-load', async view => {
		await view.gets(['admin','start'])
		const { upload, name } = await view.gets(['upload','name'])
		view.ans.name = name
		const row = await upload.loadPrice(name)
		row.ready = true
		view.ans.row = row
		return view.ret('Внесено ' + row.quantity)
	})


	meta.addAction('set-applyall', async view => {
		await view.gets(['admin','start'])
		const { db, upload } = await view.gets(['db','upload'])
		
		let count = 0
		
		await (async () => {
			const files = await upload.getNewTables()
			await Promise.all(files.map(async of => {
				const { quantity = 0 } = await upload.loadTable(of.name)
				count += quantity
			}))
		})()
		await (async () => {
			const files = await upload.getNewPrices()
			await Promise.all(files.map(async of => {
				const { quantity = 0 } = await upload.loadPrice(of.name)
				count += quantity
			}))
		})()

		const {doublepath, count:countfiles} = await upload.loadAllFiles()		

		
		view.ans.count = count + countfiles
		return view.ret('Внесено ' + count + ', файлов ' + countfiles)
	})
	meta.addAction('set-prices-loadall', async view => {
		await view.gets(['admin','start'])
		const { db, upload } = await view.gets(['db','upload'])
		const files = await upload.getNewPrices()
		let count = 0
		await Promise.all(files.map(async of => {
			const { quantity = 0 } = await upload.loadPrice(of.name)
			count += quantity
		}))
		
		view.ans.count = count
		return view.ret('Внесено ' + count)
	})
	meta.addAction('set-files-loadall', async view => {
		await view.gets(['admin','start'])
		const { visitor, db, config, upload } = await view.gets(['visitor', 'db', 'config', 'upload'])

		
		const {doublepath, count} = await upload.loadAllFiles()		
		
		view.ans.doublepath = doublepath
		view.ans.count = count
		return view.ret('Связано ' + count)
	})
}