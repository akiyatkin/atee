import { Access } from "/-controller/Access.js"
import { Db } from "/-db/Db.js"
import { nicked } from "/-nicked/nicked.js"

export const Catalog = {}


Catalog.getOptions = Access.cache(async () => {
	const {default: config} = await import('/showcase.json', {assert:{type:"json"}})
	const { options } = await import('/'+config.options)
	const db = await new Db().connect()
	options.groups ??= {}
	options.groupids = {}
	options.props ??= []
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