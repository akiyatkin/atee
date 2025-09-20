import config from "/-config"
import nicked from "/-nicked"
import Access from "/-controller/Access.js"
import Shop from "/-shop/Shop.js"
import ShopAdmin from "/-shop/admin/ShopAdmin.js"

import Rest from "/-rest"
const rest = new Rest()
export default rest

import rest_set from '/-shop/admin/rest.set.js'
rest.extra(rest_set)
import rest_get from '/-shop/admin/rest.get.js'
rest.extra(rest_get)
import rest_shopadmin from '/-shop/admin/rest.shopadmin.js'
rest.extra(rest_shopadmin)

rest.addResponse('main', async view => {
	const isdb = await view.get('isdb')
	view.data.admin = await Access.isAdmin(view.visitor.client.cookie)
	view.data.isdb = !!isdb
	if (!view.data.admin || !view.data.isdb) return view.err()


	const db = await view.get('db')
	//const rows = await ShopAdmin.getStatRows(db)
	//view.data.rows = rows


	const conf = await config('sources')
	view.data.dir = conf.dir
	return view.ret()
})
rest.addResponse('settings', ['admin'], async view => {

	const conf = await config('shop')
	view.data.dir = conf.dir
	view.data.exporttables = rest_shopadmin.exporttables

	const db = await view.get('db')

	view.data.date_access = Math.round(Access.getAccessTime() / 1000)
	view.data.date_update = Math.round(Access.getUpdateTime() / 1000)

	return view.ret()
})
rest.addResponse('brands', ['admin'], async view => {
	const db = await view.get('db')

	return view.ret()
})
rest.addResponse('props', ['admin'], async view => {
	const db = await view.get('db')
	view.data.props = await db.all(`
		SELECT 
			bp.prop_nick, 
			bp.multichoice + 0 as multichoice,
			bp.card_tpl, 
			bp.filter_tpl, 
			pr.known,
			pr.comment,
			pr.type,
			pr.multi + 0 as multi,
			pr.prop_title, 
			pr.prop_id
		FROM shop_props bp
			LEFT JOIN sources_wprops pr on pr.prop_nick = bp.prop_nick
		order by pr.ordain
	`)
	return view.ret()
})
rest.addResponse('groups', ['admin'], async view => {
	const db = await view.get('db')
	const group_id = await view.get('group_id')
	const group = view.data.group = await ShopAdmin.getGroupById(db, group_id)
	const hashs = await view.get('hashs')
	const bind = await Shop.getBind(db)
	view.data.conf = await config('shop', true)
	
	


	if (group) {

		view.data.filters = await db.all(`
			SELECT fi.prop_nick, pr.prop_title, pr.prop_id
			FROM shop_filters fi
				LEFT JOIN sources_wprops pr on pr.prop_nick = fi.prop_nick
			WHERE fi.group_id = :group_id
			order by fi.ordain
		`, group)
		view.data.cards = await db.all(`
			SELECT ca.prop_nick, pr.prop_title, pr.prop_id
			FROM shop_cards ca
				LEFT JOIN sources_wprops pr on pr.prop_nick = ca.prop_nick
			WHERE ca.group_id = :group_id
			order by ca.ordain
		`, group)
		view.data.stats = await ShopAdmin.getGroupStats(db, group_id)
		
		
		const samples = await db.all(`
			SELECT distinct 
				sa.sample_id, 
				sp.prop_nick, 
				sp.spec, 
				pr.type, 
				spv.number,
				spv.value_nick, 
				pr.prop_title, 
				if(wv.value_id, va.value_title, null) as value_title
			FROM shop_samples sa
				LEFT JOIN shop_sampleprops sp on sp.sample_id = sa.sample_id
				LEFT JOIN shop_samplevalues spv on (spv.sample_id = sa.sample_id and spv.prop_nick = sp.prop_nick)
				LEFT JOIN sources_wprops pr on pr.prop_nick = sp.prop_nick
				LEFT JOIN sources_values va on va.value_nick = spv.value_nick
				LEFT JOIN sources_wvalues wv on (wv.entity_id = :brendart_prop_id and va.value_id = wv.value_id and wv.prop_id = pr.prop_id)
			WHERE sa.group_id = :group_id
			ORDER BY sa.date_create, sp.date_create, spv.date_create
		`, {...bind, group_id})
		
		view.data.samples = Object.groupBy(samples, row => row.sample_id)
		for (const sample_id in view.data.samples) {
			view.data.samples[sample_id] = Object.groupBy(view.data.samples[sample_id], row => row.prop_nick)
			delete view.data.samples[sample_id]['null']
		}
		
		
		view.data.poscount = view.data.stats[0]?.positions
		view.data.modcount = view.data.stats[0]?.models

		// const s = await ShopAdmin.getSamplesUpByGroupId(db, group_id)
		// const { from, join, where, sort } = await Shop.getWhereBySamples(db, s)
		// //const {where, from, sort} = Shop.getmdwhere(md_group, md_group.group.sgroup)
		// view.data.poscount = await db.col(`
		// 	SELECT count(distinct win.key_id)
		// 	FROM ${from.join(', ')} ${join.join(' ')}
		// 	WHERE ${where.join(' and ')}
		// `, bind)

		// view.data.modcount = await db.col(`
		// 	SELECT count(distinct wva.value_id)
		// 	FROM ${from.join(', ')} ${join.join(' ')}
		// 	WHERE ${where.join(' and ')}
		// `, bind)
	} else {

		const {poscount, modcount} = await db.fetch(`
			SELECT 
				COUNT(DISTINCT value_id) AS modcount,
				COUNT(*) AS poscount  
			FROM sources_wvalues
			WHERE entity_id = :brendart_prop_id and prop_id = :brendmodel_prop_id
		`, bind)
		view.data.modcount = modcount
		view.data.poscount = poscount

	}
	
	view.data.freetable = await ShopAdmin.getFreeTableByGroupIndex(db, group?.parent_id || null, hashs)
	view.data.myfreetable = await ShopAdmin.getFreeTableByGroupIndex(db, group?.group_id || null, hashs)
	
	
	
	
	// const test1 = await ShopAdmin.getSamplesByGroupId(db, 1)
	// const test4 = await ShopAdmin.getSamplesByGroupId(db, 4)
	// const samples = Shop.addSamples(test1, test4)
	// console.log('test1', test1)
	// console.log('test4', test4)
	// console.log('samples', samples)

	//return view.ret()


	const childs = view.data.childs = await db.all(`
		SELECT 
			gr.group_id, 
			gr.group_nick, 
			gr.group_title,
			pr.group_title as parent_title,
			pr.group_nick as parent_nick,
			pr.group_name as parent_name,
			(select count(*) from shop_groups ch where ch.parent_id = gr.group_id) as childs
		FROM shop_groups gr
			LEFT JOIN shop_groups pr on (pr.group_id = gr.parent_id)
		WHERE gr.parent_id <=> :group_id
		ORDER BY gr.ordain
	`, { group_id: group?.group_id || null })

	if (childs.length) {
		const ym = ShopAdmin.getNowYM()
		const rows = await db.all(`select *, UNIX_TIMESTAMP(date_content) as date_content 
			FROM shop_stat 
			WHERE year = :year and month = :month
			and group_id in (${childs.map(g => g.group_id).join(',')})
			ORDER BY year DESC, month DESC
		`, { ...ym})

		for (const group of childs) {
			group.stat = rows.find(row => row.group_id == group.group_id)
		}
	}

	return view.ret()
})