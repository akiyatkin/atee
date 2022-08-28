import { Access } from "/-controller/Access.js"
import { Db } from "/-db/Db.js"
import { nicked } from "/-nicked/nicked.js"

export const Catalog = {}

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
	const prop = await db.fetch('SELECT prop_nick, prop_title, prop_id from showcase_props where prop_nick = :prop_nick', { prop_nick })
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