
import { Files } from "/-showcase/Files.js"
import { Access } from "/-controller/Access.js"
import { Excel } from "/-showcase/Excel.js"
import fs from "fs/promises"
import { whereisit } from '/-controller/whereisit.js'
import { nicked } from '/-nicked/nicked.js'
import { unique } from '/-nicked/unique.js'


const { FILE_MOD_ROOT, IMPORT_APP_ROOT } = whereisit(import.meta.url)

export const restset = (meta) => {
	meta.addAction('set-reset', async view => {
		const { db } = await view.gets(['db','admin'])

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
		db.start()
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
		
		
		return view.ret('База пересоздана')
	})
	
	meta.addAction('set-models-clearempty', async view => {
		const { db } = await view.gets(['db','admin'])
		const models = await db.all(`
			DELETE
				m
			FROM showcase_groups g, showcase_brands b, showcase_models m
			LEFT JOIN showcase_items i on i.model_id = m.model_id
			WHERE m.brand_id = b.brand_id and g.group_id = m.group_id and i.model_id is null
		`)
		Access.setAccessTime()
		return view.ret('Удалено')
	})

	meta.addAction('set-tables-clear', async view => {
		const { db, name } = await view.gets(['db','admin', 'name'])
		const table_nick = nicked(name)
		const table_id = await db.col('SELECT table_id from showcase_tables where table_nick = :table_nick', { table_nick })
		if (!table_id) return view.err('Данные не найдены')
		await db.changedRows(`
			DELETE i, ip FROM showcase_items i, showcase_iprops ip 
			WHERE i.model_id = ip.model_id and i.item_num = ip.item_num and i.table_id = :table_id
		`, { table_id })
		
		await db.changedRows(`
			UPDATE
				showcase_tables 
			SET
				loaded = 0
			WHERE table_id = :table_id
		`, { table_id })
		Access.setAccessTime()
		return view.ret('Очищено')
	})
	meta.addAction('set-tables-load', async view => {
		const { options, upload, db, config, name } = await view.gets(['options', 'upload', 'db','admin', 'config','name'])

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
		let duration = Date.now()
		const dir = config.tables
		const file = await Files.getFileName(view, dir, name, ['xlsx'])
		const {groups, models, sheets, brands} = await Excel.load(dir + file, name)
		const values = {}
		const props = {}
		const table_name = name
		const table_nick = nicked(name)
		for (const brandmod in models) {
			const items = models[brandmod]
			items.forEach(item => {
				const sheet_title = item[item.length - 1] //Последняя запись это имя листа sheet_title
				const { descr, heads, indexes } = sheets[sheet_title]
				heads.head_titles.forEach((prop_title, i) => {
					const prop_nick = heads.head_nicks[i]
					props[prop_nick] = { 
						prop_nick, 
						prop_title, 
						ordain: i 
					}
				})

				item.forEach((value_title,i) => {
					if (value_title === null) return
					if (~options.number_nicks.indexOf(heads.head_nicks[i])) return
					if (~options.text_nicks.indexOf(heads.head_nicks[i])) return
					const value_nick = nicked(value_title)
					values[value_title] = { 
						value_title,
						value_nick 
					}
				})
			})
		}

		
		const table_id = await db.insertId(`
			INSERT INTO 
				showcase_tables 
			SET
				table_name = :table_name,
				table_nick = :table_nick, 
				loaded = 0
			ON DUPLICATE KEY UPDATE
				table_name = :table_name,
			 	table_id = LAST_INSERT_ID(table_id),
			 	loaded = 0
		`, {
			table_name: table_name,
			table_nick: table_nick
		})


		//console.log(table_id)
		//return view.ret()
		for (const prop_nick in props) {
			const pr = props[prop_nick]
			pr.type = 'value'
			if (~options.number_nicks.indexOf(prop_nick)) pr.type = 'number'
			if (~options.text_nicks.indexOf(prop_nick)) pr.type = 'text'
			pr.prop_id = await db.insertId(`
				INSERT INTO 
					showcase_props 
				SET
					type = :type,
					prop_title = :prop_title,
					prop_nick = :prop_nick,
					ordain = :ordain
				ON DUPLICATE KEY UPDATE
					type = :type,
				 	prop_id = LAST_INSERT_ID(prop_id)
			`, pr)
		}

		for (const value_title in values) {
			const value = values[value_title]
			value.value_id = await db.insertId(`
				INSERT INTO 
					showcase_values
				SET
					value_title = :value_title,
					value_nick = :value_nick
				ON DUPLICATE KEY UPDATE
				 	value_id = LAST_INSERT_ID(value_id)
			`, value)
		}
		
		



		let ordain = 1
		for (const brand_nick in brands) {
			const brand = brands[brand_nick]
			brand.brand_id = await db.insertId(`
				INSERT INTO 
					showcase_brands 
				SET
					brand_title = :brand_title,
					brand_nick = :brand_nick,
					ordain = :ordain
				ON DUPLICATE KEY UPDATE
				 	brand_id = LAST_INSERT_ID(brand_id)
			`, brand)

		}
		
		ordain = 1
		for (const group_nick in groups) {
			const group = groups[group_nick]
			group.ordain = ++ordain;
			group.parent_id = group.parent_nick ? groups[group.parent_nick].group_id : null
			group.group_id = await db.insertId(`
				INSERT INTO 
					showcase_groups 
				SET
					group_title = :group_title,
					parent_id = :parent_id, 
					group_nick = :group_nick, 
					ordain = :ordain
				ON DUPLICATE KEY UPDATE
				 	group_id = LAST_INSERT_ID(group_id)
			`, group) //group_title, ordain, group_id не меняются. Сохраняются при очистке базы данных. 
		}
		let quantity = 0

		await db.start()
		await db.changedRows(`
			DELETE i, ip FROM showcase_items i, showcase_iprops ip 
			WHERE i.model_id = ip.model_id and i.item_num = ip.item_num and i.table_id = :table_id
		`, { table_id })
		for (const brandmod in models) {
			const items = models[brandmod]
			const item = items[0]
			const sheet_title = item[item.length - 1] //Последняя запись это имя листа sheet_title
			const { descr, heads, indexes } = sheets[sheet_title]
			const model_title = item[indexes.model_title]
			const model_nick = item[indexes.model_nick]
			const brand_nick = item[indexes.brand_nick]
			const group_nick = item[indexes.group_nick]
			const brand_id = brands[brand_nick].brand_id
			const group_id = groups[group_nick].group_id

			let search = []
			items.forEach(async (item) => {
				search.push(item.join('-'))
			})
			search = nicked(search.join('-'))
			search = search.split('-')
			search = unique(search)
			search = search.join(' ')

			const model_id = await db.insertId(`
				INSERT INTO 
					showcase_models
				SET
					model_title = :model_title,
					model_nick = :model_nick,
					brand_id = :brand_id,
					group_id = :group_id,
					search = :search
				ON DUPLICATE KEY UPDATE
					search = :search,
				 	model_id = LAST_INSERT_ID(model_id)
			`, {model_title, model_nick, brand_id, group_id, search})


			let item_num = await db.col(`
				SELECT max(item_num) 
				FROM showcase_items
				WHERE model_id = :model_id
			`, { model_id }) || 0
			await Promise.all(items.map(async (item, ordain) => {
				quantity++
				const myitem_num = ++item_num
				ordain++
				await db.exec(`
					INSERT INTO 
						showcase_items
					SET
						model_id = :model_id,
						item_num = :item_num,
						ordain = :ordain,
						table_id = :table_id
				`, { model_id, item_num, ordain, table_id })

				// `model_id` MEDIUMINT unsigned NOT NULL COMMENT '',
				// `item_num` SMALLINT unsigned NOT NULL COMMENT '',
				// `ordain` SMALLINT unsigned COMMENT 'Порядковый номер строки в таблице',
				// `table_id` SMALLINT unsigned COMMENT '',
				await Promise.all(item.map(async (value_title, i) => {
					if (value_title === null) return
					if (~[
						indexes.brand_title, 
						indexes.brand_nick,
						indexes.model_title, 
						indexes.model_nick,
						indexes.group_nick, 
						indexes.sheet_title
					].indexOf(i)) return
					const prop_nick = heads.head_nicks[i]
					const {prop_id, type} = props[prop_nick]
					let value_id = null
					let text = null
					let number = null
					if (type == 'value') {
						value_id = values[value_title].value_id
					} else if (type == 'text') {
						text = value_title
					} else if (type == 'number') {
						number = value_title - 0
					}
					await db.exec(`
						INSERT INTO 
							showcase_iprops
						SET
							model_id = :model_id,
							item_num = :item_num,
							prop_id = :prop_id,
							text = :text,
							number = :number,
							value_id = :value_id
					`, { model_id, item_num:myitem_num, prop_id, text, number, value_id })
				}))
			}))
		}
		duration = Date.now() - duration
		await db.changedRows(`
			UPDATE
				showcase_tables 
			SET
				duration = :duration, 
				loadtime = now(),
				quantity = :quantity,
				loaded = 1
			WHERE table_id = :table_id
		`, {
			duration,
			table_id,
			quantity
		})	
		await db.commit()
		Access.setAccessTime()
		return view.ret('Внесено ' + quantity)
	})
}