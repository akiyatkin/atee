import Access from "/-controller/Access.js"


const Showcase = {
	getOptions: ({db, visitor, adminmode}) => {
		const cache = (adminmode ? Access : visitor).relate(Showcase)
		return cache.once('getOptions', async () => {
			const conf = await config('showcase')
			const options = await JSON.parse(
				await fs.readFile((conf.options)).catch(e => ('{}'))
			)
			options.numbers ??= []
			options.texts ??= []
			options.bonds ??= []
			options.values ??= []
			options.files ??= []
			options.justonevalue ??= []
			options.justonevalue.push("Арт","Название")
			options.tables ??= {}
			options.prices ??= {}
			options.columns ??= []
			options.systems ??= []
			options.brands ??= {}
			options.groups ??= {}
			options.limit ??= 10
			options.groupids = {}
			options.partners ??= {}
			options.props ??= {}
			options.props["Бренд"] ??= {
				"filter":{"tpl":"row"},
				"tplprop":"brand",
				"prop_title":"Бренд",
				"value_title":"brand_title",
				"value_nick":"brand_nick"
			}
			options.props["Модель"] ??= {
				"value_title":"model_title",
				"tplprop":"model"
			}
			options.props["Наименование"] ??= {
				"type":"text",
				"tplprop":"modelhidden"
			}
			options.props["Цена"] ??= {
				"type":"number",
				"justone":true,
				"filter":{"slider":true,"tpl":"slider"},
				"tplprop":"empty"
			}
			options.root_title ??= 'Каталог'
			options.root_nick = nicked(options.root_title)
			options.groups[options.root_title] ??= {
				"props":["Наименование", "Бренд", "Модель"],
				"filters":["Бренд","Цена"]
			}
			options.actions ??= ['Новинка','Распродажа']

			const types = {}
			types.text = ["Описание", "Наименование", "Ссылки на картинки","Ссылки на файлы", "Файлы"]
			types.number = ["Старая цена", "Цена", "sheet_row","sheet_index", "discount"]
			types.value = ["Наличие"]
			types.bond = ["Файл", "sheet_title", "Фото", "Арт"]
			types.file = ["texts", "images", "files", "videos", "slides","unknown_files"]
			const systems = [
				"Скрыть фильтры",
				"tpl","parent_id",
				"card_props", "item_props", "model_props", 
				"min","max",
				"path", "more", "items",
				"item_num", "model_id","model_nick","model_title","group_title","group_id",
				"group_nick","brand_nick","brand_id","brand_title"
			]
			options.systems = [...types.number, ...types.text, ...types.value, ...types.bond, ...types.file, ...systems]
			for (const type in types) {
				for (const prop_title of types[type]) {
					options.props[prop_title] ??= {}
					options.props[prop_title].type = type
				}	
			}
			
			for (const prop_title in options.props) {
				const prop = options.props[prop_title]
				if (prop.column) options.columns.push(prop_title)
				if (prop.justone) options.justonevalue.push(prop_title)
				if (prop.type) options[prop.type + 's'].push(prop_title)
			}

			options.number_nicks = options.numbers.map(prop => base.onicked(prop))
			options.text_nicks = options.texts.map(prop => base.onicked(prop))
			options.bond_nicks = options.bonds.map(prop => base.onicked(prop))
			options.value_nicks = options.values.map(prop => base.onicked(prop))
			options.file_nicks = options.files.map(prop => base.onicked(prop))
			options.justonevalue_nicks = options.justonevalue.map(prop => base.onicked(prop))


			for (const group_title in options.groups) {
				const ids = await db.colAll('SELECT group_id FROM showcase_groups where group_title = :group_title', { group_title })
				ids.forEach(id => {
					options.groupids[id] = options.groups[group_title]	
				})
			}
			for (const value in options.props) {
				const p = options.props[value]
				if (!p.prop_title) p.prop_title = value //Название свойства на карточке
				if (!p.value_title) p.value_title = value //Значение свойства в данных
				if (!p.value_nick) p.value_nick = value //Ник свойства в данных
				if (!p.prop_nick) p.prop_nick = base.onicked(p.value_nick)  //Ник самого свойства
				if (value == 'Цена') p.unit ??= 'руб.'
				const r = value.split(',')
				if (r.length > 1) p.unit = r[1].trim()
				else p.unit ??= ''
			}
			for (const price_title in options.prices) {
				const conf = options.prices[price_title]
				conf.synonyms ??= {}
				conf.props ??= ['Цена']
				conf.priceprop ??= 'Артикул'
				conf.catalogprop ??= 'Модель'
				conf.start ??= 1
				conf.starts ??= {}
			}

			return options
		})
	},
	getPartner: async ({visitor, db, user_id, adminmode}) => {
		const options = await Showcase.getOptions({visitor, db, adminmode})
		const parnter_nick = await db.col('select partner_nick from showcase_partners where user_id = :user_id', { user_id })
		if (!parnter_nick) return false
		const data = options.partners[parnter_nick]
		if (!data) return false
		data.key = parnter_nick
		return data
	}
}



export default Showcase