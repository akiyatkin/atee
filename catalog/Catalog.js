import Access from "/-controller/Access.js"
import Db from "/-db/Db.js"
import nicked from "/-nicked"
import unique from "/-nicked/unique.js"
import filter from "/-nicked/filter.js"
import fs from 'fs/promises'
import config from '/-config'
import Base from '/-showcase/Base.js'
import Showcase from '/-showcase/Showcase.js'


const addParents = (group, parent_id, tree) => {
	if (!parent_id) return
	group.path.unshift(parent_id)
	addParents(group, tree[parent_id].parent_id, tree)
}

const Catalog = {}
Catalog.getItemByNick = async (db, base, brand_nick, model_nick, item_num, partner) => {
	const { vicache: cache } = base
	const brand_id = await base.getBrandIdByNick(brand_nick)
	const model_id = await base.getModelIdByNick(brand_id, model_nick)
	if (!model_id) return false
	return cache.konce('getItemByNick', model_id + ':' + item_num + ':' + partner, async () => {
		const moditem_ids = [{model_id, item_nums: String(item_num)}]
		const models = await Catalog.getModelsByItems(db, base, moditem_ids, partner)
		const item = models[0]
		//unset(item.items)
		return item
	})
}
Catalog.mdvalues = async (view, base, md, res = {}) => {
	const mdvalues = {}
	const mdprops = {}
	for (const prop_nick in md.more) {
		const prop = await base.getPropByNick(prop_nick)
		mdprops[prop_nick] = prop
		if (md.more[prop_nick] == 'empty') {
			mdvalues['empty'] = {value_title:'Нет значения', value_nick:'empty'}
		} else {
			for (const value_nick in md.more[prop_nick]) {
				if (prop.type == 'value') {
					mdvalues[value_nick] = await Catalog.getValueByNick(view, value_nick)
				} else {
					let unit = ''
					if (prop.opt?.unit) unit = '&nbsp'+prop.opt.unit
					let value_title
					if (value_nick == 'upto') {
						value_title = 'до ' + md.more[prop_nick][value_nick].replace('-','.')
					} else if (value_nick == 'from') {
						value_title = 'от ' + md.more[prop_nick][value_nick].replace('-','.')
					} else {
						value_title = Number(value_nick.replace('-','.'))
					}
					value_title += unit
					
					mdvalues[value_nick] = {value_nick, value_title}
				}
			}
		}
	}
	res.mdvalues = mdvalues
	res.mdprops = mdprops
	return res
}
Catalog.getModelsByItems = async (db, base, moditems_ids, partner) => { //[{item_nums after GROUP_CONCAT(distinct i.item_num separator ','), model_id}]
	const visitor = base.visitor
	const options = await Showcase.getOptions(visitor)
	if (!moditems_ids.length) return []
	
	const ids = unique(moditems_ids.map(it => it.model_id))
	const models = await db.all(`SELECT 
		m.model_id, 
		m.model_nick, m.model_title, b.brand_title, b.brand_nick, g.group_nick, g.group_title, g.group_id, 
		g.parent_id
		FROM showcase_models m, showcase_brands b, showcase_groups g

		WHERE m.brand_id = b.brand_id and m.group_id = g.group_id
		and m.model_id in (${ids.join(',')})
	`)
	
	
	let modids = []
	for (const mod of moditems_ids) {
		const model_id = mod.model_id
		const items = mod['item_nums'].split(',')
		items.forEach(item_num => {
			modids.push({item_num, model_id})
		})
	}
	modids = await db.all(`
		SELECT i.item_num, i.model_id
		FROM showcase_items i
		WHERE (i.model_id, i.item_num) in (${modids.map(it => '(' + it.model_id + ',' + it.item_num + ')').join(',')})
	`)
	if (!modids.length) return []
	const ips = await db.all(`
		SELECT p.ordain, ip.model_id, ip.item_num, v.value_title, ip.text, ip.number, ip.prop_id, b.bond_title, f.src
		FROM showcase_props p, showcase_iprops ip
			LEFT JOIN showcase_values v on v.value_id = ip.value_id
			LEFT JOIN showcase_bonds b on b.bond_id = ip.bond_id
			LEFT JOIN showcase_files f on f.file_id = ip.file_id
		WHERE p.prop_id = ip.prop_id and (ip.model_id, ip.item_num) in (${modids.map(it => '(' + it.model_id + ',' + it.item_num + ')').join(',')})
		order by p.ordain, -ip.ordain DESC, f.file_id
	`)

	//Создаём модели и массив items, значения свойств массивы. 
	//Некоторых свойств у item может не быть, если пропертиса для именно этой позиции нет
	let list = {}
	for (const m of models) {
		m.items = {}
		list[m.model_id] = m
	}

	for (const im of modids) {
		list[im.model_id].items[im.item_num] = { item_num:[im.item_num] }
	}
	for (const ip of ips) {
		const prop = await base.getPropById(ip.prop_id)
		let val = ip.value_title ?? ip.number ?? ip.text ?? ip.bond_title ?? ip.src
		if (prop.type == 'number') val = Number(val)
		//list[im.model_id].items[im.item_num] ??= []
		list[ip.model_id].items[ip.item_num][prop.prop_title] ??= []
		list[ip.model_id].items[ip.item_num][prop.prop_title].push(val)
	}
	list = Object.values(list).filter(mod => Object.values(mod.items).length)

	
	for (const model of list) {		
		model.items = Object.values(model.items)
	}

	//Все повторные пропертисы объединили по запятым, кроме файлов
	for (const model of list) {
		for (const item of model.items) {
			for (const prop_title in item) {
				item[prop_title] = unique(item[prop_title])
				const prop = await base.getPropByTitle(prop_title)
				if (prop.type == 'file') continue
				// if (prop.type == 'number') {
				// 	item[prop_title] = 'asdf'
				// } else {
				//if (~['item_num'].indexOf(prop_title)) continue
				item[prop_title] = item[prop_title].join(', ')
				// if (prop.type == 'number' && ~options.justonevalue_nicks.indexOf(prop.prop_nick)) {
				// 	item[prop_title] = Number(item[prop_title])
				// }
				//}
			}
		}
	}

	


	//Все нестандартные отличия по позициям вынесли в item_props остальное в model_props

	for (const model of list) {
		//console.log(7, model.items)

		const model_props = {}
		for (const item of model.items) {
			for (const prop in item) {
				model_props[prop] = item[prop]
			}
		}
		for (const item of model.items) {
			for (const prop in model_props) {
				if (item[prop] == null) item[prop] = null
			}
		}

		let item_props = Object.keys(model_props)
		const item_props_fix = []
		for (const item of model.items) {
			for (const prop in item) {
				if (model_props[prop] == null) continue //свойство модели остаётся у модели
				const val = item[prop]

				if (Array.isArray(val)) {
					const iv = val.join(', ')
					const mv = model_props[prop].join(', ')
					if (iv == mv) continue
				} else {
					if (model_props[prop] == val) continue
				}
				item_props_fix.push(prop)
				delete model_props[prop]
			}
		}
		item_props = item_props.filter(prop => !Object.hasOwn(model_props, prop))

		
		for (const prop in model_props) {

			model[prop] = model_props[prop]
		}

		for (const item of model.items) {
			for (const prop in item) {
				if (model_props[prop] == null) continue
				delete item[prop]
			}
		}

		//Оставляем только нестандартные значения
		model.item_props = item_props.filter(prop_title => !base.isColumn(model.brand_title, prop_title, options)) //До разделения на common и more
		model.model_props = Object.keys(model_props).filter(prop_title => !base.isColumn(model.brand_title, prop_title, options))
		/*
			известные колонки могут попадать в items, как показать вариативность известных колонок если это может быть единственной разницей?
		*/
		model.model_props = model.model_props.map(prop => base.getPr(options, prop))
		model.item_props = model.item_props.map(prop => base.getPr(options, prop))
		
	}


	

	//Какие пропертисы надо показать на карточке
	for (const model of list) {		
		let { props } = await Catalog.getGroupOpt(db, visitor, model.group_id)
		
		model.card_props = props.map(prop => ({...prop}))
		model.card_props = await filter(model.card_props, async (pr) => {
			const p = pr.value_title
			
			if (model[p] != null) {
				pr.value = model[p]
				return true
			}
			
			const ppp = await base.getPropByTitle(p)
			let ar = []

			for (const item of model.items) {
				if (item[p] == null) continue
				if (ppp.type === 'text') {
					if (Array.isArray(item[p])) {
						item[p].forEach(v => ar.push(v))
					} else {
						ar.push(item[p])
					}
				} else {
					item[p].split(', ').forEach(v => ar.push(v))
				}
			}
			ar = unique(ar)
			if (!ar.length) return false
			
			if (pr.type == 'number' && ar.length > 5) {
				const min = Math.min(...ar)
				const max = Math.max(...ar)
				if (min == max) pr.value = min
				else pr.value = `<nobr>${min}&mdash;${max}</nobr>`
			} else {
				pr.value = unique(ar).join(', ')
			}
			return true
		})
	}

	//Навели порядок в ценах
	const cost = await base.getPropByTitle('Цена')
	const oldcost = await base.getPropByTitle('Старая цена')
	for (const model of list) {
		await Catalog.prepareCost(base, model, partner)
		await Catalog.prepareCostMinMax(base, model)

		let is_item_cost, is_item_oldcost
		for (const item of model.items) {
			if (item[cost.prop_title]) is_item_cost = true
			if (item[oldcost.prop_title]) is_item_oldcost = true
				
		}
		// if (is_item_oldcost) {
		// 	model.item_props.push(base.getPr(options, oldcost.prop_title))
		// }
		if (is_item_cost) {
			model.item_props.push(base.getPr(options, cost.prop_title))
		}
	}

	//Создали массив more
	for (const model of list) {
		model.more = {}

		for (const {prop_title} of model.model_props) {
			if (~options.columns.indexOf(prop_title)) continue
			if (~options.systems.indexOf(prop_title)) continue
			model.more[prop_title] = model[prop_title]
			delete model[prop_title]
		}
		
		// for (const prop in model) {
		// 	if (~options.columns.indexOf(prop)) continue
		// 	if (~options.systems.indexOf(prop)) continue
		// 	model.more[prop] = model[prop]
		// 	delete model[prop]
		// }

		for (const item of model.items) {
			item.more = {}
			for (const prop in item) {
				if (~options.columns.indexOf(prop)) continue
				if (~options.systems.indexOf(prop)) continue
				item.more[prop] = item[prop]
				delete item[prop]
			}
			
		}
	}
	//Показали все картинки itemsов у модели
	for (const model of list) {
		if (model.images) continue
		const images = []
		for (const item of model.items) {
			if (!item.images) continue
			images.push(...item.images)
		}
		if (images.length) model.images = unique(images)
	}
	


	
	// for (const model of list) {
	// 	//Выбор обязателен если несколько позиций. Но если позиция одна то item_num сразу в моделе есть
	// 	if (model.items.length != 1) continue
	// 	delete model.items
	// }

	//Восстановили сортировку моделей
	list = ids.map(id => list.find(m => m.model_id == id))
	
	return list
}
Catalog.prepareCost = async (base, model, partner) => {
	partner = partner || {}
	/*
	Есть items, Цена, Старая цена, discount обычные характеристики, partner не применён.
	Нет more
	Все значения объединены по запятым если дублируются. Цена justonevalue и не может дублироваться в одной строке.
	*/
	const cost = await base.getPropByTitle('Цена')
	const oldcost = await base.getPropByTitle('Старая цена')

	if (partner.cost) {
		const change = model => {
			if (!model[partner.cost]) return
			if (partner.cost == cost.prop_title) return
			if (!model[oldcost.prop_title]) {
				model[oldcost.prop_title] = model[cost.prop_title]
			}
			model[cost.prop_title] = model[partner.cost]
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

	if (model[cost.prop_title]) {
		model[cost.prop_title] = Number(model[cost.prop_title])
	}
	if (model[oldcost.prop_title]) {
		model[oldcost.prop_title] = Number(model[oldcost.prop_title])
	}

	let is_item_oldcost, is_item_cost, is_model_cost, is_model_oldcost
	if (model[cost.prop_title]) {
		is_model_cost = true
	} else {
		delete model[cost.prop_title]
	}
	if (model[oldcost.prop_title]) {
		is_model_oldcost = true
	} else {
		delete model[oldcost.prop_title]
	}
	if (model.items) for (const item of model.items) {
		if (item[oldcost.prop_title]) {
			item[oldcost.prop_title] = Number(item[oldcost.prop_title])
		}
		if (item[oldcost.prop_title]) {
			is_item_oldcost = true
		}
		if (item[cost.prop_title]) {
			item[cost.prop_title] = Number(item[cost.prop_title])
		} else {
			delete item[cost.prop_title]
		}
		if (item[cost.prop_title]) {
			item[cost.prop_title] = Number(item[cost.prop_title])
			is_item_cost = true
		} else {
			delete item[cost.prop_title]
		}
	}

	let is_some_oldcost = is_item_oldcost || is_model_oldcost
	let is_some_cost = is_item_cost || is_model_cost

	delete model.discount
	if (model.items) for (const item of model.items) {
		delete item.discount
	}
	if (!is_some_cost) {
		delete model[oldcost.prop_title]
		if (model.items) for (const item of model.items) {
			delete item[oldcost.prop_title]
		}
		return
	}

	//Рассчитываем
	if (is_model_cost) {
		if (is_model_oldcost) {
			const number = Number(model[cost.prop_title])
			const oldnumber = Number(model[oldcost.prop_title])
			if (oldnumber) { //100
				model.discount = Math.round((1 - number / oldnumber) * 100) //20
			}
		} else if (is_item_oldcost) {
			const number = Number(model[cost.prop_title])
			delete model[cost.prop_title]
			is_model_cost = false
			is_item_cost = true
			if (model.items) for (const item of model.items) {
				item[cost.prop_title] = number
				const oldnumber = Number(item[oldcost.prop_title])
				if (oldnumber) {
					item.discount = Math.round((1 - number / oldnumber) * 100) //20
				} else {
					if (partner?.discount) {
						item[oldcost.prop_title] = number
						item[cost.prop_title] = Math.round(oldnumber * (100 - partner.discount) / 100)
						item.discount = partner.discount
					}
				}
			}
		} else {
			if (partner?.discount) {
				model[oldcost.prop_title] = model[cost.prop_title]
				model[cost.prop_title] = Math.round(model[oldcost.prop_title] * (100 - partner.discount) / 100)
				model.discount = partner.discount
			}
		}
	} else if (is_item_cost) {
		if (is_model_oldcost) {
			const oldnumber = Number(model[oldcost.prop_title])
			delete model[oldcost.prop_title]
			is_model_oldcost = false
			is_item_oldcost = true
			if (model.items) for (const item of model.items) {
				item[oldcost.prop_title] = oldnumber
				const number = Number(item[cost.prop_title])
				item.discount = Math.round((1 - number / oldnumber) * 100) //20
			}
		} else if (is_item_oldcost) {
			if (model.items) for (const item of model.items) {
				const number = Number(item[cost.prop_title])
				const oldnumber = Number(item[oldcost.prop_title])
				if (oldnumber) {
					item.discount = Math.round((1 - number / oldnumber) * 100) //20
				} else {
					if (partner?.discount) {
						item[oldcost.prop_title] = number
						item[cost.prop_title] = Math.round(number * (100 - partner.discount) / 100)
						item.discount = partner.discount
					}
				}
			}	
		} else {
			if (model.items) for (const item of model.items) {
				const number = Number(item[cost.prop_title])
				if (partner?.discount) {
					item[oldcost.prop_title] = number
					item[cost.prop_title] = Math.round(number * (100 - partner.discount) / 100)
					item.discount = partner.discount
				}
			}
		}	
	}
	if (model[oldcost.prop_title] == model[cost.prop_title]) {
		delete model[oldcost.prop_title]
		delete model.discount
	}
	if (model.items) for (const item of model.items) {
		if (item[oldcost.prop_title] == item[cost.prop_title]) {
			delete item[oldcost.prop_title]
			delete item.discount
		}
	}
	
}
Catalog.prepareCostMinMax = async (base, model) => {
	if (!model.items) return
	const cost = await base.getPropByTitle('Цена')
	
	let is_item_cost
	for (const item of model.items) {
		if (item[cost.prop_title]) is_item_cost = true
	}
	if (!is_item_cost) return

	let min, max
	for (const item of model.items) {
		const number = item[cost.prop_title]
		if (!number) continue
		if (!min || number < min) min = number
		if (!max || number > max) max = number
	}
	
	let min_discount, max_discount
	for (const item of model.items) {
		if (!item.discount) continue
		if (!min_discount || item.discount < min_discount) min_discount = item.discount
		if (!max_discount || item.discount > max_discount) max_discount = item.discount
	}

	if (min == max) { //Цена не у всех позиций
		model[cost.prop_title] = min
	} else {
		model['min'] = min
		model['max'] = max
	}
	if (max_discount) {
		model.discount = max_discount
	}
}
Catalog.getGroupOpt = async (db, visitor, group_id) => {
	const options = await Showcase.getOptions(visitor)
	const group = await Catalog.getGroupById(db, visitor, group_id)
	let opt = {}

	const groupids = {}
	for (const group_title in options.groups) {
		const ids = await db.colAll('SELECT group_id FROM showcase_groups where group_title = :group_title', { group_title })
		ids.forEach(id => {
			groupids[id] = options.groups[group_title]	
		})
	}


	group.path.forEach(parent_id => {
		if (!groupids[parent_id]) return
		opt = {...opt, ...groupids[parent_id]}
	})
	if (groupids[group_id]) opt = {...opt, ...groupids[group_id]}
	opt.props ??= []
	opt.props = opt.props.filter(prop => options.props[prop]).map(prop => {
		return options.props[prop]
	})
	return opt
}
Catalog.getGroupById = async (db, visitor, id) => {
	const groups = await Catalog.getTree(db, visitor)
	return groups[id]
}

Catalog.getTree = async (db, visitor) => {
	const options = await Showcase.getOptions(visitor)
	const cache = Access.relate(Catalog)
	return cache.once('getTree', async () => {
		const tree = {}
		const rows = await db.all(`
			SELECT group_id, parent_id, group_nick, icon_id, group_title 
			FROM showcase_groups 
			ORDER by ordain
		`)

		for (const name of ['group_id','parent_id']){
			for (const group of rows) group[name] = Number(group[name])
		}


		for (const group of rows) {
			tree[group.group_id] = group
		}
		
		
		
		for (const group of rows) {
			group.path = []
			addParents(group, group.parent_id, tree)
			//if (!group.parent_id) continue
			//tree[group.parent_id].groups.push(group.group_id)
		}
		for (const group of rows) {
			group.inside = await db.col('SELECT count(*) from showcase_models m, showcase_items i where m.model_id = i.model_id and i.item_num = 1 and m.group_id = :group_id', group)
			group.indepth = group.inside
			group.groups = [group.group_id]
			group.childs = []
		}
		
		for (const group of rows) {
			group.path.forEach(parent_id => {
				const parent = tree[parent_id]
				parent.indepth += group.inside
			})
		}
		for (const group of rows) {
			const group_id = group.group_id
			if (!tree[group_id].indepth) delete tree[group_id]
		}
		for (const group of rows) {
			if (!group.indepth) continue
			const group_id = group.group_id
			if (group.parent_id) {
				const parent = tree[group.parent_id]
				parent.childs.push(group.group_id)
			}
			group.path.forEach(parent_id => {
				const parent = tree[parent_id]
				parent.groups.push(group.group_id)
			})
		}
		// for (const group_id in tree) {
		// 	const group = tree[group_id]
		// 	if (!group.indepth) delete tree[group_id]
		// 	if (group.group_nick == 'dopolnitelnye-prinadlejnosti') {
		// 		console.log(group)
		// 	}
		// 	if (group.group_nick == 'telnye-prinadlejnosti-zapchasti') {
		// 		console.log(group)
		// 	}
		// }

		return tree
	})
}
Catalog.getGroups = async (view) => { //depricated
	const { db, base, options } = await view.gets(['db', 'options','base'])
	const cache = base.dbcache

	return cache.once('getGroups', async () => {
		const tree = await Catalog.getTree(db, view.visitor)
		const groups = {}
		for (const group_id in tree) {
			groups[tree[group_id].group_nick] = tree[group_id]
		}
		return groups	
	})
}
Catalog.getMainGroups = async (view, prop_title = '') => {
	const { db, base, options } = await view.gets(['db', 'options','base'])
	const cache = base.dbcache

	return cache.konce('getMainGroups', prop_title, async () => {
		const root_id = await base.getGroupIdByNick(options.root_nick)
		if (!root_id) return view.err('Не найдена верхняя группа')

		const tree = await Catalog.getTree(db, view.visitor)

		const groups = tree[root_id].groups
		
		const childs = groups.filter(gid => tree[gid].parent_id == root_id && tree[gid].icon_id).map(gid => ({...tree[gid]}))

		if (prop_title) {
			const prop = await base.getPropByTitle(prop_title)
			for (const group of childs) {
				group.types = await db.all(`
					SELECT distinct v.value_title, v.value_nick
					FROM 
						showcase_values v, showcase_iprops ip, showcase_items i, showcase_models m,
						showcase_props p
					WHERE v.value_id = ip.value_id and i.model_id = ip.model_id and i.item_num = ip.item_num
					and ip.prop_id = :prop_id
					and i.model_id = m.model_id and m.group_id in (${group.groups.join(',')})
					and p.prop_id = ip.prop_id
					order by p.ordain
				`, prop)
			

				group.childs = group.childs.map(group_id => {
					return {
						group_title: tree[group_id].group_title,
						group_nick: tree[group_id].group_nick
					}
				})
			}
			return {childs, prop}
		} else {
			return {childs}
		}
	})
}
Catalog.getFilterConf = async (view, prop, group_id, md, partner) => {
	const { db, base, options } = await view.gets(['db', 'options','base'])
	const cache = base.dbcache
	const group = await Catalog.getGroupById(db, view.visitor, group_id)
	const prop_id = prop.prop_id
	if (!~['value','brand','number'].indexOf(prop.type)) return false
	
	const filter = {...(options.props[prop.prop_title]?.filter || {}), ...prop}
	filter.tpl ??= 'select'
	if (filter.slider) {
		if (prop.type != 'number') return false
		const row = await db.fetch(`
			SELECT min(ip.number) as min, max(ip.number) as max
			FROM showcase_iprops ip, showcase_models m
			WHERE m.model_id = ip.model_id
			and ip.prop_id = :prop_id
			and m.group_id in (${group.groups.join(',')})
		`, {
			prop_id
		})
		if (row.min === row.max) return false
		filter.min = Number(row.min)
		filter.max = Number(row.max)
		if (!filter.step) {
			const spread = filter.max - filter.min
			const makefilter = (step) => {
				filter.step = step
				filter.min = Math.floor(filter.min / step) * step
				filter.max = Math.ceil(filter.max / step) * step
			}
			if (spread > 1000000) {
				makefilter(50000)
			} else if (spread > 100000) {
				makefilter(5000)
			} else if (spread > 10000) {
				makefilter(500)
			} else if (spread > 1000) {
				makefilter(50)
			} else if (spread > 100) {
				makefilter(5)
			} else {
				makefilter(1)
			}
		}
		

		return filter
	}
	if (prop.type == 'value') {
		const order = filter.order || 'v.value_title'
		filter.values = await db.all(`
			SELECT distinct v.value_nick, v.value_title
			FROM showcase_iprops ip, showcase_models m, showcase_values v
			WHERE m.model_id = ip.model_id
			and ip.prop_id = :prop_id
			and v.value_id = ip.value_id
			and m.group_id in (${group.groups.join(',')})
			ORDER BY ${order}
		`, {
			prop_id
		})
	} else if (prop.type == 'number') {
		const order = filter.order || 'ip.number'
		filter.values = await db.all(`
			SELECT distinct ip.number as value_nick
			FROM showcase_iprops ip, showcase_models m
			WHERE m.model_id = ip.model_id
			and ip.prop_id = :prop_id
			and m.group_id in (${group.groups.join(',')})
			ORDER BY ${order}
		`, {
			prop_id
		})
	} else if (prop.type == 'brand') {
		const order = filter.order || 'b.ordain'
		filter.values = await db.all(`
			SELECT distinct b.brand_nick as value_nick, b.brand_title as value_title
			FROM showcase_models m, showcase_brands b, showcase_items i
			WHERE i.model_id = m.model_id and i.item_num = 1 and m.brand_id = b.brand_id and m.group_id in (${group.groups.join(',')})
			ORDER BY ${order}
		`)
	} else {
		return false
	}
	const selected = md.more?.[prop.prop_nick]
	if (!selected && filter.values.length < 1) return false

	if (selected) {
		const values_nicks = Object.keys(selected)
		for (const value_nick of values_nicks) {
			if (prop.type == 'value') {
				if (filter.values.some(v => v.value_nick == value_nick)) continue
				const value = await Catalog.getValueByNick(view, value_nick)
				filter.values.push(value)
			} else if (prop.type == 'number') {
				if (filter.values.some(v => Number(v.value_nick) == Number(value_nick.replace('-','.')))) continue
				filter.values.push({value_nick})
			} else if (prop.type == 'brand') {
				if (filter.values.some(v => v.value_nick == value_nick)) continue
				const brand = await Catalog.getBrandByNick(db, value_nick)
				filter.values.push({value_nick, value_title: brand.brand_title})
			}
		}
	}
	//if (!selected && filter.values.length < 2) return false
	if (!selected && filter.values.length < 1) return false

	
	const nmd = {...md}
	if (prop.type == 'brand') {
		delete nmd.brand
	} else {
		nmd.more = {...md.more}
		delete nmd.more?.[prop.prop_nick]
	}
	nmd.m = Catalog.makemark(nmd).join(':')

	const {from, where} = await Catalog.getmdwhere(view, nmd, partner)
	if (prop.type == 'value') {
		filter.remains = await db.all(`
			SELECT distinct v.value_nick
			FROM (${from.join(', ')}) 
				left join showcase_iprops ip on (ip.prop_id = ${prop.prop_id} and ip.model_id = i.model_id and ip.item_num = i.item_num) 
				left join showcase_values v on (v.value_id = ip.value_id)
			WHERE ${where.join(' and ')}
		`)
	} else if (prop.type == 'number') {
		filter.remains = await db.all(`
			SELECT distinct ip.number as value_nick
			FROM (${from.join(', ')})
				left join showcase_iprops ip on (ip.prop_id = ${prop.prop_id} and ip.model_id = i.model_id and ip.item_num = i.item_num) 
			WHERE ${where.join(' and ')}
		`)
	} else if (prop.type == 'brand') {
		const sql = `
			SELECT distinct b.brand_nick as value_nick
			FROM (${from.join(', ')}) 
				left join showcase_brands b on (b.brand_id = m.brand_id)
			WHERE ${where.join(' and ')}
		`
		filter.remains = await db.all(sql)
	}
	filter.values.forEach(row => {
		row.mute = !filter.remains.some(v => v.value_nick == row.value_nick)
	})
	if (prop.type == 'number') {
		filter.values.forEach(row => {
			row.value_title = Number(row.value_nick)
			row.value_nick = nicked(row.value_title)
		})
	}
	return filter
}
Catalog.getAllCount = async (view) => {	
	const { options, db } = await view.gets(['options', 'db'])
	const root = await Catalog.getGroupByNick(view, options.root_nick)
	const tree = await Catalog.getTree(db, view.visitor)
	return {count:root.indepth, gcount: groups.length - 1, list:[], groups:root.childs.map(group_id => tree[group_id])}
}
Catalog.getGroupByNick = async (view, nick) => {
	const groups = await Catalog.getGroups(view)
	return groups[nick]
}




Catalog.getBondById = async (view, bond_nick) => {
	const { base, db } = await view.gets(['base', 'db'])
	const cache = base.dbcache
	return cache.konce('getBondById', bond_nick, () => {
		return db.fetch('SELECT bond_nick, bond_title, bond_id FROM showcase_bonds WHERE bond_nick = :bond_nick', { bond_nick })
	})
}
Catalog.getBondByNick = async (view, bond_nick) => {
	const { base, db } = await view.gets(['base', 'db'])
	const bond_id = await base.getBondIdByNick(bond_nick)
	return Catalog.getBondById(view, bond_id)
}


Catalog.getValueById = async (view, value_id) => {
	const { base, db } = await view.gets(['base', 'db'])
	const cache = base.dbcache
	return cache.konce('getValueById', value_id, () => {
		return db.fetch('SELECT value_nick, value_title, value_id FROM showcase_values WHERE value_id = :value_id', { value_id })
	})
}
Catalog.getValueByNick = async (view, value_nick) => {
	const { base, db } = await view.gets(['base', 'db'])
	const cache = base.vicache
	const value_id = await base.getValueIdByNick(value_nick)
	return Catalog.getValueById(view, value_id)
}





Catalog.getPathNickByGroupId = async (view, id) => {
	const db = await view.get('db')
	const group = await Catalog.getGroupById(db, view.visitor, id)
	const path = [...group.path]
	path.push(id)
	return Promise.all(path.map(async (id) => {
		const group = await Catalog.getGroupById(db, view.visitor, id)
		return group.group_nick
	}))
}




Catalog.getBrandById = async (view, brand_id) => {
	const { base, db } = await view.gets(['base', 'db'])
	const cache = base.vicache

	return cache.konce('getBrandById', brand_id, async () => {
		const brands = await Catalog.getBrands(db)
		for (const brand_nick in brands) {
			const brand = brands[brand_nick]
			if (brand.brand_id == brand_id) return brand
		}
	})
}
Catalog.getBrandByNick = async (db, nick) => {
	const brands = await Catalog.getBrands(db)
	return brands[nick]
}
Catalog.getBrands = async (db) => {
	const cache = Access.relate(Catalog)
	return cache.once('getBrands', async () => db.alltoint('brand_nick', `
		SELECT b.brand_id, b.brand_nick, b.brand_title, f.src as logo, b.ordain
		FROM showcase_brands b 
		LEFT JOIN showcase_files f on f.file_id = b.logo_id
		ORDER by b.ordain
	`,[], ['brand_id']))
}



Catalog.getModelByNick = async (view, brand_nick, model_nick, partner = '') => {
	const { base, db } = await view.gets(['base', 'db'])
	const cache = base.vicache
	const brand_id = await base.getBrandIdByNick(brand_nick)
	const model_id = await base.getModelIdByNick(brand_id, model_nick)
	return cache.konce('getModelByNick', model_id + ':' + partner, async () => {
		const moditem_ids = await db.all(`
			SELECT i.model_id, GROUP_CONCAT(i.item_num separator ',') as item_nums
			FROM 
				showcase_items i
			WHERE i.model_id = :model_id
			GROUP BY i.model_id
		`, { model_id })
		const models = await Catalog.getModelsByItems(db, base, moditem_ids, partner)
		return models[0]
	})
}
Catalog.makemark = (md, ar = [], path = []) => {
	if (!path.length) delete md.m
	for (const name in md) {
		const val = md[name]
		if (typeof(val) == 'object') {
			Catalog.makemark(val, ar, [...path, name] )	
		} else {
			ar.push([...path, name+'='+val].join('.'))
		}
	}
	return ar
}
Catalog.getmdwhere = async (view, md, partner = '') => {
	const { base, db } = await view.gets(['base', 'db'])
	const cache = base.vicache

	return cache.konce('getmdwhere', md.m, async () => {
		const groupnicks = await Catalog.getGroups(view)
		const brandnicks = await Catalog.getBrands(db)
		const where = []
		if (md.group) {
			let group_ids = []
			Object.keys(md.group).forEach(nick => {
				if (groupnicks[nick]) groupnicks[nick].groups.forEach(id => group_ids.push(id))
			})
			group_ids = unique(group_ids)
			if (group_ids.length) where.push(`m.group_id in (${group_ids.join(',')})`)
		}
		if (md.brand) {
			const brand_ids = Object.keys(md.brand).map(nick => brandnicks[nick].brand_id)
			where.push(`m.brand_id in (${brand_ids.join(',')})`)
		}
		if (md.search) {
			const hashs = unique(nicked(md.search).split('-').filter(val => !!val)).sort()
			if (hashs.length) {
				where.push(`m.search like "% ${hashs.join('%" and m.search like "% ')}%"`)
			}
		}
		const from = ['showcase_models m','showcase_items i']
		let sort = ['min(i.ordain)']
		where.push('i.model_id = m.model_id')
		let iprops_dive = false
		if (md.more) {
			let i = 0
			for (const prop_nick in md.more) {
				i++
				iprops_dive = true


				
				let prop
				if (partner?.cost && prop_nick == 'cena') {
					prop = await base.getPropByTitle(partner.cost)
				} else {
					prop = await base.getPropByNick(prop_nick)
				}
				
				

				const values = md.more[prop_nick]

				if (values == 'empty') {
					from[1] = `showcase_items i left join showcase_iprops ip${i} on (ip${i}.model_id = i.model_id and ip${i}.item_num = i.item_num and ip${i}.prop_id = ${prop.prop_id})`
					where.push(`ip${i}.prop_id is null`)
				} else {
					from.push(`showcase_iprops ip${i}`)
					where.push(`ip${i}.model_id = i.model_id`)
					where.push(`ip${i}.item_num = i.item_num`)
					where.push(`ip${i}.prop_id = ${prop.prop_id}`)
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
									where.push(`ip${i}.number <= ${value_nick}`)
									sort.push(`ip${i}.number DESC`)
								}
								if (name == 'from') {
									where.push(`ip${i}.number >= ${value_nick}`)
									sort.push(`ip${i}.number ASC`)
								}
							} else {
								if (value_nick == value) ids.push(value_nick)
								else  ids.push(prop.prop_id + ', false')	
							}
							
						}
						if (ids.length) where.push(`ip${i}.number in (${ids.join(',')})`)
					} else if (prop.type == 'value') {
						for (const value in values) {
							const value_nick = nicked(value)
							let value_id = await base.getValueIdByNick(value_nick)
							if (!value_id) value_id = 0
							ids.push(value_id)
						}
						where.push(`ip${i}.value_id in (${ids.join(',')})`)
					} else {
						//значения других типов пропускаем
					}
				}
			}
		}
		if (!iprops_dive) where.push('(select i.item_num from showcase_items i where i.model_id = m.model_id limit 1) is not null')	
		return {where, from, sort}
	})
}
Catalog.getGroupIds = async (view, md, partner) => {
	const { db } = await view.gets(['db'])
	const {where, from} = await Catalog.getmdwhere(view, md, partner)
	const res_ids = await db.colAll(`
		SELECT distinct g.group_id 
		FROM (${from.join(', ')})
		LEFT JOIN showcase_groups g on m.group_id = g.group_id
		WHERE ${where.join(' and ')}
		ORDER BY g.ordain
	`)
	return res_ids
}
Catalog.getMainGroup = async (view, md) => {
	const { options } = await view.gets(['options'])
	const groupnicks = await Catalog.getGroups(view)
	const root = groupnicks[options.root_nick]
	let group = root
	if (!md.group) return group
	const group_nicks = Object.keys(md.group)
	if (group_nicks.length > 0) group = groupnicks[group_nicks[0]]
	return group
}
Catalog.getMainBrand = async (db, md) => {
	if (!md.brand) return
	const brand_nicks = Object.keys(md.brand)
	if (brand_nicks.length != 1) return
	const brandnicks = await Catalog.getBrands(db)
	return brandnicks[brand_nicks[0]]
}
export default Catalog


