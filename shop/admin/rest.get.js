import Shop from "/-shop/Shop.js"
import nicked from "/-nicked"
import Rest from '/-rest'
const rest = new Rest()
export default rest




import rest_bed from '/-shop/admin/rest.shopadmin.js'
rest.extra(rest_bed)


rest.addResponse('get-prop-value-search', ['admin'], async view => {
	const db = await view.get('db')
	const type = await view.get('type')
	
	const hashs = await view.get('hashs')
	const query_nick = await view.get('query_nick')

	const prop = await view.get('prop')
	const prop_id = prop?.prop_id
	
	const group_id = await view.get('group_id#required')
	const group = await Shop.getGroupById(db, group_id)
	
	const {from, join, where, sort, bind} = await Shop.getWhereByGroupId(db, group?.parent_id || false,[], false, true)
	
	const list = await db.all(`
		SELECT distinct va.value_title, va.value_nick, da.value_id
		FROM ${from.join(', ')} ${join.join(' ')}, sources_wvalues da
			LEFT JOIN sources_values as va on (da.value_id = va.value_id)
		WHERE ${where.join(' and ')}
		and da.key_id = win.key_id and da.prop_id = :prop_id
		and ${hashs.map(hash => 'va.value_nick like "%' + hash.join('%" and va.value_nick like "%') + '%"').join(' or ') || '1 = 1'}
		ORDER BY RAND()
		LIMIT 12
	`, {...bind, prop_id: prop_id || null})

	view.ans.count = await db.col(`
		SELECT count(distinct da.value_id)
		FROM ${from.join(', ')} ${join.join(' ')}, sources_wvalues da
			LEFT JOIN sources_values as va on (da.value_id = va.value_id)
		WHERE ${where.join(' and ')}
		and da.key_id = win.key_id and da.prop_id = :prop_id
		and ${hashs.map(hash => 'va.value_nick like "%' + hash.join('%" and va.value_nick like "%') + '%"').join(' or ') || '1 = 1'}
	`, {...bind, prop_id: prop_id || null})

	view.ans.list = list.map(row => {
		row['left'] = row.value_title
		row['right'] = ''
		return row
	})
	
	if (type == 'samplevalue') {
		if (query_nick) {
			const prop = await Shop.getValueByNick(db, query_nick)
			if (!prop) {
				view.ans.list.push({
					action:'/-shop/admin/set-sample-prop-value-create',
					left: '<i>Создать <b>' + query_nick + '</b></i>',
					right: ''
				})
			}
		}
		view.ans.list.push({
			action:'/-shop/admin/set-sample-prop-spec?spec=any',
			left: '<i>Любое значение</i>',
			right: ''
		})
		view.ans.list.push({
			action:'/-shop/admin/set-sample-prop-spec?spec=empty',
			left: '<i>Без значения</i>',
			right: ''
		})
	}
	
	return view.ret()
})
rest.addResponse('get-group-search', ['admin'], async view => {
	const db = await view.get('db')

	const hashs = await view.get('hashs')
	const query_nick = await view.get('query_nick')
	
	

	const list = await db.all(`
		SELECT group_id, group_title, group_nick
		FROM shop_groups
		WHERE 
			${hashs.map(hash => 'group_nick like "%' + hash.join('%" and group_nick like "%') + '%"').join(' or ') || '1 = 1'}
		ORDER BY RAND()
		LIMIT 12
	`)


	view.ans.list = list.map(row => {
		row['left'] = row.group_title
		row['right'] = ''
		return row
	})
	view.ans.list.push({
		left: '<i>Корень</i>',
		right: ''
	})


	view.ans.count = list.length

	return view.ret()
})


