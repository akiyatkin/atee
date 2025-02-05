import Access from "/-controller/Access.js"
import Db from "/-db/Db.js"
import nicked from "/-nicked"
import unique from "/-nicked/unique.js"
import filter from "/-nicked/filter.js"
import fs from 'fs/promises'
import config from '/-config'

const Bed = {}
export default Bed

Bed.getPageByNick = async (db, page_nick) => {
	const page = await db.fetch(`
		SELECT 
			pa.page_id,
			pa.page_nick,
			pa.page_title,
			pa.group_id,
			pa.parent_id
		FROM bed_pages pa
		WHERE pa.page_nick = :page_nick
	`, {page_nick})
	return page
}
Bed.getPageById = async (db, page_id) => {
	const page = await db.fetch(`
		SELECT 
			pa.page_id,
			pa.page_nick,
			pa.page_title,
			pa.group_id,
			pa.parent_id
		FROM bed_pages pa
		WHERE pa.page_id = :page_id
	`, {page_id})
	return page
}
Bed.getChilds = async (db, group_id) => {
	if (!group_id) return []
	const childs = await db.all(`
		SELECT
			pa.page_nick,
			pa.page_title,
			pa.page_id,
			pa.group_id,
			pa.parent_id
		FROM
			bed_childs ch, bed_pages pa
		WHERE
			pa.page_id = ch.page_id
			and ch.group_id = :group_id
		ORDER BY pa.ordain
	`, {group_id})
	return childs
}
Bed.getMpage = async (db, page_id) => {
	const marks = await db.all(`
		SELECT 
			ma.prop_nick, ma.value_nick
		FROM bed_marks ma
		WHERE page_id = :page_id
	`, {page_id})
	const mpage = {}
	for (const mark of marks) {
		mpage[mark.prop_nick] ??= {}
		mpage[mark.prop_nick][mark.value_nick] ??= 1
	}	
	return mpage
}
Bed.makemd = (m) => {
	m = m.replaceAll(/([^:]+)::\./ug, ":$1:$1.")
	const mds = m.split(':').filter(s => s).map((item) => {
        item = item.replace(/\+/g, '%20')
        const r = item.split('=')
        const data = []
        data[0] = decodeURIComponent(r.shift())
        data[1] = data.length ? decodeURIComponent(r.join('=')) : ''
        return data
    })

	
	const newmd = {}

	mds.forEach(data => {
		const name = data[0]
		const val = data[1]
		const r = name.split('.')
		let root = newmd
		const last = r.pop()
		let v
		while (v = r.shift()) {
			if (typeof(root[v]) != 'object') root[v] = {}	
			root = root[v]
		}
		if (!val) delete root[last]
		else root[last] = val
	})
	return newmd
}
Bed.makemark = (md, ar = [], path = []) => {
	if (!path.length) delete md.m
	for (const name in md) {
		const val = md[name]
		if (typeof(val) == 'object') {
			Bed.makemark(val, ar, [...path, name] )	
		} else {
			ar.push([...path, name+'='+val].join('.'))
		}
	}
	return ar
}
Bed.mdfilter = (mpage, props, values) => {
	const newmpage = {}
	for (const prop_nick in mpage) {
		const prop = props[prop_nick]
		if (!prop) continue
		newmpage[prop_nick] = {}
		if (typeof mpage[prop_nick] == 'object' && prop.type == 'value') {
			for (const value_nick in mpage[prop_nick]) {
				if (!values[value_nick]) continue
				newmpage[prop_nick][value_nick] = mpage[prop_nick][value_nick]
			}
			if (!Object.keys(newmpage[prop_nick]).length) delete newmpage[prop_nick]
		} else {
			newmpage[prop_nick] = mpage[prop_nick]
		}
	}
	return newmpage
}
Bed.getmdids = async (db, marks) => {
	const prop_nicks = []
	const value_nicks = []
	for (const mall of marks) {
		for (const prop_nick in mall) {
			prop_nicks.push(prop_nick)
			const val = mall[prop_nick]
			if (typeof val == 'object') {
				for (const value_nick in val) {
					value_nicks.push(value_nick)
				}
			}	
		}
	}
	const props = await db.allto('prop_nick', `
		SELECT prop_id, prop_nick, prop_title, type, name, unit
		FROM sources_props
		WHERE prop_nick in ("${unique(prop_nicks).join('","')}")
	`)
	const values = await db.allto('value_nick', `
		SELECT value_id, value_nick, value_title
		FROM sources_values
		WHERE value_nick in ("${unique(value_nicks).join('","')}")
	`)
	return {values, props}
}

