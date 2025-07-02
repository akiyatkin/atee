import Bed from "/-bed/api/Bed.js"
import nicked from "/-nicked"
import Rest from '/-rest'
const rest = new Rest()
export default rest




import rest_bed from '/-bed/rest.bed.js'
rest.extra(rest_bed)


rest.addResponse('get-prop-value-search', ['admin'], async view => {
	const db = await view.get('db')
	const type = await view.get('type')
	const hash = await view.get('hash')
	const prop = await view.get('prop')
	const prop_id = prop?.prop_id
	
	const group = await view.get('group#required')
	// let md
	// if (group.parent_id) {
	// 	const parent = await Bed.getGroupById(db, group.parent_id)
	// 	md = await Bed.getmd(db, '', parent)
	// } else {
	// 	md = await Bed.getmd(db, '')
	// }
	const {from, join, where, sort, bind} = await Bed.getWhereByGroupId(db, group?.parent_id || false)
	
	const list = await db.all(`
		SELECT distinct va.value_title, va.value_nick, da.value_id
		FROM ${from.join(', ')} ${join.join(' ')}, sources_wvalues da
			LEFT JOIN sources_values as va on (da.value_id = va.value_id)
		WHERE ${where.join(' and ')}
		and da.key_id = win.key_id and da.prop_id = :prop_id
		and va.value_nick like "%${hash.join('%" and va.value_nick like "%')}%"
		ORDER BY RAND()
		LIMIT 12
	`, {...bind, prop_id: prop_id || null})

	view.ans.count = await db.col(`
		SELECT count(distinct da.value_id)
		FROM ${from.join(', ')} ${join.join(' ')}, sources_wvalues da
			LEFT JOIN sources_values as va on (da.value_id = va.value_id)
		WHERE ${where.join(' and ')}
		and da.key_id = win.key_id and da.prop_id = :prop_id
		and va.value_nick like "%${hash.join('%" and va.value_nick like "%')}%"
	`, {...bind, prop_id: prop_id || null})

	view.ans.list = list.map(row => {
		row['left'] = row.value_title
		row['right'] = ''
		return row
	})
	
	if (type == 'samplevalue') {
		if (hash) {
			view.ans.list.push({
				action:'/-bed/set-sample-prop-value-create',
				left: '<i>Создать <b>'+hash+'</b></i>',
				right: ''
			})
		}
		view.ans.list.push({
			action:'/-bed/set-sample-prop-spec?spec=any',
			left: '<i>Любое значение</i>',
			right: ''
		})
		view.ans.list.push({
			action:'/-bed/set-sample-prop-spec?spec=empty',
			left: '<i>Без значения</i>',
			right: ''
		})
	}
	
	return view.ret()
})
rest.addResponse('get-group-search', ['admin'], async view => {
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
rest.addResponse('get-group-filter-prop-search', ['admin'], async view => {
	const db = await view.get('db')
	const hashs = await view.get('hashs')
	const query_nick = await view.get('query_nick')
	
	const list = await db.all(`
		SELECT prop_id, prop_title, prop_nick, type
		FROM sources_props
		WHERE type in ("value","number") 
		and ${hashs.map(hash => 'prop_nick like "%' + hash.join('%" and prop_nick like "%') + '%"').join(' or ') || '1 = 1'}
		ORDER BY RAND()
		LIMIT 12
	`)

	view.ans.list = list.map(row => {
		row['left'] = row.prop_title
		row['right'] = ''
		return row
	})	
	//const group = await view.get('group#required')
	// if (group.parent_id) {
	// 	view.ans.list.push({
	// 		action:'/-bed/set-filter-inherit',
	// 		left: '<i>Наследовать от <b>' + group.parent_title + '</b></i>',
	// 		right: ''
	// 	})
	// }
	
	
	if (query_nick) {
		view.ans.list.push({
			action:'/-bed/set-group-filter',
			left: '<i>Создать <b>'+query_nick+'</b></i>',
			right: ''
		})
	}
	view.ans.list.push({
		action:'/-bed/set-filter-inherit',
		left: '<i>Наследовать</i>',
		right: ''
	})
	
	
	view.ans.count = list.length
	return view.ret()
})
rest.addResponse('get-sample-prop-search', ['admin'], async view => {
	const db = await view.get('db')
	const hashs = await view.get('hashs')
	const type = await view.get('type#required')
	const query_nick = await view.get('query_nick')
	// const where = []
	// if (hashs.length) {
	// 	const where_search = []
	// 	for (const hash of hashs) {
	// 		const sql = 'wit.search like "% ' + hash.join('%" and wit.search like "% ') + '%"'
	// 		where_search.push(sql)
	// 	}
	// 	where.push(`(${where_search.join(' or ')})`)
	// }

	const list = await db.all(`
		SELECT prop_id, prop_title, prop_nick, type
		FROM sources_props
		WHERE type = "value" 
		and ${hashs.map(hash => 'prop_nick like "%' + hash.join('%" and prop_nick like "%') + '%"').join(' or ') || '1 = 1'}
	`)

	view.ans.list = list.map(row => {
		row['left'] = row.prop_title
		row['right'] = ''
		return row
	})	

	view.ans.count = list.length
	
	if (type == 'sample') {
		if (query_nick) {
			view.ans.list.push({
				action:'/-bed/set-sample-create',
				left: '<i>Создать <b>'+query_nick+'</b></i>',
				right: ''
			})
		}
	}
	if (type == 'sampleprop') {
		if (query_nick) {
			view.ans.list.push({
				action:'/-bed/set-sample-prop-create',
				left: '<i>Создать <b>'+query_nick+'</b></i>',
				right: ''
			})
		}
	}
	return view.ret()
})
