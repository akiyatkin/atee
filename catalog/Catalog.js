import { Access } from "/-controller/Access.js"
import { Db } from "/-db/Db.js"
import { nicked } from "/-nicked/nicked.js"
import { unique } from "/-nicked/unique.js"
import { filter } from "/-nicked/filter.js"

export const Catalog = {}

Catalog.getModelsByItems = async (moditems_ids, partner) => { //[{item_nums after group_concats, model_id}]
	//Заполнили основными данными
	if (!moditems_ids.length) return []
	const db = await new Db().connect()
	const models = await db.all(`SELECT 
		m.model_id, m.model_nick, m.model_title, b.brand_title, b.brand_nick, g.group_nick, g.group_title, g.group_id
		FROM showcase_models m, showcase_brands b, showcase_groups g

		WHERE m.brand_id = b.brand_id and m.group_id = g.group_id
		and m.model_id in (${unique(moditems_ids.map(it => it.model_id)).join(',')})
	`)

	const modids = []
	for (const mod of moditems_ids) {
		const model_id = mod.model_id
		const items = mod['item_nums'].split(',')
		items.forEach(item_num => {
			modids.push({item_num, model_id})
		})
	}

	const ips = await db.all(`
		SELECT ip.model_id, ip.item_num, v.value_title, ip.text, ip.number, ip.prop_id
		FROM showcase_iprops ip
			LEFT JOIN showcase_values v on v.value_id = ip.value_id
		WHERE (ip.model_id, ip.item_num) in (${modids.map(it => '(' + it.model_id + ',' + it.item_num + ')').join(',')})
	`)
	
	let list = {}
	for (const m of models) {
		m.items = {}
		list[m.model_id] = m
	}
	for (const im of modids) {
		list[im.model_id].items[im.item_num] = { item_num:im.item_num }
	}
	for (const ip of ips) {
		const prop = await Catalog.getPropById(ip.prop_id)
		let val = ip.value_title ?? ip.number ?? ip.text
		if (prop.type == 'number') val = Number(val)
		list[ip.model_id].items[ip.item_num][prop.prop_title] ??= []
		list[ip.model_id].items[ip.item_num][prop.prop_title].push(val)
	}
	list = Object.values(list)
	for (const model of list) {
		model.items = Object.values(model.items)
	}
	for (const model of list) {
		for (const item of model.items) {
			for (const prop in item) {
				if (~['slides','files','images','texts','videos','item_num'].indexOf(prop)) continue
				item[prop] = item[prop].join(', ')
			}
		}
	}
	for (const model of list) {
		const common = model.items[0]
		for (const item of model.items) {
			for (const prop in item) {
				if (common[prop] == null) continue
				const val = item[prop]
				if (common[prop] === val) continue
				delete common[prop]
			}
		}
		for (const prop in common) {
			model[prop] = common[prop]
		}
		for (const item of model.items) {
			for (const prop in item) {
				if (common[prop] == null) continue
				delete item[prop]
			}
		}
	}
	for (const model of list) {
		const { props } = await Catalog.getGroupOptions(model.group_id)
		model.props = [...props]
		model.props = await filter(model.props, async (pr) => {
			const p = pr.prop_title
			if (model[p] != null) return true
			
			const ppp = await Catalog.getProp(p)
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
			if (!ar.length) return false
			ar = unique(ar)
			model[p] = ar.join(', ')
			return true
		})
	}


	const options = await Catalog.getOptions()
	
	for (const model of list) {
		model.more = {}
		for (const prop in model) {
			if (~options.columns.indexOf(prop)) continue
			model.more[prop] = model[prop]
			delete model[prop]
		}
		for (const item of model.items) {
			item.more = {}
			for (const prop in item) {
				if (~options.columns.indexOf(prop)) continue
				item.more[prop] = item[prop]
				delete item[prop]
			}
			
		}
	}
	
	
	const cost = await Catalog.getProp('Цена')
	const oldcost = await Catalog.getProp('Старая цена')
	for (const model of list) {
		if (model[cost.prop_title]) { //80
			if (model[oldcost.prop_title]) {		//100
				model.discount = Math.round((1 - model[cost.prop_title]/model[oldcost.prop_title]) * 100) //20
			}
			continue
		}
		let min, max
		for (const item of model.items) {
			const val = item[cost.prop_title]
			if (!val) continue
			
			if (item[oldcost.prop_title]) {
				item.discount = Math.round((1 - item[cost.prop_title]/item[oldcost.prop_title]) * 100) //20
			}
			
			if (!min || val < min) min = val
			if (!max || val > max) max = val
		}
		if (min == max) {
			model[cost.prop_title] = min
		} else {
			model['min'] = min
			model['max'] = max
		}
	}
	if (partner?.discount) {
		for (const model of list) {
			if (model[oldcost.prop_title]) continue
			if (!model[cost.prop_title]) {
				for (const item of model.items) {
					if (item[oldcost.prop_title]) continue
					if (!item[cost.prop_title]) continue
					item[oldcost.prop_title] = item[cost.prop_title]
					item[cost.prop_title] = Math.round(item[oldcost.prop_title] * (1 - partner.discount))
					item.discount = partner.discount
				}
				continue
			}
			model[oldcost.prop_title] = model[cost.prop_title]
			model[cost.prop_title] = Math.round(model[oldcost.prop_title] * (1 - partner.discount))
			model.discount = partner.discount
		}
	}
	for (const model of list) {
		//Выбор обязателен если несколько позиций. Но если позиция одна то item_num сразу в моделе есть
		if (model.items.length != 1) continue
		delete model.items
	}
	return list
}
Catalog.getOptions = Access.cache(async () => {
	const {default: config} = await import('/showcase.json', {assert:{type:"json"}})
	const { options } = await import('/'+config.options)
	const db = await new Db().connect()
	options.groups ??= {}
	options.groupids = {}
	options.partners ??= {}
	options.props ??= []
	options.columns ??= []
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
		if (!p.prop_nick) p.prop_nick = nicked(p.value_nick)  //Ник самого свойства
		//const prop = await Catalog.getProp(p.prop_title)	
		//p.prop_nick = prop.prop_nick
	}
	return options
})

