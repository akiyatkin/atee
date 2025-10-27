import Shop from "/-shop/Shop.js"
import nicked from "/-nicked"
import Rest from '/-rest'
const rest = new Rest()
export default rest

import rest_shopadmin from '/-shop/admin/rest.shopadmin.js'
rest.extra(rest_shopadmin)


// rest.addResponse('get-recalc', ['admin'], async view => {
// 	const db = await view.get('db')
// 	const dates = view.data.activities = await ShopAdmin.getActivities(db) //change, index
// 	//const laststart = (dates.date_recalc || 0) * 1000

// 	// view.data.start = Sources.recalc.start ? Sources.recalc.start.getTime() : false
// 	// if (!view.data.start && Sources.recalc.lastend) view.data.start = Sources.recalc.laststart && Sources.recalc.lastend.getTime() + 1000 > Date.now() ? Sources.recalc.laststart.getTime() : false

	
// 	return view.ret()
// })

rest.addResponse('get-prop-value-search', ['admin'], async view => {
	const db = await view.get('db')
	const type = await view.get('type') //samplevalue
	
	const hashs = await view.get('hashs')
	const query_nick = await view.get('query_nick')

	const prop = await view.get('prop')
	const prop_id = prop?.prop_id
	
	const group_id = await view.get('group_id#required')
	const parent_id = group_id ? await db.col(`select parent_id from shop_groups where group_id = :group_id`, {group_id}) : false

	const bind = await Shop.getBind(db)
	let list = []
	
	if (prop.type == 'value') {
		if (parent_id) {
			list = await db.all(`
				WITH RECURSIVE group_tree AS (
					SELECT ${parent_id} as group_id
					UNION ALL
					SELECT sg.group_id
					FROM shop_groups sg, group_tree gt 
					WHERE sg.parent_id = gt.group_id
				)
				SELECT distinct va.value_title, va.value_nick as nick
				FROM group_tree gt, shop_itemgroups ig, sources_wvalues wva, sources_values va
				WHERE 
					ig.group_id = gt.group_id
					and wva.key_id = ig.key_id
					and wva.entity_id = ${bind.brendart_prop_id}
					and wva.prop_id = ${prop_id}
					and va.value_id = wva.value_id
					and (${hashs.map(hash => 'va.value_nick like "%' + hash.join('%" and va.value_nick like "%') + '%"').join(' or ') || '1 = 1'})
				ORDER BY RAND()
				LIMIT 12
			`)
		} else {
			list = await db.all(`
				SELECT distinct va.value_title, va.value_nick as nick
				FROM sources_wvalues wva, sources_values va
				WHERE 
					wva.entity_id = ${bind.brendart_prop_id}
					and wva.prop_id = ${prop_id}
					and va.value_id = wva.value_id
					and (${hashs.map(hash => 'va.value_nick like "%' + hash.join('%" and va.value_nick like "%') + '%"').join(' or ') || '1 = 1'})
				ORDER BY RAND()
				LIMIT 12
			`)
		}
	} else if (prop.type == 'number') {
		// if (parent_id) {
		// 	list = await db.all(`
		// 		WITH RECURSIVE group_tree AS (
		// 			SELECT :parent_id as group_id
		// 			UNION ALL
		// 			SELECT sg.group_id
		// 			FROM shop_groups sg, group_tree gt 
		// 			WHERE sg.parent_id = gt.group_id
		// 		)
		// 		SELECT distinct wn.number as nick
		// 		FROM group_tree gt, shop_itemgroups ig, sources_wnumbers wn
		// 		WHERE 
		// 			ig.group_id = gt.group_id
		// 			and wn.key_id = ig.key_id
		// 			and wn.entity_id = :brendart_prop_id
		// 			and wn.prop_id = :prop_id
		// 			and (${hashs.map(hash => 'wn.number like "%' + hash.join('%" and wn.number like "%') + '%"').join(' or ') || '1 = 1'})
		// 		ORDER BY RAND()
		// 		LIMIT 12
		// 	`, {...bind, prop_id, parent_id})
		// } else {
		// 	list = await db.all(`
		// 		SELECT distinct wn.number as nick
		// 		FROM sources_wnumbers wn
		// 		WHERE 
		// 			wn.entity_id = :brendart_prop_id
		// 			and wn.prop_id = :prop_id
		// 			and (${hashs.map(hash => 'wn.number like "%' + hash.join('%" and wn.number like "%') + '%"').join(' or ') || '1 = 1'})
		// 		ORDER BY RAND()
		// 		LIMIT 12
		// 	`, {...bind, prop_id})
		// }
	}

	view.ans.list = list.map(row => {
		row['left'] = row.value_title || row.nick
		row['right'] = ''
		return row
	})
	
	if (type == 'samplevalue') {
		if (query_nick) {
			const prop = await Shop.getValueByNick(db, query_nick)
			if (!prop) {
				view.ans.list.push({
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


	return view.ret()
})


rest.addResponse('get-tpl-sub', ['admin'], async view => {
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
		FROM sources_wprops
		WHERE type in ("value","number") 
		and (${hashs.map(hash => 'prop_nick like "%' + hash.join('%" and prop_nick like "%') + '%"').join(' or ') || '1 = 1'})
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
	
	
	return view.ret()
})
rest.addResponse('get-prop-search', ['admin'], async view => {
	const db = await view.get('db')
	const hashs = await view.get('hashs')
	const query_nick = await view.get('query_nick')
	
	const list = await db.all(`
		SELECT prop_id, prop_title, prop_nick, type
		FROM sources_wprops
		WHERE type in ("value","number","text") 
		and (${hashs.map(hash => 'prop_nick like "%' + hash.join('%" and prop_nick like "%') + '%"').join(' or ') || '1 = 1'})
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

	return view.ret()
})
rest.addResponse('get-group-card-prop-search', ['admin'], async view => {
	const db = await view.get('db')
	const hashs = await view.get('hashs')
	const query_nick = await view.get('query_nick')
	
	const list = await db.all(`
		SELECT prop_id, prop_title, prop_nick, type
		FROM sources_wprops
		WHERE type in ("value","number","text") 
		and (${hashs.map(hash => 'prop_nick like "%' + hash.join('%" and prop_nick like "%') + '%"').join(' or ') || '1 = 1'})
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
		FROM sources_wprops
		WHERE 
		-- type in ("value","number",) and 
		(${hashs.map(hash => 'prop_nick like "%' + hash.join('%" and prop_nick like "%') + '%"').join(' or ') || '1 = 1'})
	`)

	view.ans.list = list.map(row => {
		row['left'] = row.prop_title
		row['right'] = ''
		return row
	})	
	
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

import ImpExp from "/-sources/ImpExp.js"
rest.addResponse('get-export', ['admin'], async view => {
	const db = await view.get('db')	
	const msg = await ImpExp.export(db, rest_shopadmin.exporttables)
	if (msg) return view.ret(msg)
	return view.err('Нет данных для экспорта')
})
