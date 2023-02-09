import Files from "/-showcase/Files.js"
import Access from "/-controller/Access.js"
import Excel from "/-showcase/Excel.js"
import fs from "fs/promises"
import nicked from '/-nicked/nicked.js'
import unique from '/-nicked/unique.js'
import cproc from '/-cproc'

export class Upload {
	constructor (opt) {
		opt.upload = this
		Object.assign(this, opt)//{ visitor, options, view, db, config, base }
	}
	async getAll(what) {
		const { visitor, config } = this
		let files = await Files.readdirext(visitor, config[what], ['xlsx']) //{ name, ext, file }
		const dir = config[what]
		await Promise.all(files.map(async (of) => {
			const stat = await fs.stat(dir + of.file)
			of.size = Math.round(stat.size / 1024 / 1024 * 100) / 100
			of.mtime = new Date(stat.mtime).getTime()
		}))
		return files
	}
	async getAllTables() {
		return this.getAll('tables')
	}
	async getNewTables() {
		const { upload, visitor, options, config, base, base: { db } } = this
		let files = await upload.getAll('tables')
		const rows = await db.all(`
			SELECT 
				table_nick,
				unix_timestamp(loadtime)*1000 as loadtime
			FROM showcase_tables
			WHERE loaded = 1
		`)

		files = files.filter(of => {
			const row = rows.find(row => row.table_nick == base.onicked(of.name))
			if (!row) return true
			if (row.loadtime < of.mtime) return true
			return false
		})
		return files
	}
	async getAllPrices() {
		return await this.getAll('prices')
	}
	async getNewPrices() {
		const { visitor, options, view, db, config, base } = this
		let files = await this.getAll('prices')
		const rows = await db.all(`
			SELECT 
				price_nick,
				unix_timestamp(loadtime)*1000 as loadtime
			FROM showcase_prices
			WHERE loaded = 1
		`)
		files = files.filter(of => {
			const row = rows.find(row => row.price_nick == base.onicked(of.name))
			if (!row) return true
			if (row.loadtime < of.mtime) return true
			return false
		})
		return files
	}
	


	