rest.addResponse('get-sub', ['admin'], async view => {
	const db = await view.get('db')
	const hashs = await view.get('hashs')
	const query_nick = await view.get('query_nick')
	const type = await view.get('type')
	
	const tpl = await import(`/-shop/${type}s.html.js`).then(r => r.default).catch(r => false)
	if (!tpl) return view.err('Некорректный type, файл не найден')
	
	const list = view.data.list = Object.keys(tpl.prop).filter(name => {
		if (!hashs.length) return true
		if (!hashs.some(str => ~name.indexOf(str))) return false
		return true
	}).map(name => ({
		'left':name,
		'right':''
	}))
//view.ans.count = list.length
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
	if (query_nick) {
		const prop = await Shop.getPropByNick(db, query_nick)
		if (!prop) {
			view.ans.list.push({
				action:'/-shop/admin/set-group-filter',
				left: '<i>Создать <b>' + query_nick + '</b></i>',
				right: ''
			})
		}
	}
	view.ans.list.push({
		action:'/-shop/admin/set-group-self_filters',
		left: '<i>Наследовать</i>',
		right: ''
	})
	
	
	view.ans.count = list.length
	return view.ret()
})
rest.addResponse('get-prop-search', ['admin'], async view => {
	const db = await view.get('db')
	const hashs = await view.get('hashs')
	const query_nick = await view.get('query_nick')
	
	const list = await db.all(`
		SELECT prop_id, prop_title, prop_nick, type
		FROM sources_props
		WHERE type in ("value","number","text") 
		and ${hashs.map(hash => 'prop_nick like "%' + hash.join('%" and prop_nick like "%') + '%"').join(' or ') || '1 = 1'}
		ORDER BY RAND()
		LIMIT 12
	`)

	view.ans.list = list.map(row => {
		row['left'] = row.prop_title
		row['right'] = ''
		return row
	})	
	if (query_nick) {
		const prop = await Shop.getPropByNick(db, query_nick)
		const ready = await db.col(`
			SELECT bp.prop_nick
			FROM shop_props bp
			WHERE bp.prop_nick = :query_nick
		`, {query_nick})
		if (!prop && !ready) {
			view.ans.list.push({
				action:'/-shop/admin/set-prop-create',
				left: '<i>Создать <b>' + query_nick + '</b></i>',
				right: ''
			})
		}
	}
	
	view.ans.count = list.length
	return view.ret()
})
rest.addResponse('get-group-card-prop-search', ['admin'], async view => {
	const db = await view.get('db')
	const hashs = await view.get('hashs')
	const query_nick = await view.get('query_nick')
	
	const list = await db.all(`
		SELECT prop_id, prop_title, prop_nick, type
		FROM sources_props
		WHERE type in ("value","number","text") 
		and ${hashs.map(hash => 'prop_nick like "%' + hash.join('%" and prop_nick like "%') + '%"').join(' or ') || '1 = 1'}
		ORDER BY RAND()
		LIMIT 12
	`)

	view.ans.list = list.map(row => {
		row['left'] = row.prop_title
		row['right'] = ''
		return row
	})	
	if (query_nick) {
		const prop = await Shop.getPropByNick(db, query_nick)
		if (!prop) {
			view.ans.list.push({
				action:'/-shop/admin/set-group-card',
				left: '<i>Создать <b>'+query_nick+'</b></i>',
				right: ''
			})
		}
	}
	view.ans.list.push({
		action:'/-shop/admin/set-group-self_cards',
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
		WHERE type in ("value","number") 
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
			const prop = await Shop.getPropByNick(db, query_nick)
			if (!prop) {
				view.ans.list.push({
					action:'/-shop/admin/set-sample-create',
					left: '<i>Создать <b>'+query_nick+'</b></i>',
					right: ''
				})
			}
		}
	}
	if (type == 'sampleprop') {
		if (query_nick) {
			const prop = await Shop.getPropByNick(db, query_nick)
			if (!prop) {
				view.ans.list.push({
					action:'/-shop/admin/set-sample-prop-create',
					left: '<i>Создать <b>'+query_nick+'</b></i>',
					right: ''
				})
			}
		}
	}
	return view.ret()
})
