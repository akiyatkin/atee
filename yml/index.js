import fs from 'fs/promises'
import cproc from '/-cproc'
import config from '/-config'
import Catalog from "/-catalog/Catalog.js"

await fs.mkdir('cache/yml/', { recursive: true }).catch(e => null)



const yml = {
	groups: async () => {
		const tree = await Catalog.getTree()
		const groups = []
		for (const group_id in tree) {
			const {parent_id, group_title} = tree[group_id]
			groups.push({group_id, parent_id, group_title})
		}
		return groups
	},
	data: (catalog, feed) => cproc(yml, '', async () => {
		const config = await config('yml')
		const md = config.feeds[feed]
		if (!md) return []
		const group = await catalog.getMainGroup(md)
		if (!group) return []
		const {from, where} = await catalog.getmdwhere(md)
		const moditem_ids = await catalog.base.db.all(`
			SELECT m.model_id, GROUP_CONCAT(distinct i.item_num separator ',') as item_nums 
			FROM ${from.join(', ')}
			WHERE ${where.join(' and ')}
			GROUP BY m.model_id 
		`)
		const list = await catalog.getModelsByItems(moditem_ids)
		return list
	})
}



export default yml