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
	const options = await Catalog.getOptions()
	const models = await db.all(`SELECT 
		m.model_id, 
		m.model_nick, m.model_title, b.brand_title, b.brand_nick, g.group_nick, g.group_title, g.group_id, 
		g.parent_id
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
		FROM showcase_props p, showcase_iprops ip
			LEFT JOIN showcase_values v on v.value_id = ip.value_id
		WHERE p.prop_id = ip.prop_id and (ip.model_id, ip.item_num) in (${modids.map(it => '(' + it.model_id + ',' + it.item_num + ')').join(',')})
		order by p.ordain DESC
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
		const { props } = await Catalog.getGroupOptions(model.group_id)
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
	options.root_title ??= 'Каталог'
	options.root_nick = nicked(options.root_title)
	options.actions ??= ['Новинка','Распродажа']
	if (!options.columns) {
		throw 'Требуется options.columns'
	}
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
		//const prop = await Catalog.getProp(p.prop_title)	
		//p.prop_nick = prop.prop_nick
	}
	return options
})
Catalog.getValueId = (db, visitor, value_nick) => {
	return visitor.relate(Catalog).once('getValueId' + value_nick, () => {
		return db.col('SELECT value_id FROM showcase_values WHERE value_nick = :value_nick',{value_nick})
	})
}
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
	const db = await new Db().connect()
	const tree = structuredClone(await Catalog.getTree())
	
	const groups = Object.values(tree)
	const root = groups.find(g => !g.parent_id)
	const childs = groups.filter(g => g.parent_id == root.group_id && g.icon)

	if (prop_title) {
		const prop = await Catalog.getProp(prop_title)
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
	return prop
})
Catalog.getProp = Access.cache(async (prop_title) => {
	const db = await new Db().connect()
	const prop_nick = nicked(prop_title)
	const prop = await db.fetch('SELECT type, prop_nick, prop_title, prop_id from showcase_props where prop_nick = :prop_nick', { prop_nick })
	return prop
})
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
		const models = await Catalog.getModelsByItems(moditem_ids, partner)
		return models[0]
	})
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
		if (md.more) {
			const prop_number_ids = []
			const prop_value_ids = []
			for (const prop_nick in md.more) {
				const prop = await Catalog.getProp(prop_nick)
				const values = md.more[prop_nick]
				for (const value in values) {
					const value_nick = nicked(value)
					if (prop.type == 'number') prop_number_ids.push(prop.prop_id+','+value_nick)
					if (prop.type == 'value') {
						let value_id = await Catalog.getValueId(db, visitor, value_nick)
						if (!value_id) value_id = 0
						prop_value_ids.push(prop.prop_id+','+value_id)
					}
				}
			}
			if (prop_number_ids.length) {
				where.push(`(ip.prop_id, ip.number) in ((${prop_number_ids.join('),(')}))`)
			}
			if (prop_value_ids.length) {
				where.push(`(ip.prop_id, ip.value_id) in ((${prop_value_ids.join('),(')}))`)
			}
			
		}
		return where
	})
}
Catalog.searchGroups = (db, visitor, md) => {
	return visitor.relate(Catalog).once('searchGroups' + md.m, async () => {
		//const {search = '', group = {}, brand = {}, more = {}} = md
		const where = await Catalog.getmdwhere(db, visitor, md)
		let res_ids
		if (!where.length) {
			const tree = await Catalog.getTree()
			const options = await Catalog.getOptions()
			const groupnicks = await Catalog.getGroups()
			const root = groupnicks[nicked(options.root_nick)]
			if (!root) return []
			res_ids = root.groups.filter(id => tree[id].inside)
		} else {
			if (md.more) {
				res_ids = await db.colAll(`
					SELECT distinct group_id from showcase_models m
					left join showcase_iprops ip on ip.model_id = m.model_id
					WHERE ${where.join(' and ')}
				`)	
			} else {
				res_ids = await db.colAll(`
					SELECT distinct group_id from showcase_models m
					WHERE ${where.join(' and ')}
				`)	
			}
			
		}
		return res_ids
	})
}
Catalog.getCommonChilds = async (group_ids) => {
	const tree = await Catalog.getTree()
	let groups = []
	if (group_ids.length) {
		let rootpath = tree[group_ids[0]].path
		group_ids.forEach(group_id => {
			rootpath = rootpath.filter(id => ~tree[group_id].path.indexOf(id) || id == group_id)
		})
		let root = tree[rootpath.at(-1)] //Общий корень
		if (!root) {
			root = {path:[]}
		}
		const level_group_ids = unique(group_ids
		.filter(group_id => {
			return tree[group_id].parent_id && tree[group_id].path.length >= root.path.length
		}).map(group_id => {
			return tree[group_id].path[root.path.length + 1] || group_id
		}))
		groups = level_group_ids.map(id => tree[id])
	}
	return groups
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
Catalog.getMainBrand = async md => {
	if (!md.brand) return
	const brand_nicks = Object.keys(md.brand)
	if (brand_nicks.length != 1) return
	const brandnicks = await Catalog.getBrands()
	return brandnicks[brand_nicks[0]]
}
// Catalog.search = async (db, group, partner) => {
// 	const opt = await Catalog.getGroupOptions(group.group_id)
	
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