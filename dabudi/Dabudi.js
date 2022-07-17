import { nicked } from "/-nicked/nicked.js"

/*
	const rows_source = await readXlsxFile(src)
*/

const getOne = rows => {		
	let group = false
	if (row.every(col => {
		if (!col) return true
		if (group) return false //Нашли вторую заполненную ячейку
		group = col
		return true
	})) return
	return group	
}
export const Dabudi = {
	parse: (rows_source) => {
		const {descr, rows_table} = Dabudi.splitDescr(rows_source)
		const {head_nicks, head, rows_body} = await Dabudi.splitHead(rows_table)
		const {rows_items, groups} = await Dabudi.splitGroups(rows_body, head, 'Каталог')

		Dabud.addColBrand(rows_items, head, head_nicks, 'Модель')
		const rows_modelitems = Dabud.addColModel(rows_items, head, head_nicks, 'Модель')
		const rows_models = Dabudi.makeModels(rows_modelitems, head, head_nicks)


		const data = Dabudi.makeData(rows_models, head, head_nicks)
			
	},
	makeModels: (rows_modelitems, head, head_nicks) => {
		let index_brand_nick = head_nicks.indexOf('brand_nick')
		let index_model_nick = head_nicks.indexOf('model_nick')
		const rows_models = []
		rows_modelitems.forEach(row => {
			const brandmod = row[]
			rows_models
		})
		return rows_models
	},
	addColModel: (rows_items, head, head_nicks, model_prop) => {
		const model_prop_nick = nicked(model_prop)
		let index_model = head_nicks.indexOf(model_prop_nick)
		if (!~index_model) return []
		const rows_modelitems = rows_items.filter(row => {
			if (!row[index_model]) return false
			if (row[index_model].at(0) == '.') return false
			return true
		})
		head[index_model] = 'model'
		head_nicks[index_model] = 'model'
		let index_model_nick = head_nicks.indexOf('model_nick')
		if (!~index_model_nick) index_model_nick = head.length
		head[index_model_nick] = 'model_nick'
		head_nicks[index_model_nick] = 'model_nick'
		
		rows_modelitems.forEach(row => {
			row[index_model_nick] = nicked(row[index_model])
		})
		return rows_modelitems
	},
	addColBrand: (rows_items, head, head_nicks, brand) => {
		const brand_nick = nicked(brand)
		let index_brand = head_nicks.indexOf('brand')
		let index_brand_nick = head_nicks.indexOf('brand_nick')
		
		if (!index_brand) brand_index = head.length
		head[index_brand] = 'brand'
		head_nicks[index_brand] = 'brand'

		if (!index_brand_nick) index_brand_nick = head.length
		head[index_brand_nick] = 'brand_nick'
		head_nicks[index_brand_nick] = 'brand_nick'

		rows_items.forEach(rows => {
			rows[index_brand] = rows[index_brand] || brand
			rows[index_brand_nick] = rows[index_brand] ? nicked(rows[index_brand]) : brand_nick
		})
	},
	splitHead: (rows_table) => {
		return {head_nicks, head, rows_body}
	},
	
	makeData: (rows_models, head, head_nicks) => {

	},
	splitGroups: async (rows_body, head, root) => {
		const { nicked } = await import("/-nicked/nicked.js")
		const root_nick = nicked(root)
		head.push('group_nick')
		let group_nick = root_nick
		const groups = {
			[root_nick]: {
				group_nick: root_nick, 
				group: root,
				parent_nick: false
			}	
		}
		const rows_items = rows_body.filter((row, i) => {
			const group = getOne(rows_body[i])
			if (!group) {
				row.push(group_nick)
				return true
			}
			const parent_nick = group_nick
			group_nick = nicked(group)
			if (groups[group_nick]) return
			groups[group_nick] = {group_nick, group.split('#')[0], parent_nick}
		})
		return {rows_items, groups}
	}	
}