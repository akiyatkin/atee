import fs from 'fs/promises'
import cproc from "@atee/cproc"
import config from '@atee/config'
import Shop from "/-shop/Shop.js"

await fs.mkdir('cache/yml/', { recursive: true }).catch(e => null)

import rest_docx from '/-docx/rest.js'


const yml = {
	// groups: (...args) => yml.getGroups(...args), //depricated
	// data: (...args) => yml.getFeedList(...args), //depricated

	// getGroups: async (db, group_id, visitor) => {
	// 	const groups = []

	// 	await Shop.runGroupDown(db, group_id, async group => {
	// 		const {parent_id, group_title, group_nick, icon} = tree[group_id]

	// 		const src = conf.pages + group_nick
	// 		const reans = await rest_docx.get('get-html', { src }, visitor)
	// 		const description = reans.status == 404 ? '' : reans.data
			
	// 		groups.push({group_id, parent_id, group_title, group_nick, icon, description})
	// 	})
		

	// 	const conf = await config('showcase')
		

	// 	for (const group_id in tree) {
			
	// 	}
	// 	return groups
	// },
	

	// getFeedList: (db, feed, partner = false, props = []) => cproc(yml, '', async () => {
	// 	const group_id = await Shop.getGroupIdByNick(db, feed.group_nick)
	// 	if (!group_id) return []
	// 	const bind = await Shop.getBind(db)
		
	// 	console.time('yml.data')
	// 	// const {from, join, where, sort, sortsel} = await Shop.getWhereByGroupIndexSort(db, group_id, feed.samples, feed.hashs, partner)
	// 	// const moditem_ids = await db.all(`
	// 	// 	SELECT 
	// 	// 		win.value_id, 
	// 	// 		GROUP_CONCAT(win.key_id separator ',') as key_ids
	// 	// 		${sortsel.length ? ',' + sortsel.join(', ') : ''}
	// 	// 	FROM ${from.join(', ')} ${join.join(' ')}
	// 	// 	WHERE ${where.join(' and ')}
	// 	// 	GROUP BY win.value_id 
	// 	// 	ORDER BY ${sort.join(',')}
	// 	// `, {group_id, ...bind})


	// 	const {from, join, where} = await Shop.getWhereByGroupIndexWinMod(db, group_id, feed.samples, feed.hashs, partner)
	// 	const moditem_ids = await db.all(`
	// 		SELECT 
	// 			win.value_id, 
	// 			GROUP_CONCAT(win.key_id separator ',') as key_ids
	// 		FROM ${from.join(', ')} ${join.join(' ')}
	// 		WHERE ${where.join(' and ')}
	// 		GROUP BY win.value_id 
	// 	`, {group_id, ...bind})

	// 	const list = await Shop.getModelsByItems(db, moditem_ids, partner, props)

		
	// 	console.timeEnd('yml.data')
	// 	return list
	// })
}



export default yml