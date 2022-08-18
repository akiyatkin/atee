import { nicked } from "/-nicked/nicked.js"

/*
	const rows_source = await readXlsxFile(src)
	const data = Dabudi.parse(rows_source)
*/


export const Dabudi = {
	getOne: row => {
		let group_title = false
		if (row.every(col => {
			if (!col) return true
			if (group_title) return false //Нашли вторую заполненную ячейку
			group_title = col
			return true
		})) return group_title	
	},
	// parseBrand: rows_source => {
	// 	const {descr, rows_table} = Dabudi.splitDescr(rows_source)
	// 	const {heads, rows_body} = Dabudi.splitHead(rows_table)
	// 	const index_group = Dabudi.getColIndex(heads, 'group_nick')
	// 	const {rows_items, groups} = Dabudi.splitGroups(rows_body, heads, 'Каталог', index_group)

	// 	//brand либо указан, либо общий
	// 	Dabud.addColBrand(rows_items, heads, 'Brand', 'Модель')
	// 	const rows_models = Dabud.addColModel(rows_items, heads, 'Модель')
	// 	const models = Dabudi.makeBrandModels(rows_models, heads)
	// 	return {descr, groups, models, heads}
	// },
	// parse: rows_source => {
	// 	const {descr, rows_table} = Dabudi.splitDescr(rows_source)
	// 	const {heads, rows_body} = Dabudi.splitHead(rows_table)
	// 	const {rows_items, groups} = Dabudi.splitGroups(rows_body, heads, 'Каталог', index_group)
	// 	const rows_models = Dabud.addColModel(rows_items, heads, 'Модель')
	// 	const models = Dabudi.makeModels(rows_models, heads)
	// 	return {descr, groups, models, heads}
	// },
	splitDescr: (rows_source) => {
		const index = rows_source.findIndex(row => {
			let count = 0
			if (!row.some(col => {
				if (!col) return
				count++
				return count > 2
			})) return
			return true
		})
		const rows_descr = rows_source.slice(0, index)
		const descr = {}
		rows_descr.forEach(row => {
			if (!row[0]) return
			descr[row[0]] = row[1]
		})
		const rows_table = rows_source.slice(index)
		return {descr, rows_table}
	},
	// makeModels: (rows_models, heads) => {
	// 	const {head_titles, head_nicks} = heads
	// 	let index_model_nick = head_nicks.indexOf('model_nick')
	// 	const models = {}
	// 	rows_models.forEach(row => {
	// 		const mod = row[index_model_nick]
	// 		if (!models[mod]) {
	// 			models[mod] = {
	// 				items:[],
	// 				props:[]
	// 			}
	// 		}
	// 		models[mod].items.push(row)
	// 	})
	// 	heads.head_item = []
	// 	heads.head_item_nicks = []
	// 	heads.head_props = []
	// 	heads.head_props_nicks = []
	// 	for (const model of models) {
	// 		models.items.forEach(item => {
	// 			item.forEach((prop,i) => {
	// 				if (models.items.every(row => row[i] == prop)) {
	// 					heads.head_props[i] = head_titles[i]
	// 					heads.head_props_nicks[i] = head_nicks[i]

	// 					models.props[i] = prop
	// 					models.items.forEach(item => { 
	// 						delete item[i]
	// 					})
	// 				} else {
	// 					heads.head_item[i] = head_titles[i]
	// 					heads.head_item_nicks[i] = head_nicks[i]
	// 				}
					
	// 			})
	// 		})
	// 	}
	// 	return models
	// },
	getColIndex: ({head_titles, head_nicks}, name) => {
		let index = head_titles.indexOf(name)
		if (!~index) {
			index = head_titles.length
			head_titles[index] = name
			head_nicks[index] = nicked(name)
		}
		return index
	},
	// makeBrandModels: (rows_models, heads ) => {
	// 	const {head_titles, head_nicks} = heads
	// 	let index_brand_nick = head_nicks.indexOf('brand_nick')
	// 	let index_model_nick = head_nicks.indexOf('model_nick')
	// 	const models = {}
	// 	rows_models.forEach(row => {
	// 		const brandmod = row[index_brand_nick] + ' '+ row[index_model_nick]
	// 		if (!models[brandmod]) {
	// 			models[brandmod] = {
	// 				items:[],
	// 				props:[]
	// 			}
	// 		}
	// 		models[brandmod].items.push(row)
	// 	})
	// 	heads.head_item = []
	// 	heads.head_item_nicks = []
	// 	heads.head_props = []
	// 	heads.head_props_nicks = []
	// 	for (const model of models) {
	// 		models.items.forEach(item => {
	// 			item.forEach((prop,i) => {
	// 				if (models.items.every(row => row[i] == prop)) {
	// 					heads.head_props[i] = head_titles[i]
	// 					heads.head_props_nicks[i] = head_nicks[i]

	// 					models.props[i] = prop
	// 					models.items.forEach(item => { 
	// 						delete item[i]
	// 					})
	// 				} else {
	// 					heads.head_item[i] = head_titles[i]
	// 					heads.head_item_nicks[i] = head_nicks[i]
	// 				}
					
	// 			})
	// 		})
	// 	}
	// 	return models
	// },
	// addColModel: (rows_items, {head_titles, head_nicks}, model_prop) => {
	// 	const model_prop_nick = nicked(model_prop)
	// 	let index_model = head_nicks.indexOf(model_prop_nick)
	// 	if (!~index_model) return []
	// 	const rows_models = rows_items.filter(row => {
	// 		if (!row[index_model]) return false
	// 		if (row[index_model].at(0) == '.') return false
	// 		return true
	// 	})
	// 	head_titles[index_model] = 'model'
	// 	head_nicks[index_model] = 'model'
	// 	let index_model_nick = head_nicks.indexOf('model_nick')
	// 	if (!~index_model_nick) index_model_nick = head_titles.length
	// 	head_titles[index_model_nick] = 'model_nick'
	// 	head_nicks[index_model_nick] = 'model_nick'
		
	// 	rows_models.forEach(row => {
	// 		row[index_model_nick] = nicked(row[index_model])
	// 	})
	// 	return rows_models
	// },
	// addColBrand: (rows_items, {head_titles, head_nicks}, brandcol, defvalue) => {
	// 	const defvalue_nick = nicked(defvalue)
	// 	let index_brand = head_nicks.indexOf('brand')
	// 	let index_brand_nick = head_nicks.indexOf('brand_nick')
		
	// 	if (!index_brand) brand_index = head_titles.length
	// 	head_titles[index_brand] = brandcol
	// 	head_nicks[index_brand] = nicked(brandcol)

	// 	if (!index_brand_nick) index_brand_nick = head_titles.length
	// 	head_titles[index_brand_nick] = 'brand_nick'
	// 	head_nicks[index_brand_nick] = 'brand_nick'

	// 	rows_items.forEach(rows => {
	// 		rows[index_brand] = rows[index_brand] || defvalue
	// 		rows[index_brand_nick] = rows[index_brand] ? nicked(rows[index_brand]) : defvalue_nick
	// 	})
	// },
	splitHead: (rows_table) => {
		if (!rows_table.length) return {heads: {head_nicks:[], head_titles:[]}, rows_body:[]}
		const rows_body = rows_table.slice(1)
		const head_titles = rows_table[0]
		
		for (let i = head_titles.length - 1; i >= 0; i--) {
			const col = head_titles[i]
			if (!col || col.at(0) != '.') continue
			
			head_titles.splice(i, 1)
			rows_body.forEach(row => {
				return row.splice(i, 1)
			})
			
		}
		
		const head_nicks = head_titles.map(h => nicked(h))
		return {heads: {head_nicks, head_titles}, rows_body}
	},
	splitGroups: (rows_body, heads, group_title, index_group, groups) => {
		let group_nick = nicked(group_title)
		if (!groups) {
			const groups = {}
			groups[group_nick] = {
				group_nick, 
				group_title,
				parent_nick: false
			}
		}
		let wasitems = false
		const rows_items = rows_body.filter((row, i) => {
			const group_title = Dabudi.getOne(rows_body[i])
			if (!group_title) {
				wasitems = true
				row[index_group] = group_nick
				return true
			}
			if (group_title.length == 1) {
				if (!groups[group_nick].parent_nick) return //Выше root подняться не можем
				group_nick = groups[group_nick].parent_nick
				return
			}
			const parent_nick = wasitems ? groups[group_nick].parent_nick : group_nick
			group_nick = nicked(group_title)
			if (groups[group_nick]) return
			groups[group_nick] = {
				group_nick, 
				group_title:group_title.split('#')[0], 
				parent_nick
			}
		})
		return {rows_items, groups}
	}	
}