Catalog.getValue = async (db, model, nickortitle, item_num = 1) => {
	const { model_id } = model
	const prop = await Catalog.getProp(nickortitle)
	if (!prop) return
	let values = []
	if (prop.type == 'text') {
		values = await db.colAll(`
			SELECT ip.text
			FROM showcase_iprops ip where model_id = :model_id and prop_id = :prop_id and item_num = 1
			order by ordain
		`, {model_id, prop_id: prop.prop_id})	
		
	} else if (prop.type == 'number') {
		values = await db.colAll(`
			SELECT ip.number
			FROM showcase_iprops ip where model_id = :model_id and prop_id = :prop_id and item_num = 1
			order by ordain
		`, {model_id, prop_id: prop.prop_id})
	} else if (prop.type == 'value') {
		values = await db.colAll(`
			SELECT v.value_title
			FROM showcase_iprops ip, showcase_values v
			WHERE ip.model_id = :model_id and ip.prop_id = :prop_id and ip.item_num = 1
			and ip.value_id = v.value_id
			order by ip.ordain
		`, {model_id, prop_id: prop.prop_id})
	}
	if (!values.length) return
	if (!~['images'].indexOf(prop.prop_nick)) {
		values = values.join(', ')
	}
	model[nickortitle] = values
}
Catalog.getGroupOptions = Access.cache(async (group_id) => {
	const options = await Catalog.getOptions()
	const tree = await Catalog.getTree()
	const group = tree[group_id]
	let opt = {}
	group.path.forEach(parent_id => {
		if (!options.groupids[parent_id]) return
		opt = {...opt, ...options.groupids[parent_id]}
	})
	if (options.groupids[group_id]) opt = {...opt, ...options.groupids[group_id]}
	opt.props ??= []
	opt.props = opt.props.filter(prop => options.props[prop]).map(prop => {
		return options.props[prop]
	})
	return opt
})

Catalog.getAllCount = Access.cache(async () => {
	const db = await new Db().connect()
	const count = await db.col('SELECT count(*) FROM showcase_models')
	const gcount = await db.col('SELECT count(*) FROM showcase_groups')

	const list = []
	const root_id = await db.col('SELECT group_id from showcase_groups WHERE parent_id is null')
	const groups = !root_id ? [] : await db.all('select group_title, group_nick from showcase_groups WHERE parent_id = :root_id order by ordain', {root_id})
	return {count, gcount, list, groups}
})
Catalog.getPropById = Access.cache(async (prop_id) => {
	const db = await new Db().connect()
	const prop = await db.fetch('SELECT type, prop_nick, prop_title, prop_id from showcase_props where prop_id = :prop_id', { prop_id })
	return prop
})
Catalog.getProp = Access.cache(async (prop_title) => {
	const db = await new Db().connect()
	const prop_nick = nicked(prop_title)
	const prop = await db.fetch('SELECT type, prop_nick, prop_title, prop_id from showcase_props where prop_nick = :prop_nick', { prop_nick })
	return prop
})
Catalog.getBrandById = Access.cache(async (brand_id) => {
	const db = await new Db().connect()
	const brand = await db.fetch('SELECT * from showcase_brands where brand_id = :brand_id', { brand_id })
	return brand
})
const addParents = (group, parent_id, tree) => {
	if (!parent_id) return
	group.path.unshift(parent_id)
	addParents(group, tree[parent_id].parent_id, tree)
}
Catalog.getTree = Access.cache(async () => {
	const db = await new Db().connect()
	const tree = await db.alltoint('group_id', `
		SELECT group_id, parent_id, group_nick, icon, group_title 
		FROM showcase_groups ORDER by ordain
	`,[], ['group_id','parent_id'])

	for (const group_id in tree) {
		const group = tree[group_id]
		group.path = []
		addParents(group, group.parent_id, tree)
		//if (!group.parent_id) continue
		//tree[group.parent_id].groups.push(group.group_id)
	}
	return tree
})