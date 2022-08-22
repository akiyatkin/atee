import { Files } from "/-showcase/Files.js"
import { Access } from "/-controller/Access.js"
import { Excel } from "/-showcase/Excel.js"
import fs from "fs/promises"
import { nicked } from '/-nicked/nicked.js'
import { unique } from '/-nicked/unique.js'

export class Upload {
	constructor (opt) {
		this.opt = opt //{ visitor, options, view, db, config }
	}
	async getNewTables() {
		const { visitor, options, view, db, config } = this.opt
		let files = await Files.readdirext(visitor, config['tables'], ['xlsx']) //{ name, ext, file }
		const rows = await db.all(`
			SELECT 
				table_nick,
				unix_timestamp(loadtime)*1000 as loadtime
			FROM showcase_tables
			WHERE loaded = 1
		`)
		files = files.filter(of => {
			const row = rows.find(row => row.table_nick == nicked(of.name))
			if (!row) return true
			if (row.loadtime < of.mtime) return true
			return false
		})
		return files
	}
	async getNewPrices() {
		const { visitor, options, view, db, config } = this.opt
		let files = await Files.readdirext(visitor, config['prices'], ['xlsx']) //{ name, ext, file }
		const rows = await db.all(`
			SELECT 
				price_nick,
				unix_timestamp(loadtime)*1000 as loadtime
			FROM showcase_prices
			WHERE loaded = 1
		`)
		files = files.filter(of => {
			const row = rows.find(row => row.price_nick == nicked(of.name))
			if (!row) return true
			if (row.loadtime < of.mtime) return true
			return false
		})
		return files
	}
	async receiveValue(value_title) {
		const { visitor, options, db } = this.opt
		const value = {
			value_title,
			value_nick: nicked(value_title)
		}
		value.value_id = await db.insertId(`
			INSERT INTO 
	 			showcase_values
	 		SET
	 			value_title = :value_title,
	 			value_nick = :value_nick
	 		ON DUPLICATE KEY UPDATE
	 		 	value_id = LAST_INSERT_ID(value_id)
	 	`, value)
	 	return value
	}
	async receiveProp(prop_title) {
		const { visitor, options, db } = this.opt
		return visitor.once('receiveProp', [prop_title], async (prop_title) => {
			const prop = {
				prop_title,
				prop_nick: nicked(prop_title)
			}
			prop.type = 'value'
			if (~options.number_nicks.indexOf(prop.prop_nick)) prop.type = 'number'
			if (~options.text_nicks.indexOf(prop.prop_nick)) prop.type = 'text'
			prop.ordain = await db.col('select max(ordain) from showcase_props') || 1
			prop.prop_id = await db.insertId(`
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
			`, prop)
			return prop
		})
		
	}
	async clearTable (table_title) {
		const { visitor, options, view, db, config } = this.opt
		const table_nick = nicked(table_title)
		await db.start()
		const row = await db.fetch(`
			SELECT table_id,
				table_title,
				table_nick,
				unix_timestamp(loadtime)*1000 as loadtime,
				quantity,
				duration 
			FROM showcase_tables 
			WHERE table_nick = :table_nick
		`, { table_nick })
		const table_id = row.table_id
		if (!table_id) return view.err('Данные не найдены')
		await db.changedRows(`
			DELETE i, ip FROM showcase_items i, showcase_iprops ip 
			WHERE i.model_id = ip.model_id and i.item_num = ip.item_num and i.table_id = :table_id
		`, { table_id })
		const dir = config.tables
		const file = await Files.getFileName(visitor, dir, table_title, ['xlsx'])
		if (file) {
			await db.changedRows(`
				UPDATE
					showcase_tables
				SET
					loaded = 0
				WHERE table_id = :table_id
			`, { table_id })
		} else {
			await db.changedRows(`
				DELETE FROM	showcase_tables
				WHERE table_id = :table_id
			`, { table_id })
		}
		await db.commit()
		return row
	}
	async clearPrice (price_title) {
		const { visitor, options, view, db, config } = this.opt
		const upload = this
		const price_nick = nicked(price_title)
		
		const row = await db.fetch(`
			SELECT price_id,
				price_title,
				price_nick,
				unix_timestamp(loadtime)*1000 as loadtime,
				quantity,
				duration 
			FROM showcase_prices where price_nick = :price_nick
		`, { price_nick })
		const price_id = row.price_id
		if (!price_id) return view.err('Данные не найдены')


		await db.changedRows(`
			DELETE ip FROM showcase_iprops ip 
			WHERE ip.price_id = :price_id
		`, { price_id })
		const dir = config.prices
		const file = await Files.getFileName(visitor, dir, price_title, ['xlsx'])
		if (file) {
			await db.changedRows(`
				UPDATE
					showcase_prices
				SET
					loaded = 0
				WHERE price_id = :price_id
			`, { price_id })
		} else {
			await db.changedRows(`
				DELETE FROM	showcase_prices
				WHERE price_id = :price_id
			`, { price_id })
			
		}
		return row
	}
	async loadPrice (price_title) {
		const { visitor, options, view, db, config } = this.opt
		const upload = this
		const price_nick = nicked(price_title)
		let duration = Date.now()
		const dir = config.prices
		const file = await Files.getFileName(visitor, dir, price_title, ['xlsx'])
		const conf = options.prices[price_title] || { }
		conf.synonyms ??= {}
		conf.props ??= ['Цена']
		conf.priceprop ??= 'Артикул'
		conf.catalogprop ??= 'Модель'
		
		conf.props.slice().reverse().forEach(prop => {
			conf.synonyms[prop] ??= []
			conf.synonyms[prop].push(prop)
		})
		conf.synonyms[conf.priceprop] ??= []
		conf.synonyms[conf.priceprop].push(conf.priceprop)
		

		const { sheets } = await Excel.loadPrice(dir + file, conf)
		let quantity = 0
		
		const price = {price_title, price_nick}
		price.price_id = await db.insertId(`
			INSERT INTO 
				showcase_prices 
			SET
				price_title = :price_title,
				price_nick = :price_nick, 
				loaded = 0
			ON DUPLICATE KEY UPDATE
				price_title = :price_title,
			 	price_id = LAST_INSERT_ID(price_id),
			 	loaded = 0
		`, price)
		await db.changedRows(`
			DELETE ip FROM showcase_iprops ip 
			WHERE ip.price_id = :price_id
		`, price)
		
		const brand_id = false
		if (conf.brand) {
			const brand_nick = nicked(conf.brand)
			const brand_id = await db.col('SELECT brand_id FROM showcase_brands WHERE brand_nick = :brand_nick', {brand_nick})
			if (!brand_id) return false
		}

		const catalogprop = await upload.receiveProp(conf.catalogprop)
		if (catalogprop.type == 'text') return false //Соединение только по типу value или number

		
		for (const {heads: {head_titles, head_nicks}, rows} of sheets) {
			//Ищем ключ который есть в прайсе и по нему будем брать значение для связи
			const priceprop_title = conf.synonyms[conf.priceprop].find(prop => ~head_titles.indexOf(prop))
			if (!priceprop_title) break
			const priceprop_nick = nicked(priceprop_title)
			const priceprop_index = head_nicks.indexOf(priceprop_nick)
			
			const props = [] //Нужно найти индексы для тех свойств которые нужно записать
			for (const prop_title of conf.props) {
				const prop = { prop_title }
				for (const title of conf.synonyms[prop_title]) {
					const i = head_titles.indexOf(title)
					if (~i) {
						prop.index = i
						props.push(prop)
						break
					}
				}
			}
			for (const row of rows) {
				const key_title = row[priceprop_index]
				if (!key_title) break
				const key_nick = nicked(key_title)
				
				let item = false
				if (catalogprop.type == 'value') {
					const value_id = await db.col('SELECT value_id FROM showcase_values WHERE value_nick = :value_nick', {value_nick: key_nick })
					if (!brand_id) {
						item = await db.fetch(`
							SELECT ip.model_id, ip.item_num 
							FROM showcase_iprops ip
							WHERE ip.prop_id = :keyprop_id and ip.value_id = :value_id
						`, {keyprop_id: catalogprop.prop_id, value_id})
					} else {
						item = await db.fetch(`
							SELECT ip.model_id, ip.item_num 
							FROM showcase_models m
							LEFT JOIN showcase_iprops ip on m.model_id = ip.model_id
							WHERE ip.prop_id = :keyprop_id 
								and ip.value_id = :value_id
								and m.brand_id = :brand_id
						`, {brand_id, keyprop_id: catalogprop.prop_id, value_id})
					}
				} else if (catalogprop.type == 'number') {
					if (!brand_id) {
						item = await db.fetch(`
							SELECT ip.model_id, ip.item_num 
							FROM showcase_iprops ip
							WHERE ip.prop_id = :keyprop_id 
								and ip.number = :number
						`, {keyprop_id: catalogprop.prop_id, number: key_nick})
					} else {
						item = await db.fetch(`
							SELECT ip.model_id, ip.item_num 
							FROM showcase_models m
							LEFT JOIN showcase_iprops ip on m.model_id = ip.model_id
							WHERE ip.prop_id = :keyprop_id 
								and ip.number = :number
								and m.brand_id = :brand_id
						`, {brand_id, keyprop_id: catalogprop.prop_id, number: key_nick})
					}
					
				}
				if (!item) continue

				for (const {prop_title, index} of props) {
					//Свойства которые нужно записать ищем их по синонимам
					const prop = await upload.receiveProp(prop_title)
					const value_title = row[index]
					if (!value_title) continue //Пустое значение.. с прайсом итак было удалено
					
					const fillings = []
					let value_id = null
					let text = null
					let number = null

					if (prop.type == 'value') {
						const values = value_title.split(",")
						for (const value of values) {
							const value_nick = nicked(value_title)
							if (!value_nick) continue
							value_id = await db.insertId(`
								INSERT INTO 
						 			showcase_values
						 		SET
						 			value_title = :value_title,
						 			value_nick = :value_nick
						 		ON DUPLICATE KEY UPDATE
						 		 	value_id = LAST_INSERT_ID(value_id)
						 	`, { value_nick, value_title })
							fillings.push({value_id, text, number})
						}
					} else if (prop.type == 'text') {
						text = value_title
						fillings.push({value_id, text, number})
					} else if (prop.type == 'number') {
						if (typeof(value_title ) == 'string') {
							const numbers = value_title.split(",")	
							for (const num of numbers) {
								number = nicked(num)
								if (number === '') continue
								fillings.push({value_id, text, number})
							}
						}
						
						number = value_title - 0
					}

					for (const fill of fillings) {
						await db.exec(`
							INSERT INTO 
								showcase_iprops
							SET
								model_id = :model_id,
								item_num = :item_num,
								prop_id = :prop_id,
								text = :text,
								price_id = :price_id,
								number = :number,
								value_id = :value_id
						`, { ...item, prop_id:prop.prop_id, ...fill, price_id:price.price_id })
					}
					
				}
				quantity++
			}
		}
		duration = Date.now() - duration
		await db.changedRows(`
			UPDATE
				showcase_prices 
			SET
				duration = :duration, 
				loadtime = now(),
				quantity = :quantity,
				loaded = 1
			WHERE price_id = :price_id
		`, {
			duration,
			price_id:price.price_id,
			quantity
		})	
		
		return { quantity, duration, loadtime:Date.now(), loaded:1 }
	}
	async loadTable (name) {
		const { visitor, options, view, db, config } = this.opt
		let duration = Date.now()
		const dir = config.tables
		const file = await Files.getFileName(visitor, dir, name, ['xlsx'])
		if (!file) return false
		const {groups, models, sheets, brands} = await Excel.loadTable(dir + file, name)
		const values = {}
		const props = {}
		const table_title = name
		const table_nick = nicked(name)

		for (const sheet_title in sheets) {
			const { descr, heads, indexes } = sheets[sheet_title]
			heads.head_titles.forEach((prop_title, i) => {
				const prop_nick = heads.head_nicks[i]
				if (~[
					indexes.model_title, 
					indexes.model_nick, 
					indexes.brand_title, 
					indexes.brand_nick,
					indexes.group_nick, 
					indexes.sheet_title 
				].indexOf(i)) return
				props[prop_nick] = { 
					prop_nick, 
					prop_title, 
					ordain: i
				}
			})
		}
		for (const brandmod in models) {
			const items = models[brandmod]
			items.forEach(item => {
				const sheet_title = item[item.length - 1] //Последняя запись это имя листа sheet_title
				const { descr, heads, indexes } = sheets[sheet_title]
				item.forEach((value_title, i) => {
					if (value_title === null) return
					if (~[
						indexes.model_title, 
						indexes.model_nick, 
						indexes.brand_title, 
						indexes.brand_nick,
						indexes.group_nick, 
						indexes.sheet_title 
					].indexOf(i)) return
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
				table_title = :table_title,
				table_nick = :table_nick, 
				loaded = 0
			ON DUPLICATE KEY UPDATE
				table_title = :table_title,
			 	table_id = LAST_INSERT_ID(table_id),
			 	loaded = 0
		`, {
			table_title: table_title,
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
					ordain = 1
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
		return { quantity, duration, loadtime:Date.now(), loaded:1 }
	}
}