Bed.getmdwhere = async (db, md, mpage, hashs, partner = '') => {
	const mall = {...md.mget, ...mpage}

	const bind = {
		pos_entity_id: md.pos_entity_id,
		mod_entity_id: md.mod_entity_id
	}
	const where = [
		'pos.entity_id=:pos_entity_id', 
		'pos.prop_id=:mod_entity_id'
	]
	if (hashs.length) {
		const where_search = []
		for (const hash of hashs) {
			const sql = 'pos.search like "% ' + hash.join('%" and pos.search like "% ') + '%"'
			where_search.push(sql)
		}
		where.push(`(${where_search.join(' or ')})`)
	}	
	

	const from = ['sources_data pos']
	const sort = ['pos.source_ordain', 'pos.sheet_index', 'pos.row_index'] //, 'pos.prop_ordain', 'pos.multi_index'

	let i = 0

	for (const prop_nick in mall) {
		const values = mall[prop_nick]
		const prop = md.props[prop_nick]
		if (values == 'empty') {
			i++
 			from[0] += `
				LEFT JOIN sources_data da${i} on (
					da${i}.entity_id = pos.entity_id 
					and da${i}.key_id = pos.key_id
					and da${i}.multi_index = 0
					and da${i}.prop_id = ${prop.prop_id}
				)
 			`
 			where.push(`da${i}.prop_id is null`)
 		} else {
 			i++
 			from.push(`sources_data da${i}`)
			where.push(`da${i}.entity_id = pos.entity_id `)
			where.push(`da${i}.key_id = pos.key_id`)
			where.push(`da${i}.prop_id = ${prop.prop_id}`)
			const ids = []
			if (prop.type == 'number') {
				for (let name in values) {
					let value = name
					if (~['upto','from'].indexOf(name)) {
						value = values[name]
					}
					if (typeof(value) == 'string') value = value.replace('-','.')
					
					let value_nick = Number(value)
					
					if (partner?.discount && prop_nick == 'cena') {
						value_nick = value_nick * (100 + partner.discount) / 100
					}
					if (~['upto','from'].indexOf(name)) {
						sort = []
						if (name == 'upto') {
							where.push(`da${i}.number <= ${value_nick}`)
							sort.push(`da${i}.number DESC`)
						}
						if (name == 'from') {
							where.push(`da${i}.number >= ${value_nick}`)
							sort.push(`da${i}.number ASC`)
						}
					} else {
						if (value_nick == value) ids.push(value_nick)
						//else  ids.push(prop.prop_id + ', false')	
					}
				}
				if (ids.length) where.push(`da${i}.number in (${ids.join(',')})`)
			} else if (prop.type == 'value') {

				for (const value_nick in values) {

					const value = md.values[value_nick]
					ids.push(value.value_id)
				}
				where.push(`da${i}.value_id in (${ids.join(',')})`)
			} else {
				//значения других типов пропускаем
			}
 		}
	}
	
	
	return {where, from, sort, bind}
}
Bed.getModelsByItems = async (db, moditems_ids, partner, bind) => { //[{value_id, key_ids}]
	if (!moditems_ids.length) return []
	
	const modbypos = {}
	for (const row of moditems_ids) {
		row.key_ids.split(',').forEach((key_id) => {
			modbypos[key_id] = row.value_id
		})
	}

	// const conf = await config('bed')
	// const pos_entity_id = await db.col('SELECT prop_id FROM sources_props where prop_nick = :entity_nick', {entity_nick:nicked(conf.pos_entity_title)})

	const itemprops = await db.all(`
		SELECT 
			pos.key_id,
			pr.name,
			pr.unit,
			pr.prop_nick,
			pr.prop_title,
			pr.prop_id,
			va.value_nick,
			pr.type,
			nvl(nvl(va.value_title, pos.text), nvl(pos.number, pos.date)) as text
		FROM sources_data pos
				LEFT JOIN sources_values va on (va.value_id = pos.value_id)
				LEFT JOIN sources_props pr on (pr.prop_id = pos.prop_id)
		WHERE pos.entity_id = :pos_entity_id
			and key_id in (${moditems_ids.map(row => row.key_ids).join(',')})
		ORDER BY pos.source_ordain, pos.sheet_index, pos.row_index, prop_ordain, pos.multi_index
	`, bind)

	const models = Object.groupBy(itemprops, row => modbypos[row.key_id])
	const props = {}
	for (const value_id in models) {
		const items = Object.groupBy(models[value_id], row => row.key_id)
		let mod
		for (const key_id in items) {
			const iprops = Object.groupBy(items[key_id], row => row.prop_id)
			for (const prop_id in iprops) {
				const myvals = iprops[prop_id]
				props[myvals[0].prop_title] = {
					name: myvals[0].name,
					type: myvals[0].type,
					prop_nick: myvals[0].prop_nick,
					prop_title: myvals[0].prop_title,
					unit: myvals[0].unit
				}
				iprops[prop_id] = {
					prop_title: myvals[0].prop_title,
					vals: myvals
				}
			}
			const pos = iprops[bind.pos_entity_id].vals[0]
			const item = items[key_id] = {
				position_title: pos.text, 
				position_nick: pos.value_nick,
				cols:{},
				more:{}
			}
			mod = iprops[bind.mod_entity_id].vals[0]
			delete iprops[bind.pos_entity_id]
			delete iprops[bind.mod_entity_id]

			for (const prop_id in iprops) {
				const prop = iprops[prop_id]
				item.more[prop.prop_title] = prop.vals.map(val => {
					if (props[prop.prop_title].type == 'number') return Number(val.text)
					return val.text
				}).join(', ')
			}

		}
		models[value_id] = { 
			model_title: mod.text,
			model_nick: mod.value_nick,
			items: Object.values(items),
			cols:{},
			more:{}
		}
	}
	const list = Object.values(models)
	
	//Все нестандартные отличия по позициям вынесли в item_props остальное в model_props
	const columns = await db.colAll(`
		SELECT pr.prop_title
		FROM bed_columns col, sources_props pr 
		WHERE pr.prop_nick = col.prop_nick
	`)
	for (const model of list) {
		
		let model_props = {}
		for (const item of model.items) {
			for (const prop_title in item.more) {
				model_props[prop_title] = item.more[prop_title]
			}
		}
		let item_props = {}
		for (const item of model.items) {
			for (const prop_title in model_props) {
				if (item.more[prop_title] != model_props[prop_title]) {
					delete model_props[prop_title]
					item_props[prop_title] = true //нашли item у которого свойство не указано
				}
			}
		}
		item_props = Object.keys(item_props)
		
	
		
	

		
		for (const prop_title in model_props) {
			model.more[prop_title] = model_props[prop_title]
			for (const item of model.items) {
				delete item.more[prop_title]
			}
		}
		
		for (const prop_title in model.more) {
			if (~columns.indexOf(prop_title)) {
				model.cols[prop_title] = model.more[prop_title]
				delete model.more[prop_title]
			}
			for (const item of model.items) {
				for (const prop_title in item.more) {
					if (~columns.indexOf(prop_title)) {
						item.cols[prop_title] = item.more[prop_title]
						delete item.more[prop_title]
					}
				}
			}
		}
		
	}
	


	//Навели порядок в ценах
	for (const model of list) {
		Bed.prepareCost(model, partner)
		Bed.prepareCostMinMax(model)
		// let is_item_cost, is_item_oldcost
		// for (const item of model.items) {
		// 	if (item.cols[cost.prop_title]) is_item_cost = true
		// 	if (item.cols[oldcost.prop_title]) is_item_oldcost = true
				
		// }
		// if (is_item_oldcost) {
		// 	model.item_props.push(base.getPr(options, oldcost.prop_title))
		// }
		// if (is_item_cost) {
		// 	model.item_props.push(base.getPr(options, cost.prop_title))
		// }
	}
	
	// //Создали массив more
	// for (const model of list) {
	// 	model.more = {}

	// 	for (const {prop_title} of model.model_props) {
	// 		if (~options.columns.indexOf(prop_title)) continue
	// 		if (~options.systems.indexOf(prop_title)) continue
	// 		model.more[prop_title] = model[prop_title]
	// 		delete model[prop_title]
	// 	}
		
	// 	// for (const prop in model) {
	// 	// 	if (~options.columns.indexOf(prop)) continue
	// 	// 	if (~options.systems.indexOf(prop)) continue
	// 	// 	model.more[prop] = model[prop]
	// 	// 	delete model[prop]
	// 	// }

	// 	for (const item of model.items) {
	// 		item.more = {}
	// 		for (const prop in item) {
	// 			if (~options.columns.indexOf(prop)) continue
	// 			if (~options.systems.indexOf(prop)) continue
	// 			item.more[prop] = item[prop]
	// 			delete item[prop]
	// 		}
			
	// 	}
	// }

	
	//Показали все картинки itemsов у модели
	for (const model of list) {
		//if (model.images) continue
		
		const images = model.cols['Картинка'] ? model.cols['Картинка'].split(', ') : []
		for (const item of model.items) {
			if (!item.cols['Картинка']) continue
			images.push(...item.cols['Картинка'].split(', '))
		}
		if (images.length) model.images = unique(images)
	}
	
	
	return list
	// //Восстановили сортировку моделей
	// list = ids.map(id => list.find(m => m.model_id == id))
}
Bed.prepareCost = (model, partner) => {
	partner = partner || {}
	/*
	Есть items, Цена, Старая цена, discount обычные характеристики, partner не применён.
	Нет more
	Все значения объединены по запятым если дублируются. Цена justonevalue и не может дублироваться в одной строке.
	*/
	
	const cost = {prop_title: 'Цена', prop_nick: 'cena'}
	const oldcost = {prop_title: 'Старая цена', prop_nick: 'staraya-cena'}

	

	if (partner.cost) {
		const change = model => {
			if (!model.cols[partner.cost]) return
			if (partner.cost == cost.prop_title) return
			if (!model.cols[oldcost.prop_title]) {
				model.cols[oldcost.prop_title] = model.cols[cost.prop_title]
			}
			model.cols[cost.prop_title] = model.cols[partner.cost]
			//delete model[partner.cost]
		}
		change(model)
		if (model.items) for (const item of model.items) {
			change(item)
		}
	}

	

	//Цена у позиций в item_props не попадает, так как известная колонка. И в model_props не попадает так как известная колонка

	//Цена либо в model[Цена] или в items или ни там ни там. 
	//Отличие может быть в том, что у какой-то позиции цены нет а у других цена одинаковая, тогда цена в items
	//partner применяется только если нет своей Старой цены

	if (model.cols[cost.prop_title]) {
		model.cols[cost.prop_title] = Number(model.cols[cost.prop_title])
	}
	if (model.cols[oldcost.prop_title]) {
		model.cols[oldcost.prop_title] = Number(model.cols[oldcost.prop_title])
	}

	let is_item_oldcost, is_item_cost, is_model_cost, is_model_oldcost
	if (model.cols[cost.prop_title]) {
		is_model_cost = true
	} else {
		delete model.cols[cost.prop_title]
	}
	if (model.cols[oldcost.prop_title]) {
		is_model_oldcost = true
	} else {
		delete model.cols[oldcost.prop_title]
	}
	if (model.items) for (const item of model.items) {
		if (item.cols[oldcost.prop_title]) {
			item.cols[oldcost.prop_title] = Number(item.cols[oldcost.prop_title])
		}
		if (item.cols[oldcost.prop_title]) {
			is_item_oldcost = true
		}
		if (item.cols[cost.prop_title]) {
			item.cols[cost.prop_title] = Number(item.cols[cost.prop_title])
		} else {
			delete item.cols[cost.prop_title]
		}
		if (item.cols[cost.prop_title]) {
			item.cols[cost.prop_title] = Number(item.cols[cost.prop_title])
			is_item_cost = true
		} else {
			delete item.cols[cost.prop_title]
		}
	}

	let is_some_oldcost = is_item_oldcost || is_model_oldcost
	let is_some_cost = is_item_cost || is_model_cost

	// delete model.discount
	// if (model.items) for (const item of model.items) {
	// 	delete item.discount
	// }
	if (!is_some_cost) {
		delete model.cols[oldcost.prop_title]
		if (model.items) for (const item of model.items) {
			delete item.cols[oldcost.prop_title]
		}
		return
	}

	//Рассчитываем
	if (is_model_cost) {
		if (is_model_oldcost) {
			const number = Number(model.cols[cost.prop_title])
			const oldnumber = Number(model.cols[oldcost.prop_title])
			if (oldnumber) { //100
				model.cols.discount = Math.round((1 - number / oldnumber) * 100) //20
			}
		} else if (is_item_oldcost) {
			const number = Number(model.cols[cost.prop_title])
			delete model.cols[cost.prop_title]
			is_model_cost = false
			is_item_cost = true
			if (model.items) for (const item of model.items) {
				item.cols[cost.prop_title] = number
				const oldnumber = Number(item.cols[oldcost.prop_title])
				if (oldnumber) {
					item.cols.discount = Math.round((1 - number / oldnumber) * 100) //20
				} else {
					if (partner?.discount) {
						item.cols[oldcost.prop_title] = number
						item.cols[cost.prop_title] = Math.round(oldnumber * (100 - partner.discount) / 100)
						item.cols.discount = partner.discount
					}
				}
			}
		} else {
			if (partner?.discount) {
				model.cols[oldcost.prop_title] = model.cols[cost.prop_title]
				model.cols[cost.prop_title] = Math.round(model.cols[oldcost.prop_title] * (100 - partner.discount) / 100)
				model.cols.discount = partner.discount
			}
		}
	} else if (is_item_cost) {
		if (is_model_oldcost) {
			const oldnumber = Number(model.cols[oldcost.prop_title])
			delete model.cols[oldcost.prop_title]
			is_model_oldcost = false
			is_item_oldcost = true
			if (model.items) for (const item of model.items) {
				item.cols[oldcost.prop_title] = oldnumber
				const number = Number(item.cols[cost.prop_title])
				item.cols.discount = Math.round((1 - number / oldnumber) * 100) //20
			}
		} else if (is_item_oldcost) {
			if (model.items) for (const item of model.items) {
				const number = Number(item.cols[cost.prop_title])
				const oldnumber = Number(item.cols[oldcost.prop_title])
				if (oldnumber) {
					item.cols.discount = Math.round((1 - number / oldnumber) * 100) //20
				} else {
					if (partner?.discount) {
						item.cols[oldcost.prop_title] = number
						item.cols[cost.prop_title] = Math.round(number * (100 - partner.discount) / 100)
						item.cols.discount = partner.discount
					}
				}
			}	
		} else {
			if (model.items) for (const item of model.items) {
				const number = Number(item.cols[cost.prop_title])
				if (partner?.discount) {
					item.cols[oldcost.prop_title] = number
					item.cols[cost.prop_title] = Math.round(number * (100 - partner.discount) / 100)
					item.cols.discount = partner.discount
				}
			}
		}	
	}
	if (model.cols[oldcost.prop_title] == model.cols[cost.prop_title]) {
		delete model.cols[oldcost.prop_title]
		delete model.cols.discount
	}
	if (model.items) for (const item of model.items) {
		if (item.cols[oldcost.prop_title] == item.cols[cost.prop_title]) {
			delete item.cols[oldcost.prop_title]
			delete item.cols.discount
		}
	}
	
}
Bed.prepareCostMinMax = (model) => {
	const cost = {prop_title: 'Цена', prop_nick: 'cena'}
	if (!model.items) return
	
	let is_item_cost
	for (const item of model.items) {
		if (item.cols[cost.prop_title]) is_item_cost = true
	}
	if (!is_item_cost) return

	let min, max
	for (const item of model.items) {
		const number = item.cols[cost.prop_title]
		if (!number) continue
		if (!min || number < min) min = number
		if (!max || number > max) max = number
	}
	
	let min_discount, max_discount
	for (const item of model.items) {
		if (!item.cols.discount) continue
		if (!min_discount || item.cols.discount < min_discount) min_discount = item.cols.discount
		if (!max_discount || item.cols.discount > max_discount) max_discount = item.cols.discount
	}

	if (min == max) { //Цена не у всех позиций
		model.cols[cost.prop_title] = min
	} else {
		model['min'] = min
		model['max'] = max
	}
	if (max_discount) {
		model.cols.discount = max_discount
	}
}