import { Files } from "/-showcase/Files.js"
import { Access } from "/-controller/Access.js"
import { Excel } from "/-showcase/Excel.js"
import fs from "fs/promises"
import nicked from '/-nicked/nicked.js'
import unique from '/-nicked/unique.js'

export class Upload {
	constructor (opt) {
		this.opt = opt //{ visitor, options, view, db, config }
		opt.upload = this
	}
	async getAll(what) {
		const { visitor, config } = this.opt
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
		const { visitor, options, view, db, config } = this.opt
		let files = await this.getAll('tables')
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
	async getAllPrices() {
		return await this.getAll('prices')
	}
	async getNewPrices() {
		const { visitor, options, view, db, config } = this.opt
		let files = await this.getAll('prices')
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
		return visitor.relate(Upload).once('receiveProp'+prop_title, async () => {
			const prop = {
				prop_title,
				prop_nick: nicked(prop_title)
			}
			if (prop.prop_nick == 'model' || prop.prop_nick == 'artikul') {
				prop.type = 'model'
				return prop
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
	async clearAllTable() {
		const { visitor, options, view, db, config } = this.opt
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
		const { visitor, options, view, db, config } = this.opt
		const table_nick = nicked(table_title)
		
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
		const upload = this
		const { db } = upload.opt
		const iprops = await db.all(`
			SELECT distinct ip.number, ip.text, v.value_nick, p.prop_nick
			FROM showcase_iprops ip
			LEFT JOIN showcase_props p on ip.prop_id = p.prop_id
			LEFT JOIN showcase_values v on ip.value_id = v.value_id
			WHERE ip.model_id = :model_id
		`, { model_id })
		let search = []
		iprops.forEach((props) => {
			search.push(Object.values(props).filter(val => !!val).join('-'))
		})
		search = upload.prepareSearch(search)
		return search
	}
	async loadPrice (price_title) {
		const { visitor, options, view, db, config } = this.opt
		const upload = this
		const price_nick = nicked(price_title)
		
		let duration = Date.now()
		let quantity = 0
		let count = 0
		let omissions = {}

		const dir = config['prices']
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
		

		const { sheets } = await Excel.loadPrice(visitor, dir + file, conf)
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

		const mvalues = {}
		for (const {sheet, heads: {head_titles, head_nicks}, rows} of sheets) {
			//Ищем ключ который есть в прайсе и по нему будем брать значение для связи
			const priceprop_title = conf.synonyms[conf.priceprop].find(prop => ~head_titles.indexOf(prop))
			if (!priceprop_title) continue
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
			omissions[sheet] = {notconnected:[], notfinded:[], emptyprops:{}, head_titles}
			count += rows.length
			for (const row of rows) {
				const key_title = row[priceprop_index]
				if (!key_title) {
					omissions[sheet].notconnected.push(row)
					continue
				}
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
								m.model_nick = :model_nick and i.item_num is not null
								and m.brand_id = :brand_id
						`, {model_nick: key_nick})
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
				mvalues[item.model_id] ??= []
				
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
					let text = null
					let number = null

					if (prop.type == 'value') {
						const values = value_title.split(",")
						for (const value of values) {
							const value_nick = nicked(value_title)
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
					} else if (prop.type == 'text') {
						text = value_title
						fillings.push({value_id, text, number})
					} else if (prop.type == 'number') {
						if (typeof(value_title) == 'string') {
							const numbers = value_title.split(",")	
							for (const num of numbers) {
								number = nicked(num)
								if (number === '') {
									omissions[sheet].emptyprops[prop_title] ??= []
									omissions[sheet].emptyprops[prop_title].push(row)
									continue
								}
								fillings.push({value_id, text, number})
							}
						} else {
							number = value_title - 0	
							fillings.push({value_id, text, number})
						}
						
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

		

		return { omissions, count, quantity, duration, loadtime:Date.now(), loaded:1 }
	}
	async applyall() {
		const { upload, visitor, db, config } = this.opt
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
	async loadAllFiles() {
		const { upload, visitor, db, config } = this.opt
		const parts = {}
		const doublepath = []
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
			if (!~Files.exts.images.indexOf(fileinfo.ext)) return false
			const src = dirinfo.dir + fileinfo.file	
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
			if (!~Files.exts.images.indexOf(fileinfo.ext)) return false
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
		props.photo = await upload.receiveProp('Фото')



		props.files = await upload.receiveProp('Файлы')
		const search_prop_id = props.files.prop_id
		const vals = await db.all(`
			SELECT DISTINCT v.value_title as src, v.value_id as search_value_id
			FROM showcase_values v, showcase_iprops ip
			WHERE v.value_id = ip.value_id and ip.prop_id = :search_prop_id
		`, { search_prop_id })
		for (const val of vals) {
			const {src, search_value_id} = val
			val.res = []
			const stat = await fs.stat(src)
			if (stat.isFile()) {
				const finfo = File.srcInfo(stat.file)
				const ext = finfo.ext
				const ordain = finfo.num
				const part = 'files'
				if (~Files.exts.images.indexOf(ext)) part = 'images'
				if (~Files.exts.texts.indexOf(ext)) part = 'texts'
				if (~Files.exts.videos.indexOf(ext)) part = 'videos'
				val.res.push({
					ordain,
					src,
					prop_id: props[part].prop_id
				})
			} else {
				const root = await Files.readdirDeep(visitor, src)
				for (const finfo of root.files) {
					const ext = finfo.ext
					const ordain = finfo.num

					const part = 'files'
					if (~Files.exts.images.indexOf(ext)) part = 'images'
					if (~Files.exts.texts.indexOf(ext)) part = 'texts'
					if (~Files.exts.videos.indexOf(ext)) part = 'videos'
					val.res.push({
						ordain,
						src: src + finfo.file,
						prop_id: props[part].prop_id
					})
				}
			}
			for (const r of val.res) {
				const {ordain, src, prop_id} = r //search_value_id, search_prop_id
				//const value = await upload.receiveValue(src)
				const items = await db.all(`
					SELECT m.model_id, ip.item_num 
					FROM showcase_iprops ip, showcase_models m
					WHERE 
					ip.model_id = m.model_id
					and ip.value_id = :search_value_id 
					and ip.prop_id = :search_prop_id
				`, {search_value_id, search_prop_id})
				for (const item of items) {
					const { model_id, item_num } = item
					await db.affectedRows(`
						INSERT IGNORE INTO
							showcase_iprops
						SET
							ordain = :ordain,
							text = :src,
							model_id = :model_id,
							item_num = :item_num,
							prop_id = :prop_id
					`, {
						ordain, src,
						item_num: item.item_num,
						model_id: item.model_id, 
						prop_id: prop_id
					})
				}
			}
		}

		for (const part of ['slides','files','images','texts','videos']) {
			await db.affectedRows(`
				DELETE FROM showcase_iprops
				WHERE prop_id = :prop_id
			`, props[part])
			parts[part] = await Files.readdirDeep(visitor, config[part])
			for (const root of parts[part].dirs) {
				const brand_nick = nicked(root.name)
				const brand_id = await db.col('SELECT brand_id FROM showcase_brands where brand_nick = :brand_nick', {brand_nick})
				if (!brand_id) continue
				await Files.filterDeepSplit(root, async (dirinfo, name, fileinfo, level) => {
					if (!~Files.exts.images.indexOf(fileinfo.ext)) return false
					const res = await Files.getRelations(db, name, brand_id, [props.art.prop_id,props.photo.prop_id])
					const src = dirinfo.dir + fileinfo.file
					const ordain = fileinfo.num || 1
					//const value = await upload.receiveValue(src)
					for (const item of res) {
						const affectedRows = await db.affectedRows(`
							INSERT IGNORE INTO
								showcase_iprops
							SET
								ordain = :ordain,
								text = :src,
								model_id = :model_id,
								item_num = :item_num,
								prop_id = :prop_id
						`, {
							ordain, src,
							item_num: item.item_num,
							model_id: item.model_id, 
							prop_id: props[part].prop_id
						})
						count += affectedRows
						if (!affectedRows) doublepath.push(dirinfo.dir + fileinfo.file) //Встретилось имя у которого nick одинаковый и сработало исключение при повторной записи
					}
					return false
				})
			}
		}

		part = 'brands'
		parts[part] = await Files.readdirDeep(visitor, config[part])
		for (const dirinfo of parts[part].dirs) { //Бренды
			const brand_nick = nicked(dirinfo.name)
			const brand_id = await db.col('SELECT brand_id FROM showcase_brands where brand_nick = :brand_nick', {brand_nick})
			if (!brand_id) continue
			const minfo = dirinfo.dirs.find(info => info.name == 'models')
			if (!minfo) continue
			for (const subinfo of minfo.dirs) { //Модели
				const res = await Files.getRelations(db, subinfo.name, brand_id, [props.art.prop_id]) //Папка может быть привязана к Art
				let i = 0
				for (const fileinfo of subinfo.files) { //Файлы
					i++
					const src = subinfo.dir + fileinfo.file
					
					const ext = fileinfo.ext

					const ordain = fileinfo.num || i

					//const value = await upload.receiveValue(src)
					part = 'files'
					if (~Files.exts.images.indexOf(ext)) part = 'images'
					if (~Files.exts.texts.indexOf(ext)) part = 'texts'
					if (~Files.exts.videos.indexOf(ext)) part = 'videos'
					for (const item of res) { //Позиции
						const affectedRows = await db.affectedRows(`
							INSERT IGNORE INTO
								showcase_iprops
							SET
								ordain = :ordain,
								text = :src,
								model_id = :model_id,
								item_num = :item_num,
								prop_id = :prop_id
						`, {
							ordain, src,
							item_num: item.item_num,
							model_id: item.model_id, 
							prop_id: props[part].prop_id
						})
						count += affectedRows
						if (!affectedRows) doublepath.push(minfo.dir + fileinfo.file) //Встретилось имя у которого nick одинаковый и сработало исключение при повторной записи
					}
				}
			}
		}
		for (const part of ['slides','files','images','texts','videos']) {
			const { prop_id } = props[part]
			const list = await db.all(`
				SELECT v.value_id
				FROM showcase_values v, showcase_iprops ip
				WHERE v.value_id = ip.value_id and ip.prop_id = :prop_id
				ORDER BY ip.ordain, v.value_nick
			`, { prop_id })
			for (const i in list) {
				const file = list[i]
				await db.changedRows(`
					UPDATE showcase_iprops ip
					SET ordain = :ordain
					WHERE prop_id=:prop_id and value_id = :value_id
				`, {prop_id, value_id: file.value_id, ordain: i+1})
			}
		}
		return {doublepath, count}
	}
	prepareSearch (ar) {
		let search = nicked(ar.join('-'))
		search = search.split('-')
		search = unique(search)
		search.sort()
		search = search.join(' ')
		return search
	}
	async loadTable (name) {
		const { visitor, options, view, db, config } = this.opt
		let duration = Date.now()
		const upload = this
		const oldcost = await upload.receiveProp('Старая цена')
		const cost = await upload.receiveProp('Цена')
		const dir = config['tables']
		const file = await Files.getFileName(visitor, dir, name, ['xlsx'])
		if (!file) return false

		const {groups, models, sheets, brands} = await Excel.loadTable(visitor, dir + file, name)
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
						indexes.model_title, 
						indexes.model_nick, 
						indexes.brand_title, 
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
				const ordain = i + 1
			
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
					
					if (~options.text_nicks.indexOf(heads.head_nicks[i])) continue
					item[i] = String(value_title).split(',').map(v => v.trim()).filter(v => v)
					if (~options.number_nicks.indexOf(heads.head_nicks[i])) continue
					for (const v_title of item[i]) {
						if (values[v_title]) continue
						
						const value_nick = nicked(v_title)
						values[v_title] = { 
							value_title:v_title,
							value_nick 
						}
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
					
					const save = async (text, number, value_id) => {
						await db.affectedRows(`
							INSERT IGNORE INTO 
								showcase_iprops
							SET
								model_id = :model_id,
								item_num = :item_num,
								prop_id = :prop_id,
								text = :text,
								number = :number,
								value_id = :value_id
						`, { model_id, item_num:myitem_num, prop_id, text, number, value_id })
					}
					if (type == 'value' || type == 'number') {
						for (const v_title of value_title) {
							if (type == 'value') {
								const value_id = values[v_title].value_id
								await save(null, null, value_id)
							} else if (type == 'number') {
								const number = v_title - 0
								await save(null, number, null)
							}
							
						}
					} else if (type == 'text') {
						const text = value_title
						await save(text, null, null)
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
		
		return { quantity, duration, loadtime:Date.now(), loaded:1 }
	}
}
