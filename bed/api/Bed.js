import Access from "/-controller/Access.js"
import Db from "/-db/Db.js"
import nicked from "/-nicked"
import unique from "/-nicked/unique.js"
import filter from "/-nicked/filter.js"
import fs from 'fs/promises'
import config from '/-config'

const Bed = {}
export default Bed

Bed.getValueByNick = async (db, value_nick) => {
	const value = await db.fetch(`
		SELECT 
			va.value_nick,
			va.value_title,
			va.value_id
		FROM sources_values va
		WHERE va.value_nick = :value_nick
	`, {value_nick})
	return value
}
Bed.getPropByNick = async (db, prop_nick) => {
	const prop = await db.fetch(`
		SELECT 
			spr.prop_nick,
			spr.prop_title,
			spr.prop_id,
			spr.type
		FROM sources_props spr
		LEFT JOIN bed_props bpr on (spr.prop_nick = bpr.prop_nick)
		WHERE spr.prop_nick = :prop_nick
	`, {prop_nick})
	return prop
}

Bed.getGroupByNick = async (db, group_nick) => {
	const group = await db.fetch(`
		SELECT 
			gr.group_id,
			gr.group_nick,
			gr.group_title,
			gr.ordain,
			gr.group_id,
			gr.parent_id,
			pr.group_title as parent_title,
			pr.group_nick as parent_nick,
			pr.group_name as parent_name
		FROM bed_groups gr
		LEFT JOIN bed_groups pr on (pr.group_id = gr.parent_id)
		WHERE gr.group_nick = :group_nick
	`, {group_nick})
	return group
}


