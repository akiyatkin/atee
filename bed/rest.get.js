import Bed from "/-bed/api/Bed.js"

import Rest from '/-rest'
const rest = new Rest()
export default rest



import rest_search from "/-dialog/search/rest.search.js" //аргументы hash, search 
rest.extra(rest_search)
import rest_bed from '/-bed/rest.bed.js'
rest.extra(rest_bed)


rest.addResponse('get-prop-value-search', ['admin'], async view => {
	const db = await view.get('db')
	const hash = await view.get('hash')
	const prop = await view.get('prop#required')
	const prop_id = prop.prop_id
	
	const group = await view.get('group#required')
	let md
	if (group.parent_id) {
		const parent = await Bed.getGroupById(db, group.parent_id)
		md = await Bed.getmd(db, '', parent)
	} else {
		md = await Bed.getmd(db, '')
	}
	const {where, from, sort, bind} = Bed.getmdwhere(md, md.group?.mgroup || {})
	
	const list = await db.all(`
		SELECT distinct va.value_title, va.value_nick, da.value_id
		FROM ${from.join(', ')}, sources_wvalues da
			LEFT JOIN sources_values as va on (da.value_id = va.value_id)
		WHERE ${where.join(' and ')}
		and da.key_id = win.key_id and da.prop_id = :prop_id
		and va.value_nick like "%${hash.join('%" and va.value_nick like "%')}%"
		ORDER BY RAND()
		LIMIT 12
	`, {...bind, prop_id})

	view.ans.count = await db.col(`
		SELECT count(distinct da.value_id)
		FROM ${from.join(', ')}, sources_wvalues da
			LEFT JOIN sources_values as va on (da.value_id = va.value_id)
		WHERE ${where.join(' and ')}
		and da.key_id = win.key_id and da.prop_id = :prop_id
		and va.value_nick like "%${hash.join('%" and va.value_nick like "%')}%"
	`, {...bind, prop_id})

	view.ans.list = list.map(row => {
		row['left'] = row.value_title
		row['right'] = ''
		return row
	})	
	
	return view.ret()
})
rest.addResponse('get-mark-prop-search', ['admin'], async view => {
	const db = await view.get('db')
	const hash = await view.get('hash')
	
	

	const list = await db.all(`
		SELECT prop_id, prop_title, prop_nick, type
		FROM sources_props
		WHERE type = "value" and prop_nick like "%${hash.join('%" and prop_nick like "%')}%"
	`)

	view.ans.list = list.map(row => {
		row['left'] = row.prop_title
		row['right'] = ''
		return row
	})	

	view.ans.count = list.length
	return view.ret()
})
rest.addResponse('get-filter-prop-search', ['admin'], async view => {
	const db = await view.get('db')
	const hash = await view.get('hash')
	
	const list = await db.all(`
		SELECT prop_id, prop_title, prop_nick, type
		FROM sources_props
		WHERE type in ("value","number") and prop_nick like "%${hash.join('%" and prop_nick like "%')}%"
	`)

	view.ans.list = list.map(row => {
		row['left'] = row.prop_title
		row['right'] = ''
		return row
	})	

	view.ans.count = list.length
	return view.ret()
})