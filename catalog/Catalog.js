import { Access } from "/-controller/Access.js"
import { Db } from "/-db/Db.js"
import { nicked } from "/-nicked/nicked.js"
import { unique } from "/-nicked/unique.js"
import { filter } from "/-nicked/filter.js"

export const Catalog = {}

Catalog.getModelsByItems = async (db, moditems_ids, partner) => { //[{item_nums after group_concats, model_id}]
	//Заполнили основными данными
	if (!moditems_ids.length) return []
	//const db = await new Db().connect()
	const options = await Catalog.getOptions()
	const ids = unique(moditems_ids.map(it => it.model_id))
	
	const models = await db.all(`SELECT 
		m.model_id, 
		m.model_nick, m.model_title, b.brand_title, b.brand_nick, g.group_nick, g.group_title, g.group_id, 
		g.parent_id
		FROM showcase_models m, showcase_brands b, showcase_groups g

		WHERE m.brand_id = b.brand_id and m.group_id = g.group_id
		and m.model_id in (${ids.join(',')})
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
		FROM showcase_props p, showcase_iprops ip
			LEFT JOIN showcase_values v on v.value_id = ip.value_id
		WHERE p.prop_id = ip.prop_id and (ip.model_id, ip.item_num) in (${modids.map(it => '(' + it.model_id + ',' + it.item_num + ')').join(',')})
		order by p.ordain DESC, ip.ordain
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
		const model_rows = {...model.items[0]}
		const item_rows = []
		for (const item of model.items) {
			for (const prop in item) {
				if (model_rows[prop] == null) continue
				const val = item[prop]
				if (model_rows[prop] === val) continue
				item_rows.push(prop)
				delete model_rows[prop]
			}
		}
		for (const prop in model_rows) {
			model[prop] = model_rows[prop]
		}
		for (const item of model.items) {
			for (const prop in item) {
				if (model_rows[prop] == null) continue
				delete item[prop]
			}
		}
		model.item_rows = item_rows.filter(prop => !~options.systems.indexOf(prop)) //До разделения на common и more
		model.model_rows = Object.keys(model_rows).filter(prop => !~options.systems.indexOf(prop)&&!~options.columns.indexOf(prop))
		/*
			известные колонки могут попадать в items, как показать вариативность известных колонок если это может быть единственной разницей?
		*/
		model.model_rows = model.model_rows.map(prop => options.props[prop] ?? {prop_title:prop, prop_nick:nicked(prop), value_title:prop, value_nick:prop})
		
	}
	for (const model of list) {
		const { props } = await Catalog.getGroupOpt(model.group_id)
		model.props = [...props]
		model.props = await filter(model.props, async (pr) => {
			const p = pr.value_title
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
	
	for (const model of list) {
		model.more = {}
		for (const prop in model) {
			if (~options.columns.indexOf(prop)) continue
			if (~options.systems.indexOf(prop)) continue
			model.more[prop] = model[prop]
			delete model[prop]
		}

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
					item[cost.prop_title] = Math.round(item[oldcost.prop_title] * (100 - partner.discount) / 100)
					item.discount = partner.discount
				}
				continue
			}
			model[oldcost.prop_title] = model[cost.prop_title]
			model[cost.prop_title] = Math.round(model[oldcost.prop_title] * (100 - partner.discount) / 100)
			model.discount = partner.discount
		}
	}
	// for (const model of list) {
	// 	//Выбор обязателен если несколько позиций. Но если позиция одна то item_num сразу в моделе есть
	// 	if (model.items.length != 1) continue
	// 	delete model.items
	// }
	list = ids.map(id => list.find(m => m.model_id == id))
	return list
}
Catalog.getConfig = Access.cache(async () => {
	const config = await import('/showcase.json', {assert:{type:"json"}}).then(res => res.default).catch(e => Object())
	config.tpls ??= "data/catalog/tpls/"
	return config
})
Catalog.getOptions = Access.cache(async () => {
	const config = await Catalog.getConfig()
	const { options } = await import('/'+config.options)
	
	options.groups ??= {}
	options.groupids = {}
	options.partners ??= {}
	options.props ??= []
	options.root_title ??= 'Каталог'
	options.root_nick = nicked(options.root_title)
	options.actions ??= ['Новинка','Распродажа']
	if (!options.columns) {
		throw 'Требуется options.columns'
	}
	const db = await new Db().connect()
	options.columns ??= []
	options.systems ??= []
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
		if (value == 'Цена' && !p.unit) p.unit = 'руб.'
		const r = value.split(',')
		if (r.length > 1) p.unit = r[1].trim()
	}
	db.release()
	return options
})
Catalog.getValueId = (db, visitor, value_nick) => {
	return visitor.relate(Catalog).once('getValueId' + value_nick, () => {
		return db.col('SELECT value_id FROM showcase_values WHERE value_nick = :value_nick',{value_nick})
	})
}
Catalog.getValueByNick = async (db, visitor, value_nick) => {
	return visitor.relate(Catalog).once('getValueByNick'+value_nick, () => {
		return db.fetch('SELECT value_id, value_title, value_nick FROM showcase_values WHERE value_nick = :value_nick', { value_nick })
	})
}
// Catalog.getValue = async (db, model, nickortitle, item_num = 1) => {
// 	const { model_id } = model
// 	const prop = await Catalog.getProp(nickortitle)
// 	if (!prop) return
// 	let values = []
// 	if (prop.type == 'text') {
// 		values = await db.colAll(`
// 			SELECT ip.text
// 			FROM showcase_iprops ip where model_id = :model_id and prop_id = :prop_id and item_num = 1
// 			order by ordain
// 		`, {model_id, prop_id: prop.prop_id})	
		
// 	} else if (prop.type == 'number') {
// 		values = await db.colAll(`
// 			SELECT ip.number
// 			FROM showcase_iprops ip where model_id = :model_id and prop_id = :prop_id and item_num = 1
// 			order by ordain
// 		`, {model_id, prop_id: prop.prop_id})
// 	} else if (prop.type == 'value') {
// 		values = await db.colAll(`
// 			SELECT v.value_title
// 			FROM showcase_iprops ip, showcase_values v
// 			WHERE ip.model_id = :model_id and ip.prop_id = :prop_id and ip.item_num = 1
// 			and ip.value_id = v.value_id
// 			order by ip.ordain
// 		`, {model_id, prop_id: prop.prop_id})
// 	}
// 	if (!values.length) return
// 	if (!~['images'].indexOf(prop.prop_nick)) {
// 		values = values.join(', ')
// 	}
// 	model[nickortitle] = values
// }

Catalog.getGroupOpt = Access.cache(async (group_id) => {
	const options = await Catalog.getOptions()
	const tree = await Catalog.getTree()
	const group = tree[group_id]
	let opt = {}
	opt.limit ??= 12
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

Catalog.getMainGroups = Access.cache(async (prop_title = '') => {
	
	const tree = structuredClone(await Catalog.getTree())
	
	const groups = Object.values(tree)
	const root = groups.find(g => !g.parent_id)
	const childs = groups.filter(g => g.parent_id == root.group_id && g.icon)

	if (prop_title) {
		const prop = await Catalog.getProp(prop_title)
		const db = await new Db().connect()
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
		db.release()
		return {childs, prop}
	} else {
		return {childs}
	}
	
})
Catalog.getFilterConf = async (db, visitor, prop_id, group_id, md) => {
	const group = await Catalog.getGroupById(group_id)
	const prop = await Catalog.getPropById(prop_id)
	if (prop.type == 'text') return false
	const options = await Catalog.getOptions()
	if (!options.props[prop.prop_title].filter) return false
	const filter = {...options.props[prop.prop_title].filter, ...prop}
	if (filter.slider) {
		if (prop.type == 'value') return false
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
		

		return filter
	}
	if (prop.type == 'value') {
		filter.values = await db.all(`
			SELECT distinct v.value_nick, v.value_title
			FROM showcase_iprops ip, showcase_models m, showcase_values v
			WHERE m.model_id = ip.model_id
			and ip.prop_id = :prop_id
			and v.value_id = ip.value_id
			and m.group_id in (${group.groups.join(',')})
			ORDER BY v.value_nick
		`, {
			prop_id
		})
	} else {
		filter.values = await db.all(`
			SELECT distinct ip.number as value_nick
			FROM showcase_iprops ip, showcase_models m
			WHERE m.model_id = ip.model_id
			and ip.prop_id = :prop_id
			and m.group_id in (${group.groups.join(',')})
			ORDER BY ip.number
		`, {
			prop_id
		})

	}
	const selected = md.more?.[prop.prop_nick]
	

	if (!selected && filter.values.length < 1) return false

	const nmd = {...md}
	nmd.more = {...md.more}
	delete nmd.more?.[prop.prop_nick]
	nmd.m = Catalog.makemark(nmd).join(':')
	

	if (selected) {
		const values_nicks = Object.keys(selected)
		for (const value_nick of values_nicks) {
			if (prop.type == 'value') {
				if (filter.values.some(v => v.value_nick == value_nick)) continue
				const value = await Catalog.getValueByNick(db, visitor, value_nick)
				filter.values.push(value)
			} else {
				if (filter.values.some(v => Number(v.value_nick) == Number(value_nick.replace('-','.')))) continue
				filter.values.push({value_nick})
			}
		}
	}
	if (!selected && filter.values.length < 2) return false

	const {from, where} = await Catalog.getmdwhere(db, visitor, nmd)
	if (prop.type == 'value') {
		filter.remains = await db.all(`
			SELECT distinct v.value_nick
			FROM ${from.join(', ')}, showcase_iprops ip, showcase_values v
			WHERE ${where.join(' and ')}
			and ip.prop_id = :prop_id
			and v.value_id = ip.value_id
			and m.model_id = ip.model_id 
		`, {
			prop_id: prop.prop_id
		})
	} else {
		filter.remains = await db.all(`
			SELECT distinct ip.number as value_nick
			FROM ${from.join(', ')}, showcase_iprops ip
			WHERE ${where.join(' and ')}
			and ip.prop_id = :prop_id
			and m.model_id = ip.model_id 
		`, {
			prop_id: prop.prop_id
		})

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
	// const group = await Catalog.getGroupById(group_id)
	// const options = await Catalog.getOptions()
	// const filter = {...options.props[prop.prop_title], ...prop}
	// if (prop.type !== 'value') return false
	// //Нужно найти все возможные значения и упорядочить их по алфавиту и показать количество моделей
	// filter.values = await db.all(`
	// 	SELECT distinct v.value_nick, v.value_title
	// 	FROM showcase_iprops ip, showcase_models m, showcase_values v
	// 	WHERE ip.prop_id = :prop_id and m.model_id = ip.model_id 
	// 	and m.group_id in (${group.groups.join(',')}) and v.value_id = ip.value_id
	// 	ORDER BY v.value_nick
	// `, {
	// 	prop_id: prop.prop_id
	// })
	// if (filter.values.length < 2) return false

	// return filter
}
// Catalog.getGroupFilterConf = async (db, prop_id, group_id) => {
// 	const prop = await Catalog.getPropById(prop_id)
// 	const group = await Catalog.getGroupById(group_id)
// 	const options = await Catalog.getOptions()
// 	const filter = {...options.props[prop.prop_title], ...prop}
// 	if (prop.type !== 'value') return false
// 	//Нужно найти все возможные значения и упорядочить их по алфавиту и показать количество моделей
// 	filter.values = await db.all(`
// 		SELECT distinct v.value_nick, v.value_title
// 		FROM showcase_iprops ip, showcase_models m, showcase_values v
// 		WHERE ip.prop_id = :prop_id and m.model_id = ip.model_id 
// 		and m.group_id in (${group.groups.join(',')}) and v.value_id = ip.value_id
// 		ORDER BY v.value_nick
// 	`, {
// 		prop_id: prop.prop_id
// 	})
// 	if (filter.values.length < 2) return false

// 	return filter
// }
Catalog.getAllCount = Access.cache(async () => {
	const tree = await Catalog.getTree()
	const groups = Object.values(tree)
	const root = groups.find(g => !g.parent_id)
	const childs = groups.filter(g => g.parent_id == root.group_id)
	return {count:root.indepth, gcount: groups.length - 1, list:[], groups:childs}
})
Catalog.getPropById = Access.cache(async (prop_id) => {
	const db = await new Db().connect()
	const prop = await db.fetch('SELECT type, prop_nick, prop_title, prop_id from showcase_props where prop_id = :prop_id', { prop_id })
	const options = await Catalog.getOptions()
	prop.opt = options.props[prop.prop_title]
	db.release()
	return prop
})
Catalog.getProp = Access.cache(async (prop_title) => {
	const db = await new Db().connect()
	const prop_nick = nicked(prop_title)
	const prop = await db.fetch('SELECT type, prop_nick, prop_title, prop_id from showcase_props where prop_nick = :prop_nick', { prop_nick })
	const options = await Catalog.getOptions()
	prop.opt = options.props[prop.prop_title]
	db.release()
	return prop
})
Catalog.getPropByNick = Catalog.getProp
Catalog.getPropByTitle = Catalog.getProp
Catalog.getPathNickByGroupId = async id => {
	const group = await Catalog.getGroupById(id)
	const path = [...group.path]
	path.push(id)
	return Promise.all(path.map(async (id) => {
		const group = await Catalog.getGroupById(id)
		return group.group_nick
	}))
}
Catalog.getGroupById = async (id) => {
	const groups = await Catalog.getTree()
	return groups[id]
}
Catalog.getGroupByNick = async (nick) => {
	const groups = await Catalog.getGroups()
	return groups[nick]
}
Catalog.getBrandByNick = async (nick) => {
	const brands = await Catalog.getBrands()
	return brands[nick]
}
Catalog.getBrandById = Access.cache(async (brand_id) => {
	const brands = await Catalog.getBrands()
	for (const brand_nick in brands) {
		const brand = brands[brand_nick]
		if (brand.brand_id == brand_id) return brand
	}
})
const addParents = (group, parent_id, tree) => {
	if (!parent_id) return
	group.path.unshift(parent_id)
	addParents(group, tree[parent_id].parent_id, tree)
}
Catalog.getBrands = Access.cache(async () => {
	const db = await new Db().connect()
	const brands = await db.alltoint('brand_nick', `
		SELECT brand_id, brand_nick, brand_title, logo, ordain
		FROM showcase_brands ORDER by ordain
	`,[], ['brand_id'])
	db.release()
	return brands
})
Catalog.getGroups = Access.cache(async () => {
	const tree = await Catalog.getTree()
	const groups = {}
	for (const group_id in tree) {
		groups[tree[group_id].group_nick] = tree[group_id]
	}
	return groups
})
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
	for (const group_id in tree) {
		const group = tree[group_id]
		group.inside = await db.col('SELECT count(*) from showcase_models where group_id = :group_id',{group_id})
		group.indepth = group.inside
		group.groups = [group.group_id]
		group.childs = []
	}
	db.release()
	for (const group_id in tree) {
		const group = tree[group_id]
		group.path.forEach(parent_id => {
			const parent = tree[parent_id]
			parent.indepth += group.inside
		})
	}
	for (const group_id in tree) {
		if (!tree[group_id].indepth) delete tree[group_id]
	}
	for (const group_id in tree) {
		const group = tree[group_id]
		if (group.parent_id) {
			const parent = tree[group.parent_id]
			parent.childs.push(group.group_id)
		}
		group.path.forEach(parent_id => {
			const parent = tree[parent_id]
			parent.groups.push(group.group_id)
		})
	}
	return tree
})
Catalog.getModelByNick = async (db, visitor, brand_nick, model_nick, partner = '') => {
	const key = 'getModelByNick' + brand_nick + ':' + model_nick + ':' + partner
	return visitor.relate(Catalog).once(key, async () => {
		const moditem_ids = await db.all(`
			SELECT m.model_id, GROUP_CONCAT(i.item_num separator ',') as item_nums
			FROM 
				showcase_items i
				LEFT JOIN showcase_models m on m.model_id = i.model_id
				LEFT JOIN showcase_brands b on m.brand_id = b.brand_id
			WHERE b.brand_nick = :brand_nick and m.model_nick = :model_nick
			GROUP BY m.model_id
		`, {model_nick, brand_nick})
		const models = await Catalog.getModelsByItems(db, moditem_ids, partner)
		return models[0]
	})
}
Catalog.makemark = (md, ar = [], path = []) => {
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
Catalog.getmdwhere = (db, visitor, md) => {
	return visitor.relate(Catalog).once('getmdwhere' + md.m, async () => {
		const groupnicks = await Catalog.getGroups()
		const brandnicks = await Catalog.getBrands()
		const where = []
		if (md.group) {
			let group_ids = []
			Object.keys(md.group).forEach(nick => groupnicks[nick].groups.forEach(id => group_ids.push(id)))
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
				//console.log(`m.search like "% ${hashs.join('%" and m.search like "% ')}%"`)
			}
		}
		const from = ['showcase_models m','showcase_items i']
		const sort = []
		where.push('i.model_id = m.model_id')
		let iprops_dive = false
		if (md.more) {
			
			let i = 0
			for (const prop_nick in md.more) {
				
				i++
				iprops_dive = true
				
				const prop = await Catalog.getProp(prop_nick)
				from.push(`showcase_iprops ip${i}`)
				where.push(`ip${i}.model_id = m.model_id`)
				where.push(`ip${i}.prop_id = ${prop.prop_id}`)

				const values = md.more[prop_nick]
				
				const ids = []
				if (prop.type == 'number') {
					for (let name in values) {
						let value = name
						if (~['upto','from'].indexOf(name)) {
							value = values[name]
						}
						value = value.replace('-','.')
						const value_nick = Number(value)

						if (~['upto','from'].indexOf(name)) {
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
						let value_id = await Catalog.getValueId(db, visitor, value_nick)
						if (!value_id) value_id = 0
						ids.push(value_id)
					}
					where.push(`ip${i}.value_id in (${ids.join(',')})`)
				} else {

				}
				
			}
			
			
		}
		if (!iprops_dive) where.push('(select i.item_num from showcase_items i where i.model_id = m.model_id limit 1) is not null')	
		
		return {where, from, sort}
	})
}
const getGroupIds = async (db, visitor, md) => {
	const {where, from} = await Catalog.getmdwhere(db, visitor, md)
	
	const res_ids = await db.colAll(`
		SELECT distinct group_id 
		FROM ${from.join(', ')}
		WHERE ${where.join(' and ')}
	`)	
	
	return res_ids
}
Catalog.getMainGroup = async md => {
	const groupnicks = await Catalog.getGroups()
	const options = await Catalog.getOptions()
	const root = groupnicks[options.root_nick]
	let group = root
	if (md.group) {
		const group_nicks = Object.keys(md.group)
		if (group_nicks.length == 1) {
			group = groupnicks[group_nicks[0]]
		}
	}
	return group
}
Catalog.searchGroups = (db, visitor, md) => {
	return visitor.relate(Catalog).once('searchGroups' + md.m, async () => {
		//const {search = '', group = {}, brand = {}, more = {}} = md
		let title = await Catalog.getMainGroup(md)
		if (!title) return {title, group_ids:[]}
		
		if (!Object.keys(md.more ?? {}).length && !md.search) {
			const tree = await Catalog.getTree()
			const options = await Catalog.getOptions()
			const groupnicks = await Catalog.getGroups()
			const root = groupnicks[nicked(options.root_nick)]
			if (!root) return {title, group_ids:[]}
			const group_ids = root.groups.filter(id => tree[id].inside)
			return {title, group_ids}
		}
		let group_ids = await getGroupIds(db, visitor, md)
		if (group_ids.length == 1) {
			if (title.parent_id) { //Есть выбранная группа
				const nmd = { ...md } //, title: {}
				const tree = await Catalog.getTree()
				title = tree[title.parent_id]
				nmd.group[title.group_nick] = 1
				nmd.m = Catalog.makemark(nmd).join(':')
				group_ids = await getGroupIds(db, visitor, nmd)
			}
		}
		return {title, group_ids}
	})
}
Catalog.getCommonChilds = async (group_ids, root) => {
	
	const tree = await Catalog.getTree()
	const groupnicks = await Catalog.getGroups()
	const options = await Catalog.getOptions()
	let rootpath = tree[group_ids[0]]?.path || root.path

	group_ids.forEach(group_id => {
		rootpath = rootpath.filter(id => ~tree[group_id].path.indexOf(id) || id == group_id)
	})

	
	const group = (group_ids[0] || rootpath.length > 1 ) ? (tree[rootpath.at(-1)] || root) : root //Общий корень

	const level_group_ids = unique(group_ids.filter(group_id => {
		return tree[group_id].parent_id && tree[group_id].path.length >= group.path.length
	}).map(group_id => {
		return tree[group_id].path[group.path.length + 1] || group_id
	}))


	const groups = group.childs.map(id => {
		const group = {...tree[id]}
		group.mute = !~level_group_ids.indexOf(id)
		return group
	})
	
	return groups
}

Catalog.getMainBrand = async md => {
	if (!md.brand) return
	const brand_nicks = Object.keys(md.brand)
	if (brand_nicks.length != 1) return
	const brandnicks = await Catalog.getBrands()
	return brandnicks[brand_nicks[0]]
}
// Catalog.search = async (db, group, partner) => {
// 	const opt = await Catalog.getGroupOpt(group.group_id)
	
// 	const moditem_ids = await db.all(`
// 		SELECT m.model_id, GROUP_CONCAT(i.item_num separator ',') as item_nums
// 		FROM 
// 			showcase_items i
// 			LEFT JOIN showcase_models m on m.model_id = i.model_id
// 		WHERE m.group_id in (${group.groups.join(',')})
// 		GROUP BY m.model_id
// 		LIMIT ${opt.limit}
// 	`)
// 	const models = await Catalog.getModelsByItems(moditem_ids, partner)
// 	return models
// }