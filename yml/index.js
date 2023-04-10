import fs from 'fs/promises'
import cproc from '/-cproc'
import config from '/-config'
import Catalog from "/-catalog/Catalog.js"

await fs.mkdir('cache/yml/', { recursive: true }).catch(e => null)



const yml = {
	groups: async (view) => {
		const tree = await Catalog.getTree(view)
		const groups = []
		for (const group_id in tree) {
			const {parent_id, group_title} = tree[group_id]
			groups.push({group_id, parent_id, group_title})
		}
		return groups
	},
	data: (view, feed) => cproc(yml, '', async () => {
		const { db } = await view.gets(['db'])
		const conf = await config('yml')
		const md = conf.feeds[feed]
		if (!md) return []
		const group = await Catalog.getMainGroup(view, md)
		if (!group) return []
		const {from, where} = await Catalog.getmdwhere(view, md)
		const moditem_ids = await db.all(`
			SELECT m.model_id, GROUP_CONCAT(distinct i.item_num separator ',') as item_nums 
			FROM ${from.join(', ')}
			WHERE ${where.join(' and ')}
			GROUP BY m.model_id 
		`)
		const list = await Catalog.getModelsByItems(view, moditem_ids)
		return list
	})
}



export default yml