Bed.getGroupById = async (db, group_id) => {
	const group = await db.fetch(`
		SELECT 
			gr.group_id,
			gr.group_nick,
			gr.group_title,
			gr.group_id,
			gr.ordain,
			gr.parent_id,
			pr.group_title as parent_title,
			pr.group_nick as parent_nick,
			pr.group_name as parent_name
		FROM bed_groups gr
			LEFT JOIN bed_groups pr on (pr.group_id = gr.parent_id)
		WHERE gr.group_id = :group_id
	`, {group_id})
	return group
}
Bed.getChilds = async (db, group_id) => {
	const childs = await db.all(`
		SELECT
			gr.group_nick,
			gr.group_title,
			gr.group_name,
			gr.group_id,
			gr.parent_id
		FROM
			bed_groups gr
		WHERE
			gr.parent_id <=> :group_id
		ORDER BY gr.ordain
	`, {group_id})
	return childs
}
Bed.getMgroupDirect = async (db, group_id) => {
	const marks = await db.all(`
		SELECT 
			gs.sample_id, ma.prop_nick, ma.value_nick
		FROM bed_gsamples gs, bed_marks ma
		WHERE gs.group_id = :group_id 
			and gs.sample_id = ma.sample_id
			and ma.value_nick is not null
	`, {group_id})
	const sgroup = {}
	for (const {prop_nick, sample_id, value_nick} of marks) {
		sgroup[sample_id] ??= {}
		sgroup[sample_id][prop_nick] ??= {}
		sgroup[sample_id][prop_nick][value_nick] ??= 1
	}
	return Object.values(sgroup)
}
/*
	lgroup = [
		{
			prop_nick:[
				{value_nick}, 
				{value_nick}
			]
		}
	]
*/
Bed.mutliSMD = (psgroup, csgroup) => {
	let list = []
	if (!csgroup.length) list = psgroup
	else if (!psgroup.length) list = csgroup
	else for (const pmgroup of psgroup) {
		for (const cmgroup of csgroup) {
			const nmgroup = {...cmgroup}
			for (const prop_nick in pmgroup) {
				nmgroup[prop_nick] ??= {}
				Object.assign(nmgroup[prop_nick], pmgroup[prop_nick])
			}
			list.push(nmgroup)
		}
	}
	return list
}
Bed.getSgroup = async (db, group_id, csgroup = []) => { //lgroup поднимаемся наверх от lgroup, уточняем lgroup
	if (!group_id) return csgroup
	const psgroup = await Bed.getMgroupDirect(db, group_id)
	
	const list = Bed.mutliSMD(psgroup, csgroup)
	const parent_id = await db.col(`select parent_id from bed_groups where group_id = :group_id`, {group_id})
	return Bed.getSgroup(db, parent_id, list)
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
Bed.mdfilter = (mgroup, props, values) => {
	//Удалить фильтры свойства и значения которых не существуют
	const newmgroup = {}
	for (const prop_nick in mgroup) {
		const prop = props[prop_nick]
		if (!prop) continue
		newmgroup[prop_nick] = {}
		if (typeof mgroup[prop_nick] == 'object' && prop.type == 'value') {
			for (const value_nick in mgroup[prop_nick]) {
				if (!values[value_nick]) continue
				newmgroup[prop_nick][value_nick] = mgroup[prop_nick][value_nick]
			}
			if (!Object.keys(newmgroup[prop_nick]).length) delete newmgroup[prop_nick]
		} else {
			newmgroup[prop_nick] = mgroup[prop_nick]
		}
	}
	return newmgroup
}
Bed.getmdids = async (db, andsamples) => {

	// let samples = []
	// for (const smd of andsamples) {
	// 	samples = Bed.mutliSMD(samples, smd)
	// }

	const prop_nicks = []
	const value_nicks = []
	for (const samples of andsamples) { //and
		for (const mall of samples) { //or
			for (const prop_nick in mall) {//and
				prop_nicks.push(prop_nick)
				const val = mall[prop_nick]
				if (typeof val == 'object') {
					for (const value_nick in val) { //or
						value_nicks.push(value_nick)
					}
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
Bed.getmd = async (db, origm, group) => {
	const conf = await config('bed')
	const mgetorig = Bed.makemd(origm)
	if (group) group.sgroup = await Bed.getSgroup(db, group.group_id)
	
	const childs = await Bed.getChilds(db, group?.group_id || null)
	for (const child of childs) {
		child.sgroup = await Bed.getSgroup(db, child.group_id)
		
	}

	const schilds = childs.map(child => child.sgroup)
	const andsamples = [[mgetorig], group?.sgroup || [], ...schilds]
	const {props, values} = await Bed.getmdids(db, andsamples)

	
	const mget = Bed.mdfilter(mgetorig, props, values)
	const m = Bed.makemark(mget).join(':')

	const pos_entity_id = await db.col('SELECT prop_id FROM sources_props where prop_nick = :entity_nick', {entity_nick:nicked(conf.pos_entity_title)})
	if (!pos_entity_id) console.log('Не найден conf.pos_entity_title')
	const mod_entity_id = await db.col('SELECT prop_id FROM sources_props where prop_nick = :entity_nick', {entity_nick:nicked(conf.mod_entity_title)})
	if (!mod_entity_id) console.log('Не найден conf.mod_entity_title')
	
	
	return {m, group, mget, childs, props, values, pos_entity_id, mod_entity_id}
}
Bed.getmdwhere = (md, sgroup = [], hashs = [], partner = '') => {
	
	const samples = Bed.mutliSMD([md.mget], sgroup)
	
	//const mall = {...md.mget, ...mgroup}

	const bind = {
		pos_entity_id: md.pos_entity_id,
		mod_entity_id: md.mod_entity_id
	}
	//win.key_id - позиция, wva.value_id - модель
	const from = ['sources_winners win, sources_wvalues wva, sources_items wit']
	const where = [
		'win.entity_id = :pos_entity_id and win.prop_id = :mod_entity_id',
		'wva.entity_id = win.entity_id and wva.key_id = win.key_id and wva.prop_id = win.prop_id',
		'wit.entity_id = win.entity_id and wit.key_id = win.key_id'
	]

	if (hashs.length) {
		const where_search = []
		for (const hash of hashs) {
			const sql = 'wit.search like "% ' + hash.join('%" and wit.search like "% ') + '%"'
			where_search.push(sql)
		}
		where.push(`(${where_search.join(' or ')})`)
	}
	const sort = ['win.source_id, win.sheet_index, win.row_index, wva.multi_index']

	let i = 0
	const where_or = []
	for (const mall of samples) {
		const where_and = []
		for (const prop_nick in mall) {
			const values = mall[prop_nick]
			const prop = md.props[prop_nick]
			if (values == 'empty') {
				i++
	 			from[0] += `
					LEFT JOIN sources_wvalues da${i} on (
						da${i}.entity_id = win.entity_id 
						and da${i}.key_id = win.key_id
						and da${i}.prop_id = ${prop.prop_id}
					)
	 			`
	 			where_and.push(`da${i}.prop_id is null`)
	 		} else {
	 			i++
	 			
				const ids = []
				if (prop.type == 'number') {
					from.push(`sources_wnumbers da${i}`)
					where_and.push(`da${i}.entity_id = win.entity_id`)
					where_and.push(`da${i}.key_id = win.key_id`)
					where_and.push(`da${i}.prop_id = ${prop.prop_id}`)
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
								where_and.push(`da${i}.number <= ${value_nick}`)
								sort.push(`da${i}.number DESC`)
							}
							if (name == 'from') {
								where_and.push(`da${i}.number >= ${value_nick}`)
								sort.push(`da${i}.number ASC`)
							}
						} else {
							if (value_nick == value) ids.push(value_nick)
							//else  ids.push(prop.prop_id + ', false')	
						}
					}
					if (ids.length) where_and.push(`da${i}.number in (${ids.join(',')})`)
				} else if (prop.type == 'value') {
					from.push(`sources_wvalues da${i}`)
					where_and.push(`da${i}.entity_id = win.entity_id`)
					where_and.push(`da${i}.key_id = win.key_id`)
					where_and.push(`da${i}.prop_id = ${prop.prop_id}`)
					for (const value_nick in values) {
						const value = md.values[value_nick]
						ids.push(value?.value_id || 0)
					}
					if (ids.length) where_and.push(`da${i}.value_id in (${ids.join(',')})`)
				} else {
					//значения других типов пропускаем
				}
	 		}
		}
		if (where_and.length) where_or.push(`(${where_and.join(' and ')})`)
	}
	if (where_or.length) where.push(`(${where_or.join(' or ')})`)
	
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
			win.key_id,
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