	async receiveValue(value_title) {
		const { visitor, options, db, base } = this
		const value = {
			value_title,
			value_nick: base.onicked(value_title)
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
		const { options, base, base: {db, vicache: cache} } = this
		return cache.konce('receiveProp', prop_title, async () => {
			const prop_nick = base.onicked(prop_title)
			const type = await base.getPropTypeByNick(prop_nick)
			const prop = { prop_title, prop_nick, type }
			prop.ordainforinsert = await db.col('select max(ordain) from showcase_props') || 1
			prop.prop_id = await db.insertId(`
				INSERT INTO 
					showcase_props 
				SET
					type = :type,
					prop_title = :prop_title,
					prop_nick = :prop_nick,
					ordain = :ordainforinsert
				ON DUPLICATE KEY UPDATE
					type = :type,
				 	prop_id = LAST_INSERT_ID(prop_id)
			`, prop)
			return prop
		})
		
	}
	async clearAllTable() {
		const { visitor, options, view, db, config } = this
		await db.changedRows(`
			DELETE i, ip FROM showcase_items i
			LEFT JOIN showcase_iprops ip on (i.model_id = ip.model_id and i.item_num = ip.item_num)
		`)
		const dir = config['tables']
		await db.changedRows(`
			UPDATE
				showcase_tables
			SET
				loaded = 0
		`)
	}
	async clearTable (table_title) {
		const { visitor, options, view, db, config, base } = this
		const table_nick = base.onicked(table_title)
		
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
		const dir = config['tables']
		const { file } = await Files.getFileInfo(visitor, dir, table_title, ['xlsx'])
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
		
		return row
	}
	async clearPrice (price_title) {
		const { upload, visitor, options, view, db, config, base } = this
		const price_nick = base.onicked(price_title)
		
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

		const searches = await db.colAll(`
			SELECT distinct m.model_id
			FROM showcase_models m, showcase_iprops ip
			WHERE ip.model_id = m.model_id
			and ip.price_id = :price_id
		`, { price_id })

		await db.changedRows(`
			DELETE ip FROM showcase_iprops ip 
			WHERE ip.price_id = :price_id
		`, { price_id })
		const dir = config['prices']
		const { file } = await Files.getFileInfo(visitor, dir, price_title, ['xlsx'])
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
		for (const model_id of searches) {
			const search = await upload.getSearch(model_id)
			await db.changedRows(`
				UPDATE
					showcase_models
				SET
					search = :search
				WHERE
				 	model_id = :model_id
			`, {model_id, search})
		}
		return row
	}
	async getSearch (model_id) {
		const { db, upload } = this
		const row = await db.fetch(`SELECT b.brand_nick, m.model_nick, g.group_nick 
			FROM showcase_models m, showcase_brands b, showcase_groups g
			WHERE m.model_id = :model_id and b.brand_id = m.brand_id and g.group_id = m.group_id 
		`,{ model_id })
		let search = Object.values(row)
		const iprops = await db.all(`
			SELECT distinct ip.number, ip.text, v.value_nick, p.prop_nick
			FROM showcase_iprops ip
			LEFT JOIN showcase_props p on ip.prop_id = p.prop_id
			LEFT JOIN showcase_values v on ip.value_id = v.value_id
			WHERE ip.model_id = :model_id
		`, { model_id })
		
		iprops.forEach((props) => {
			search.push(Object.values(props).filter(val => !!val).join('-'))
		})
		search = upload.prepareSearch(search)
		return search
	}
	async loadPrice (price_title) {
		const { upload, visitor, options, view, db, config, base } = this
		const price_nick = base.onicked(price_title)
		
		let duration = Date.now()
		let quantity = 0
		let count = 0
		const omissions = {}

		const dir = config['prices']
		const { file } = await Files.getFileInfo(visitor, dir, price_title, ['xlsx','js'])
		const conf = options.prices[price_title] || { }
		conf.synonyms ??= {}
		conf.props ??= ['Цена']
		conf.priceprop ??= 'Артикул'
		conf.catalogprop ??= 'Модель'
		conf.start ??= 0
		conf.starts ??= {}
		
		conf.props.slice().reverse().forEach(prop => {
			conf.synonyms[prop] ??= []
			conf.synonyms[prop].push(prop)
		})
		conf.synonyms[conf.priceprop] ??= []
		conf.synonyms[conf.priceprop].push(conf.priceprop)
		

		const { sheets } = await Excel.loadPrice(visitor, dir + file, conf, base)

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
		let brand_id = false
		if (conf.brand) {
			const brand_nick = base.onicked(conf.brand)
			brand_id = await db.col('SELECT brand_id FROM showcase_brands WHERE brand_nick = :brand_nick', {brand_nick})
			if (!brand_id) return false
		}

		const catalogprop = await upload.receiveProp(conf.catalogprop)
		if (catalogprop.type == 'text') return false //Соединение только по типу value number bond
		
		const mvalues = {}
		const mitems = {}
		for (const {sheet, heads: {head_titles, head_nicks}, rows} of sheets) {
			//Ищем ключ который есть в прайсе и по нему будем брать значение для связи
			const priceprop_title = conf.synonyms[conf.priceprop].find(prop => ~head_titles.indexOf(prop))
			if (!priceprop_title) continue
			const priceprop_nick = base.onicked(priceprop_title)
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

			omissions[sheet] = {loadedrow:0, keyrepeated:[], notconnected:[], notfinded:[], emptyprops:{}, head_titles}
			count += rows.length

			for (const row of rows) {
				const key_title = row[priceprop_index]
				if (!key_title) {
					omissions[sheet].notconnected.push(row)
					continue
				}
				const key_nick = base.onicked(key_title)
				
				let item = false
				if (catalogprop.type == 'value') {
					const value_id = await base.getValueIdByNick(key_nick)
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
				} else if (catalogprop.type == 'bond') {
					const bond_id = await base.getBondIdByNick(key_nick)
					if (!brand_id) {
						item = await db.fetch(`
							SELECT ip.model_id, ip.item_num 
							FROM showcase_iprops ip
							WHERE ip.prop_id = :keyprop_id and ip.bond_id = :bond_id
						`, {keyprop_id: catalogprop.prop_id, bond_id})
					} else {
						item = await db.fetch(`
							SELECT ip.model_id, ip.item_num 
							FROM showcase_models m
							LEFT JOIN showcase_iprops ip on m.model_id = ip.model_id
							WHERE ip.prop_id = :keyprop_id 
								and ip.bond_id = :bond_id
								and m.brand_id = :brand_id
						`, {brand_id, keyprop_id: catalogprop.prop_id, bond_id})
					}
				} else if (catalogprop.type == 'model') {

					if (!brand_id) {
						item = await db.fetch(`
							SELECT m.model_id, i.item_num 
							FROM showcase_models m
							LEFT JOIN showcase_items i on i.model_id = m.model_id
							WHERE m.model_nick = :model_nick and i.item_num is not null
						`, {model_nick: key_nick})
					} else {
						item = await db.fetch(`
							SELECT m.model_id, i.item_num 
							FROM showcase_models m
							LEFT JOIN showcase_items i on i.model_id = m.model_id
							WHERE 
								m.model_nick = :model_nick 
								and i.item_num is not null
								and m.brand_id = :brand_id
						`, {model_nick: key_nick, brand_id})
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
				if (!item) {
					omissions[sheet].notfinded.push(row)
					continue
				}
				
				mitems[item.model_id] ??= {}
				if (mitems[item.model_id][item.item_num]) {
					omissions[sheet].keyrepeated.push(row)
					continue
				}
				mitems[item.model_id][item.item_num] = true

				mvalues[item.model_id] ??= []
				let somepropsinsert = false
				for (const {prop_title, index} of props) {
					//Свойства которые нужно записать ищем их по синонимам
					const prop = await upload.receiveProp(prop_title)
					const value_title = row[index]

					if (!value_title) {
						omissions[sheet].emptyprops[prop_title] ??= []
						omissions[sheet].emptyprops[prop_title].push(row)
						continue //Пустое значение.. с прайсом итак было удалено
					}
					mvalues[item.model_id].push(value_title)
					mvalues[item.model_id].push(prop.prop_nick)
					
					const fillings = []
					let value_id = null
					let bond_id = null
					let text = null
					let number = null

					if (prop.type == 'value') {
						const values = value_title.split(",")
						for (const value of values) {
							const value_nick = base.onicked(value_title)
							if (!value_nick) {
								omissions[sheet].emptyprops[prop_title] ??= []
								omissions[sheet].emptyprops[prop_title].push(row)
								continue
					
							}
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
					} else if (prop.type == 'bond') {
						const values = value_title.split(",")
						for (const value of values) {
							const value_nick = base.onicked(value_title)
							if (!value_nick) {
								omissions[sheet].emptyprops[prop_title] ??= []
								omissions[sheet].emptyprops[prop_title].push(row)
								continue
					
							}
							bond_id = await db.insertId(`
								INSERT INTO 
						 			showcase_bonds
						 		SET
						 			bond_title = :value_title,
						 			bond_nick = :value_nick
						 		ON DUPLICATE KEY UPDATE
						 		 	bond_id = LAST_INSERT_ID(bond_id)
						 	`, { value_nick, value_title })
							fillings.push({bond_id, value_id, text, number})
						}
					} else if (prop.type == 'text') {
						text = value_title
						fillings.push({bond_id, value_id, text, number})
					} else if (prop.type == 'number') {
						if (typeof(value_title) == 'string') {
							const numbers = value_title.split(",")	
							for (const num of numbers) {
								number = parseFloat(value_title)
								if (isNaN(number)) {
									omissions[sheet].emptyprops[prop_title] ??= []
									omissions[sheet].emptyprops[prop_title].push(row)
									continue
								}
								number = Math.round(number * 100) / 100
								fillings.push({bond_id, value_id, text, number})
							}
						} else {
							number = value_title
							fillings.push({bond_id, value_id, text, number})
						}
						
					}
					somepropsinsert = true
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
				if (somepropsinsert) {
					quantity++
					omissions[sheet].loadedrow++
				}
			}
		}
		const searches = await db.all(`
			SELECT distinct m.model_id, m.search
			FROM showcase_models m, showcase_iprops ip
			WHERE ip.model_id = m.model_id
			and ip.price_id = :price_id
		`, { price_id: price.price_id })
		for (const {search, model_id} of searches) {
			if (!mvalues[model_id]) continue
			const newsearch = upload.prepareSearch([mvalues[model_id].join('-'), search])
			if (newsearch == search) continue
			await db.changedRows(`
				UPDATE
					showcase_models
				SET
					search = :newsearch
				WHERE
				 	model_id = :model_id
			`, {model_id, newsearch})
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

		

		return {conf, omissions, count, quantity, duration, loadtime:Date.now(), loaded:1 }
	}
	async applyall() {
		const { upload, visitor, db, config } = this
		let tables = 0
		let counttables = 0
		await (async () => {
			const files = await upload.getNewTables()
			counttables = files.length
			await Promise.all(files.map(async of => {
				const { quantity = 0 } = await upload.loadTable(of.name)
				tables += quantity
			}))
		})()
		let res
		if (counttables) {
			let prices = 0
			let countprices = 0
			await (async () => {
				const files = await upload.getAllPrices()
				countprices = files.length
				await Promise.all(files.map(async of => {
					const { quantity = 0 } = await upload.loadPrice(of.name)
					prices += quantity
				}))
			})()
			const {doublepath, count:files} = await upload.loadAllFiles()
			res = { tables, prices, files }
			res.msg = `Внесено из таблиц(${counttables}) ${tables}, прайсы принудительно внесены все(${countprices}) ${prices}, файлов ${files}`
		} else {
			let prices = 0
			let countprices = 0
			await (async () => {
				const files = await upload.getNewPrices()
				countprices = files.length
				await Promise.all(files.map(async of => {
					const { quantity = 0 } = await upload.loadPrice(of.name)
					prices += quantity
				}))
			})()
			const {doublepath, count:files} = await upload.loadAllFiles()
			res = { tables, prices, files }
			if (countprices) {
				res.msg = `Таблицы без изменений, внесено из прайсов(${countprices}) ${prices}, файлов ${files}`
			} else {
				res.msg = `В данных изменния не обнаружены, файлов привязано ${files}`
			}
			
		}
		
		return res
	}
	
	prepareSearch (ar) {
		let search = nicked(ar.join('-'))
		search = search.split('-')
		search = unique(search)
		search.sort()
		search = search.join(' ')
		return search
	}
	async loadTable (name, msgs = []) {
		const { upload, visitor, options, view, db, config, base } = this
		let duration = Date.now()
		const oldcost = await upload.receiveProp('Старая цена')
		const cost = await upload.receiveProp('Цена')
		const dir = config['tables']
		const { file } = await Files.getFileInfo(visitor, dir, name, ['xlsx','js'])
		if (!file) return false

		const brand = options.tables?.[name]?.brand || name

		const {groups, models, sheets, brands} = await Excel.loadTable(visitor, dir + file, brand, base)
		const values = {}
		const bonds = {}
		const props = {}
		const table_title = name
		const table_nick = base.onicked(name)
		
		
								
		for (const sheet_title in sheets) {
			const { descr, heads, indexes } = sheets[sheet_title]
			heads.head_titles.forEach((prop_title, i) => {
				const prop_nick = heads.head_nicks[i]
				if (~[
					indexes.model_title, 
					indexes.model_nick, 
					indexes.brand_title, 
					indexes.brand_nick,
					indexes.group_nick
					//, indexes.sheet_title 
				].indexOf(i)) return
				props[prop_nick] = { 
					prop_nick, 
					prop_title, 
					ordain: i + 1
				}
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

		for (const prop_nick in props) {
			let pr = props[prop_nick]
			props[prop_nick] = await upload.receiveProp(pr.prop_title)
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
					parent_id = :parent_id, 
				 	group_id = LAST_INSERT_ID(group_id)
			`, group) //group_title, ordain, group_id не меняются. Сохраняются при очистке базы данных. 
		}
		let quantity = 0

		
		await db.changedRows(`
			DELETE i, ip FROM showcase_items i, showcase_iprops ip 
			WHERE i.model_id = ip.model_id and i.item_num = ip.item_num and i.table_id = :table_id
		`, { table_id })
		
		
		for (const brandmod in models) {
			const items = models[brandmod]

			const item = items[0]
			const sheet_title = item[item.length - 1] //Последняя запись это имя листа sheet_title
			const first_indexes = sheets[sheet_title].indexes 
			const model_title = item[first_indexes.model_title]
			const model_nick = item[first_indexes.model_nick]
			const brand_nick = item[first_indexes.brand_nick]
			const group_nick = item[first_indexes.group_nick]
			const brand_id = brands[brand_nick].brand_id
			const group_id = groups[group_nick].group_id


			let search = []
			items.forEach((item) => {
				const sheet_title = item[item.length - 1] //Последняя запись это имя листа sheet_title
				const { descr, heads, indexes } = sheets[sheet_title]
				search.push(item.join('-'))
				heads.head_titles.forEach((prop_title, i) => {
					if (~[
						//indexes.model_title, 
						indexes.model_nick, 
						//indexes.brand_title, 
						indexes.brand_nick,
						indexes.group_nick
						//, indexes.sheet_title 
					].indexOf(i)) return
					search.push(prop_title)
				})
			})
			search = upload.prepareSearch(search)

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
					group_id = :group_id,
				 	model_id = LAST_INSERT_ID(model_id)
			`, {model_title, model_nick, brand_id, group_id, search})


			let item_num = await db.col(`
				SELECT max(item_num) 
				FROM showcase_items
				WHERE model_id = :model_id
			`, { model_id }) || 0

			for (const i in items) {
				const item = items[i]
				const ordain = 1 + Number(i)
			
				const sheet_title = item[item.length - 1] //Последняя запись это имя листа sheet_title
				const { descr, heads, indexes } = sheets[sheet_title]
				const sysitem = (item, i) => {
					const value_title = item[i]
					if (value_title === null) return true
					if (value_title === '') return true
					if (Array.isArray(value_title) && !value_title.length) return true
					
					if (~[
						indexes.model_title, 
						indexes.model_nick, 
						indexes.brand_title, 
						indexes.brand_nick,
						indexes.group_nick
						//, indexes.sheet_title 
					].indexOf(Number(i))) return true
					return false
				}
				quantity++
				const myitem_num = ++item_num
				for (const i in item) {
					if (sysitem(item,i)) continue
					const value_title = item[i]
					const prop_nick = heads.head_nicks[i]
					const type = await base.getPropTypeByNick(prop_nick)

					
					if (type != 'text' && !~options.justonevalue_nicks.indexOf(prop_nick)) {
						item[i] = String(value_title).split(',').map(v => v.trim()).filter(v => v)
					} else {
						item[i] = [value_title]
					}
					if (type == 'text') continue
					if (type == 'number') {
						for (const j in item[i]) {
							const v_title = item[i][j]
							let number = parseFloat(v_title)
							if (isNaN(number)) {
								msgs.push(`
									Ошибка <b>${heads.head_titles[i]}</b> ${type} <b>${v_title}</b>. 
									Несоответствует типу.
									Файл ${name}, лист ${sheet_title}. 
								`)
								delete item[i][j]
								continue
							}
							number = Math.round(number * 100) / 100
							item[i][j] = number

							const LIM = 8
							const test = Math.floor(number)
							const len = String(test).length
							if (len <= LIM) continue
							msgs.push(`
								Ошибка <b>${heads.head_titles[i]}</b> ${type} <b>${v_title}</b>. 
								Длинна ${len} > ${LIM}. Значение не сохранено. 
								Файл ${name}, лист ${sheet_title}. 
							`)
							delete item[i][j]
						}
						continue
					}
					if (type == 'file') {
						msgs.push(`
							Ошибка <b>${heads.head_titles[i]}</b> ${type} <b>${v_title}</b>. 
							Значение не сохранено, так как поля типа file определяются отдельно. 
							Файл ${name}, лист ${sheet_title}. 
						`)
						continue
					}
					for (const v_title of item[i]) {
						if (type == 'value' && values[v_title]) continue
						if (type == 'bond' && bonds[v_title]) continue
						const value_nick = base.onicked(v_title)
						if (v_title.length > base.LONG) {
							msgs.push(`
								<b>${heads.head_titles[i]}</b> ${type} 
								<b title="${value_nick}">${v_title.slice(-base.LONG).trim()}</b> из <b>${v_title}</b>. Длинна ${v_title.length} > ${base.LONG}. 
								Файл ${name}, лист ${sheet_title}. 
								
							`)
							//console.log(msgs[msgs.length - 1])
						}
						if (type == 'value') {
							const value_title = v_title.slice(-base.LONG).trim()
							
							values[v_title] = { value_title, value_nick }
							values[v_title].value_id = await db.insertId(`
								INSERT INTO 
									showcase_values
								SET
									value_title = :value_title,
									value_nick = :value_nick
								ON DUPLICATE KEY UPDATE
								 	value_id = LAST_INSERT_ID(value_id)
							`, values[v_title])
						}
						if (type == 'bond') {
							const bonds_title = v_title.slice(-base.LONG).trim()
							const bond_nick = base.onicked(v_title)
							bonds[v_title] = { bonds_title, bond_nick }
							bonds[v_title].bond_id = await db.insertId(`
								INSERT INTO 
									showcase_bonds
								SET
									bond_title = :bonds_title,
									bond_nick = :bond_nick
								ON DUPLICATE KEY UPDATE
								 	bond_id = LAST_INSERT_ID(bond_id)
							`, bonds[v_title])
						}
					}
				}
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
				for (const i in item) {
					const value_title = item[i]
					if (sysitem(item,i)) continue
					
					const prop_nick = heads.head_nicks[i]
					const {prop_id, type} = props[prop_nick]
					
					const save = async (text, number, value_id, bond_id) => {
						await db.affectedRows(`
							INSERT IGNORE INTO 
								showcase_iprops
							SET
								model_id = :model_id,
								item_num = :item_num,
								prop_id = :prop_id,
								text = :text,
								number = :number,
								bond_id = :bond_id,
								value_id = :value_id
						`, { model_id, item_num:myitem_num, prop_id, text, number, value_id, bond_id})
					}
					for (const v_title of value_title) {
						if (type == 'value') {
							const value_id = values[v_title].value_id
							await save(null, null, value_id, null)
						} else if (type == 'bond') {
							const bond_id = bonds[v_title].bond_id
							await save(null, null, null, bond_id)
						} else if (type == 'number') {
							const number = v_title
							await save(null, number, null, null)
						} else if (type == 'text') {
							const text = v_title
							await save(text, null, null, null)
						}
					}
				}
				
			}
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
		
		return { quantity, duration, loadtime:Date.now(), loaded:1, msgs }
	}






	async connectByKey() {
		const { upload, visitor, config, base, db } = this

		const art_id = (await upload.receiveProp('Арт')).prop_id
		const photo_id = (await upload.receiveProp('Фото')).prop_id

		const files = await db.all(`
			SELECT distinct f.destiny, f.file_id, ip.model_id AS imodel_id, ip.item_num AS iitem_num, m.model_id, f.ordain 
			FROM 
				showcase_filekeys fk
				LEFT JOIN showcase_files f on fk.file_id = f.file_id
				LEFT JOIN showcase_brands b on b.brand_nick = f.brand_nick
				LEFT JOIN showcase_models m ON (m.model_nick = fk.key_nick AND m.brand_id = b.brand_id)
				LEFT JOIN showcase_bonds bo on bo.bond_nick = fk.key_nick
				LEFT JOIN showcase_iprops ip ON (ip.bond_id = bo.bond_id AND (ip.prop_id = :art_id OR ip.prop_id = :photo_id))
				LEFT JOIN showcase_models m2 ON (ip.model_id = m2.model_id AND m2.brand_id = b.brand_id)
			WHERE fk.key_nick is not null and b.brand_id is not NULL AND (bo.bond_id IS NOT NULL OR m.model_id IS NOT NULL)
		`, {art_id, photo_id})
		
		const destinies = {}
		for (const part of Object.keys(Files.destinies)) { //['slides','files','images','texts','videos']
			destinies[part] = await upload.receiveProp(part)
		}
		for (const file of files) {
			const {file_id, ordain, destiny, imodel_id, iitem_num, model_id} = file
			
			let items = []
			if (model_id) {
				items = await db.all(`
					SELECT item_num, model_id 
					FROM showcase_items 
					WHERE model_id = :model_id
				`, { model_id })
			} else {
				items = [{item_num:iitem_num, model_id: imodel_id}]
			}
			for (const item of items) {
				//Может быть дубль, если у файла разные keynick и по 1 связь с моделью, по второму связь по Фото. Это будет в двух интерация и без полного хэша все дубли не убрать.
				await db.exec(`
					INSERT IGNORE INTO 
			 			showcase_iprops
			 		SET
			 			model_id = :model_id,
			 			item_num = :item_num,
			 			prop_id = :prop_id,
			 			file_id = :file_id,
			 			ordain = :ordain
			 	`, {...item, ...file, prop_id: destinies[destiny].prop_id})
			}
			
		}
	}
	async connectByFiles() {
		const { base, upload, visitor, db, config } = this
		const files_id = await base.getPropIdByTitle('Файлы')
		if (!files_id) return

		const destinies = {}
		for (const part of Object.keys(Files.destinies)) { //['slides','files','images','texts','videos']
			destinies[part] = await upload.receiveProp(part)
		}
		const listsrc = await db.allto('src', `
			SELECT ip.text as src, ip.model_id, ip.item_num
			FROM showcase_iprops ip
			WHERE ip.prop_id = :files_id
		`, { files_id })
		
		for (const src in listsrc) {
			const {model_id, item_num} = listsrc[src]
			const src_nick = nicked(src)
			const files = await db.all(`
				SELECT f.file_id, f.destiny, f.ordain from showcase_files f
				where f.src_nick like '${src_nick}%'
			`)
			for (const {file_id, destiny, ordain} of files) {
				await db.exec(`
					INSERT IGNORE INTO 
						showcase_iprops
					SET
						model_id = :model_id,
						item_num = :item_num,
						ordain = :ordain,
						prop_id = :prop_id,
						file_id = :file_id
				`, {model_id, item_num, ordain, file_id, prop_id: destinies[destiny].prop_id})
			}
		}
		
		
	}
	async connectAllFiles() {
		const { upload, visitor, db, config } = this
		
		await db.changedRows(`
			UPDATE showcase_groups
			SET icon_id = null
		`)
		await db.changedRows(`
			UPDATE showcase_groups g
			LEFT JOIN showcase_files f ON f.group_nick = g.group_nick
			SET g.icon_id = f.file_id
			WHERE f.destiny = 'groupicons'
		`)

		await db.changedRows(`
			UPDATE showcase_brands
			SET logo_id = null
		`)
		await db.changedRows(`
			UPDATE showcase_brands b
			LEFT JOIN showcase_files f ON f.brand_nick = b.brand_nick
			SET b.logo_id = f.file_id
			WHERE f.destiny = 'brandlogos'
		`)

		await db.changedRows(`
			DELETE FROM showcase_iprops
			WHERE file_id is not null
		`)
		
		


		await upload.connectByKey()
		await upload.connectByFiles()

		
		const all = await db.col(`select count(*) from showcase_files`)
		// const free = await db.col(`
		// 	SELECT COUNT(*) 
		// 	FROM (((showcase_files f
		// 		LEFT JOIN showcase_groups g on g.icon_id = f.file_id)
		// 		LEFT JOIN showcase_brands b on b.logo_id = f.file_id)
		// 		LEFT JOIN showcase_iprops ip on ip.file_id = f.file_id)
		// 	WHERE g.icon_id is null and b.logo_id is null and ip.file_id is null
		// `)
		const count = await db.col(`
			SELECT COUNT(DISTINCT f.file_id) 
			FROM
				showcase_files f
				INNER JOIN 
				(
					SELECT ip.file_id
					FROM showcase_iprops ip
					WHERE ip.file_id IS NOT null
					
					UNION ALL
					
					SELECT g.icon_id AS file_id
					FROM showcase_groups g
					WHERE g.icon_id IS NOT NULL
					
					UNION ALL
					
					SELECT b.logo_id AS file_id
					FROM showcase_brands b
					WHERE b.logo_id IS NOT NULL
				) a ON a.file_id = f.file_id
		`)
		//const count = all - free
		const free = all - count
		return {count, free, all}
	}
	async indexAllFiles() {
		const { upload, visitor, db, config, base } = this
		const parts = {}
		const doublepath = []
		const ids = {}
		let count = 0
		const tostat = (file_id, src) => {
			if (ids[file_id]) {
				doublepath.push(src)
				ids[file_id]++
			} else {
				ids[file_id] = 1
			}
			count++
		}
		
		await db.changedRows(`
			UPDATE showcase_files
			SET status = '404'
		`)
		await db.exec(`TRUNCATE showcase_filekeys`)

		let part, list
		
		part = 'groupicons'
		list = await Files.readdirDeep(visitor, config[part])
		await Files.runDeep(list, async (dirinfo, fileinfo, level) => {
			const src = dirinfo.dir + fileinfo.file	
			const group_nick = base.onicked(fileinfo.name)
			const file_id = await upload.index(src, {fileinfo, destiny:part, source:'disk'}, {
				brand_nick:null, 
				group_nick, 
				keys_title:null
			})
			tostat(file_id, src)
		})

		part = 'brandlogos'
		list = await Files.readdirDeep(visitor, config[part])
		await Files.runDeep(list, async (dirinfo, fileinfo, level) => {
			const src = dirinfo.dir + fileinfo.file	
			const brand_nick = base.onicked(fileinfo.name)
			const file_id = await upload.index(src, {fileinfo, destiny:part, source:'disk'}, {
				brand_nick, 
				group_nick:null, 
				keys_title:null
			})
			tostat(file_id, src)
		})

		for (const part of Object.keys(Files.exts)) { //['slides','files','images','texts','videos']
			list = await Files.readdirDeep(visitor, config[part])
			for (const root of list.dirs) {
				const brand_nick = base.onicked(root.name)
				await Files.runDeep(root, async (dirinfo, fileinfo, level) => {
					const src = dirinfo.dir + fileinfo.file
					const keys_title = fileinfo.name
					const file_id = await upload.index(src, {fileinfo, destiny: part, source:'disk'}, {
						brand_nick, 
						group_nick: null,
						keys_title
					})
					tostat(file_id, src)	
				})
			}
		}

		part = 'folders'
		parts[part] = await Files.readdirDeep(visitor, config[part])
		for (const dirinfo of parts[part].dirs) { //Бренды
			const brand_nick = base.onicked(dirinfo.name)
			const minfo = dirinfo.dirs.find(info => info.name == 'models')
			if (minfo) for (const subinfo of minfo.dirs) { //Модели
				const keys_title = subinfo.name
				await Files.runDeep(subinfo, async (dirinfo, fileinfo, level) => {
					const src = dirinfo.dir + fileinfo.file
					const ext = fileinfo.ext
					const part = Files.getWayByExt(ext) //files, images, texts, videos
					const file_id = await upload.index(src, {fileinfo, destiny: part, source:'disk'}, {
						brand_nick, 
						group_nick: null,
						keys_title
					})
					tostat(file_id, src)
				})
			}
			for (const part of Object.keys(Files.exts)) { //['slides','files','images','texts','videos']
				const root = await Files.readdirDeep(visitor, dirinfo.dir + part + '/')
				await Files.runDeep(root, async (dirinfo, fileinfo, level) => {
					const src = dirinfo.dir + fileinfo.file
					const keys_title = fileinfo.name
					const file_id = await upload.index(src, {fileinfo, destiny: part, source:'disk'}, {
						brand_nick, 
						group_nick: null,
						keys_title
					})
					tostat(file_id, src)
				})
			}
		}
		
		return {doublepath, count}
	}
	index(src, descr, connect = {}) {
		const { upload, visitor, db, config } = this
		let src_nick = nicked(src).slice(-255)
		return cproc(Files, src_nick, () => upload.procindex(src, src_nick, descr, connect))
	}
	async procindex (src, src_nick, {fileinfo, destiny, source}, {group_nick = null, brand_nick = null, keys_title = null}) {
		const { upload, visitor, db, config, base } = this
		const status = '200'
		const info = fileinfo
		const name = info.name.slice(-base.LONG).trim()
		const nick = base.onicked(info.name)
		let ordain = info.num ?? null
		if (ordain > 255) {
			console.log('Out of range', info)
			ordain = 255
		}
		
		const way = Files.getWayByExt(info.ext)
		const ext = way != 'files' ? info.ext : (~Files.destinies.files.indexOf(info.ext) ? info.ext : null)
		if (!ext) {
			console.log('Strange ext', info)
		}

		const place = /^https?:\/\//i.test(src) ? 'remote' : 'local'
		const keys_nick = keys_title ? unique(keys_title.split(',').map(r => base.onicked(r)).filter(n => n)) : false
		const params = { 
			name, nick, ordain, way, place,
			src, src_nick, status, source, destiny, group_nick,
			brand_nick, ext
		}
		const SET = `
			src = :src,
			src_nick = :src_nick,
			name = :name,
			ext = :ext,
			place = :place,
			nick = :nick,
			ordain = :ordain,
			way = :way,
			status = :status,
			source = :source,
			destiny = :destiny,
			group_nick = :group_nick,
			brand_nick = :brand_nick
		`

		const file_id = await db.insertId(`
			INSERT INTO 
	 			showcase_files
	 		SET ${SET}
	 		ON DUPLICATE KEY UPDATE
	 		 	file_id = LAST_INSERT_ID(file_id),
	 		 	${SET}
	 	`, params)
	 	if (keys_nick) {
	 		for (const key_nick of keys_nick) {
	 			await db.exec(`
					INSERT IGNORE INTO 
			 			showcase_filekeys
			 		SET 
			 			file_id = :file_id,
			 			key_nick = :key_nick
			 	`, {key_nick, file_id})
	 		}
	 	}
		return file_id
	}
}
export default Upload