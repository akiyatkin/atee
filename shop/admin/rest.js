import config from "@atee/config"
import nicked from "@atee/nicked"
import Access from "/-controller/Access.js"
import Shop from "/-shop/Shop.js"
import ShopAdmin from "/-shop/admin/ShopAdmin.js"
import Rest from "@atee/rest"
const rest = new Rest()
export default rest

import rest_set from '/-shop/admin/rest.set.js'
rest.extra(rest_set)
import rest_get from '/-shop/admin/rest.get.js'
rest.extra(rest_get)
import rest_shopadmin from '/-shop/admin/rest.shopadmin.js'
rest.extra(rest_shopadmin)

const MONTHS = {
	1: 'Янв', 2: 'Фев', 3: 'Мар', 4: 'Апр', 
	5: 'Май', 6: 'Июн', 7: 'Июл', 8: 'Авг', 
	9: 'Сен', 10: 'Окт', 11: 'Ноя', 12: 'Дек'
};
const STATCOLS = `
	year,
	month,
	poscount,
	modcount,
	groupcount,
	brandcount,
	filtercount,
	sourcecount,
	basketcount,
	ordercount,
	UNIX_TIMESTAMP(date_cost) as date_cost,
	withfilters,
	withbrands,
	withcost,
	withimg,
	withdescr,
	withname,
	withall
`
rest.addAction('brief-plop', ['admin','recalcStat'], async view => {
	const db = await view.get('db')
	const detail = await view.get('detail') || 'groups'
	
	const brand_nick = await view.get('brand_nick')
	const source_id = await view.get('source_id')
	

	
	
	
	const plot = view.data.plot = {}
	
	const conf = await config('shop')
	view.data.conf = await config('shop', true)
	const root = view.data.root = await Shop.getGroupByNick(db, conf.root_nick)
	const group_id = await view.get('group_id')
	const group = view.data.group = group_id ? await Shop.getGroupById(db, group_id) : false

	let rows
	if (detail == 'brand') {
		//const brand = view.data.brand = brand_nick ? await db.fetch(`select value_title as brand_title, value_id as brand_id from sources_values where value_nick = :brand_nick`, {brand_nick}) : false	
		rows = group_id ? await db.all(`
			select ${STATCOLS}
			from shop_stat_groups_brands sg
			WHERE sg.group_id = :group_id and sg.brand_nick = :brand_nick
			order by year, month
		`, {brand_nick, group_id}): await db.all(`
			select ${STATCOLS}
			from shop_stat_brands sg
			where sg.brand_nick = :brand_nick
			order by year, month
		`, {brand_nick})
	} else if (detail == 'source') {		
		
		//const source = view.data.source = source_id ? await db.fetch(`select source_id, source_title from sources_sources where source_id = :source_id`, {source_id}) : false
		rows = group_id ? await db.all(`
			select ${STATCOLS}
			from shop_stat_groups_sources sg
			WHERE sg.group_id = :group_id and sg.source_id = :source_id
			order by year, month
		`, {source_id, group_id}): await db.all(`
			select ${STATCOLS}
			from shop_stat_sources sg
			where sg.source_id = :source_id
			order by year, month
		`, {source_id})
	} else {
		rows = group_id ? await db.all(`
			select ${STATCOLS}
			from shop_stat_groups sg
			WHERE sg.group_id = :group_id
			order by year, month
		`, {group_id}): await db.all(`
			select ${STATCOLS}
			from shop_stat sg
			order by year, month
		`, {group_id})
	}

	plot.label = []
	plot.data = {}

	for (const row of rows) {
		plot.label.push(MONTHS[row.month] + ' ' + row.year)
		delete row.month
		delete row.year

		for (const name in row) {
			plot.data[name] ??= []
			plot.data[name].push(row[name])
		}
	}
	return view.ret()
})
rest.addVariable('recalcStat', async view => {
	const db = await view.get('db')

	await ShopAdmin.checkRestat(db)
	
})
rest.addAction('inform', ['admin','recalcStat'], async view => {
	const db = await view.get('db')

	const conf = await config('shop')	
	const group_id = await Shop.getGroupIdByNick(db, conf.root_nick)

	const ym = ShopAdmin.getNowYM()
	
	view.data.brands = await db.all(`
		select va.value_nick as brand_nick, va.value_title as brand_title,
			poscount,
			modcount,
			groupcount,
			brandcount,
			sourcecount,
			UNIX_TIMESTAMP(date_cost) as date_cost,
			withimg,
			withdescr,
			withall

		from shop_stat_groups_brands st, sources_values va
		WHERE year = :year and month = :month
		and va.value_nick = st.brand_nick and st.group_id = :group_id
		ORDER by year DESC, month DESC
	`, {group_id, ...ym})

	return view.ret()
})
rest.addAction('brief', ['admin','recalcStat'], async view => {
	const db = await view.get('db')

	



	const detail = await view.get('detail')
	
	const brand_nick = await view.get('brand_nick')

	const source_id = await view.get('source_id')

	
	view.data.source = source_id ? await db.fetch(`select source_id, source_title from sources_sources where source_id = :source_id`, {source_id}) : false
	view.data.brand = brand_nick ? await db.fetch(`select value_title as brand_title, value_id as brand_id from sources_values where value_nick = :brand_nick`, {brand_nick}) : false	

	const conf = await config('shop')
	view.data.conf = await config('shop', true)
	const root = view.data.root = await Shop.getGroupByNick(db, conf.root_nick)
	const group_id = await view.get('group_id')
	const group = view.data.group = group_id ? await Shop.getGroupById(db, group_id) : false

	const ym = ShopAdmin.getNowYM()
	
	const rootsql = group_id && !group.parent_id ? `
			select -1 as ordain, "<b><i>.. Корень</i></b>" as group_title, null as group_id, ${STATCOLS}
			from shop_stat st
			WHERE year = :year and month = :month
			
			UNION ALL
	` : ''
	const groups = view.data.groups = await db.all(`

			${rootsql}

			select 0 as ordain, CONCAT('<b>.. ', gr.group_title ,'</b>') as group_title, gr.group_id, ${STATCOLS}
			from shop_stat_groups st, shop_groups gr
			WHERE year = :year and month = :month and gr.group_id <=> :parent_id
			and gr.group_id = st.group_id

			UNION ALL

			select gr.ordain, gr.group_title, st.group_id, ${STATCOLS}
			from shop_stat_groups st, shop_groups gr
			WHERE year = :year and month = :month and gr.parent_id <=> :group_id
			and gr.group_id = st.group_id

			ORDER by ordain
	`, { group_id, parent_id: group?.parent_id || null, ...ym})

	for (const group of groups) {
		if (!group.group_id) continue
		group.group = await Shop.getGroupById(db, group.group_id)
	}



	if (group_id) {
		view.data.sources = await db.all(`
			select so.source_title, so.source_id, ${STATCOLS}
			from shop_stat_groups_sources st, sources_sources so
			WHERE year = :year and month = :month
			and so.source_id = st.source_id and st.group_id = :group_id
			ORDER by year DESC, month DESC
		`, {group_id, ...ym})
	
	} else {
		view.data.sources = await db.all(`
			select so.source_title, so.source_id, ${STATCOLS}
			from shop_stat_sources st, sources_sources so
			WHERE year = :year and month = :month
			and so.source_id = st.source_id
			ORDER by year DESC, month DESC
		`, { ...ym})
	}
	

	if (group_id) {
		view.data.brands = await db.all(`
			select va.value_nick as brand_nick, va.value_title as brand_title, ${STATCOLS}
			from shop_stat_groups_brands st, sources_values va
			WHERE year = :year and month = :month
			and va.value_nick = st.brand_nick and st.group_id = :group_id
			ORDER by year DESC, month DESC
		`, {group_id, ...ym})
	} else {
		view.data.brands = await db.all(`
			select va.value_nick as brand_nick, va.value_title as brand_title, ${STATCOLS}
			from shop_stat_brands st, sources_values va
			WHERE year = :year and month = :month
			and va.value_nick = st.brand_nick
			ORDER by year DESC, month DESC
		`, { ...ym})
	}


	return view.ret()
})
rest.addAction('poss', ['admin'], async view => {
	const db = await view.get('db')
	const hashs = await view.get('hashs')
	const bind = await Shop.getBind(db)
	const group_id = await view.get('group_id')
	const count = await view.get('count') || 25
	if (group_id) view.data.group = await Shop.getGroupById(db, group_id)

	const source_id = await view.get('source_id')
	if (source_id) {
		view.data.source = await db.fetch(`select source_id, source_title from sources_sources where source_id = :source_id`, {source_id})
	}
	
	
	
	
	const origm = await view.get('m')
	const query = await view.get('query')

	const md = view.data.md = await Shop.getmd(db, origm, query, hashs)
	

	await Shop.prepareMgetPropsValues(db, view.data, md.mget)

	

	let key_ids
	if (!origm) {

		if (group_id) {
			key_ids = await db.colAll(`
				SELECT it.key_id
				FROM sources_witems it, shop_allitemgroups ig
				WHERE it.entity_id = ${bind.brendart_prop_id}
				and ig.group_id = ${group_id}
				and it.key_id = ig.key_id
				and (${hashs.map(hash => 'it.search like "% ' + hash.join('%" and it.search like "% ') + '%"').join(' or ') || 'it.search != ""'}) 
				ORDER BY RAND()
				LIMIT ${count}
			`)		
			view.data.count = await db.col(`
				SELECT count(distinct it.key_id)
				FROM sources_witems it, shop_allitemgroups ig
				WHERE it.entity_id = ${bind.brendart_prop_id}
				and ig.group_id = ${group_id}
				and it.key_id = ig.key_id
				and (${hashs.map(hash => 'it.search like "% ' + hash.join('%" and it.search like "% ') + '%"').join(' or ') || 'it.search != ""'}) 
			`)
		} else {

			key_ids = await db.colAll(`
				SELECT it.key_id
				FROM sources_witems it, sources_wvalues wva
				WHERE it.entity_id = ${bind.brendart_prop_id} and wva.key_id = it.key_id and it.entity_id = wva.entity_id 
				and wva.prop_id = ${bind.brendmodel_prop_id}
				and (${hashs.map(hash => 'it.search like "% ' + hash.join('%" and it.search like "% ') + '%"').join(' or ') || 'it.search != ""'}) 
				ORDER BY RAND()
				LIMIT ${count}
			`)
			view.data.count = await db.col(`
				SELECT count(*)
				FROM sources_witems it, sources_wvalues wva
				WHERE it.entity_id = ${bind.brendart_prop_id} and wva.key_id = it.key_id and it.entity_id = wva.entity_id
				and wva.prop_id = ${bind.brendmodel_prop_id}
				and (${hashs.map(hash => 'it.search like "% ' + hash.join('%" and it.search like "% ') + '%"').join(' or ') || 'it.search != ""'}) 
			`)
		}
	} else {
		let from = []
		let where = [] 
		let join = []
		
		if (group_id) {
			from = ['shop_allitemgroups ig, sources_wvalues win']
			where = [`
				win.entity_id = ${bind.brendart_prop_id}
				and win.prop_id = ${bind.brendmodel_prop_id}
				and ig.key_id = win.key_id
				and group_id = ${group_id}
			`]
		} else {
			from = ['sources_wvalues win']
			where = [`
				win.entity_id = ${bind.brendart_prop_id}
				and win.prop_id = ${bind.brendmodel_prop_id}
			`]
		}
		if (source_id) {
			from.unshift('sources_wcells wce')
			where.push(`
				wce.source_id = ${source_id}
				and wce.key_id = win.key_id and wce.entity_id = win.entity_id
			`)
		}
		
		const sort = await Shop.addWhereSamples(db, from, join, where, [md.mget], hashs)


		key_ids = await db.colAll(`
			SELECT distinct win.key_id
			FROM ${from.join(', ')} ${join.join(' ')}
			WHERE ${where.join(' and ')}
			ORDER BY RAND()
			LIMIT ${count}
		`)
		view.data.count = await db.col(`
			SELECT count(distinct win.key_id)
			FROM ${from.join(', ')} ${join.join(' ')}
			WHERE ${where.join(' and ')}
		`)
	}
	

	const items = await ShopAdmin.getItems(db, key_ids) //{key_id: {prop_id: text}}
	const table = await ShopAdmin.getTable(db, items) //items => {head: [prop_title], rows:[[text]], prop_ids, key_ids}

	table.groups = []
	for (const key_id of table.key_ids) {
		const groups = await db.all(`
			select gr.group_title, gr.group_id 
			from shop_groups gr, shop_itemgroups ig
			where ig.key_id = ${key_id} and gr.group_id = ig.group_id
		`)
		table.groups.push(groups)
	}

	view.data.table = table

	return view.ret()
})

rest.addAction('main', async view => {
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
rest.addAction('settings', ['admin'], async view => {

	const conf = await config('shop')
	view.data.dir = conf.dir
	view.data.exporttables = rest_shopadmin.exporttables

	const db = await view.get('db')

	view.data.date_access = Math.round(Access.getAccessTime() / 1000)
	view.data.date_update = Math.round(Access.getUpdateTime() / 1000)
	view.data.tables = await db.estimate(rest_shopadmin.TABLES)
	return view.ret()
})
rest.addAction('brands', ['admin'], async view => {
	const db = await view.get('db')

	return view.ret()
})
rest.addAction('props', ['admin'], async view => {
	const db = await view.get('db')
	const hashs = await view.get('hashs')
	const list = await db.all(`
		SELECT 
			bp.prop_nick, 
			bp.singlechoice + 0 as singlechoice,
			bp.card_tpl, 
			bp.filter_tpl, 
			pr.known,
			pr.comment,
			pr.type,
			pr.multi + 0 as multi,
			pr.prop_title, 
			pr.prop_id
		FROM shop_props bp
			LEFT JOIN sources_props pr on pr.prop_nick = bp.prop_nick
		WHERE pr.prop_id is null
		order by pr.ordain
	`)

	view.data.props = await db.all(`
		SELECT 
			bp.singlechoice + 0 as singlechoice,
			bp.card_tpl, 
			bp.filter_tpl, 
			pr.prop_nick, 
			pr.known,
			pr.comment,
			pr.type,
			pr.multi + 0 as multi,
			pr.prop_title, 
			pr.prop_id
		FROM sources_props pr
			LEFT JOIN shop_props bp on pr.prop_nick = bp.prop_nick
		WHERE
		(${hashs.map(hash => 'pr.prop_nick like "%' + hash.join('%" and pr.prop_nick like "%') + '%"').join(' or ') || '1 = 1'}) 
		ORDER BY rand()
		limit 20
	`)
	for(const row of list) {
		view.data.props.unshift(row)
	}
	
	return view.ret()
})
rest.addAction('groups', ['admin'], async view => {
	const db = await view.get('db')
	const group_id = await view.get('group_id')
	const group = view.data.group = await ShopAdmin.getGroupById(db, group_id)
	const hashs = await view.get('hashs')
	const bind = await Shop.getBind(db)
	view.data.conf = await config('shop', true)
	const count = await view.get('count') || 25	


	if (group) {

		view.data.filters = await db.all(`
			SELECT fi.prop_nick, pr.prop_title, pr.prop_id
			FROM shop_filters fi
				LEFT JOIN sources_wprops pr on pr.prop_nick = fi.prop_nick
			WHERE fi.group_id = ${group_id}
			order by fi.ordain
		`)
		view.data.cards = await db.all(`
			SELECT ca.prop_nick, pr.prop_title, pr.prop_id
			FROM shop_cards ca
				LEFT JOIN sources_wprops pr on pr.prop_nick = ca.prop_nick
			WHERE ca.group_id = ${group_id}
			order by ca.ordain
		`)
		
		
		
		const samples = await db.all(`
			SELECT distinct 
				sa.sample_id, 
				sp.prop_nick, 
				sp.spec, 
				pr.type, 
				spv.number,
				spv.value_nick, 
				pr.scale,
				pr.prop_title, 
				if(wv.value_id, va.value_title, null) as value_title
			FROM shop_samples sa
				LEFT JOIN shop_sampleprops sp on sp.sample_id = sa.sample_id
				LEFT JOIN shop_samplevalues spv on (spv.sample_id = sa.sample_id and spv.prop_nick = sp.prop_nick)
				LEFT JOIN sources_wprops pr on pr.prop_nick = sp.prop_nick
				LEFT JOIN sources_values va on va.value_nick = spv.value_nick
				LEFT JOIN sources_wvalues wv on (wv.entity_id = ${bind.brendart_prop_id} and va.value_id = wv.value_id and wv.prop_id = pr.prop_id)
			WHERE sa.group_id = ${group_id}
			ORDER BY sa.date_create, sp.date_create, spv.date_create
		`)
		
		view.data.samples = Object.groupBy(samples, row => row.sample_id)
		for (const sample_id in view.data.samples) {
			view.data.samples[sample_id] = Object.groupBy(view.data.samples[sample_id], row => row.prop_nick)
			delete view.data.samples[sample_id]['null']
		}
		
		

		// const s = await ShopAdmin.getSamplesUpByGroupId(db, group_id)
		// const { from, join, where, sort } = await Shop.getWhereBySamplesWinMod(db, s)
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
		//view.data.stats = await ShopAdmin.getGroupHistory(db, group_id)
	} else {
		//view.data.stats = await ShopAdmin.getHistory(db)
	}



	if (group) {
		const {poscount, modcount} = await db.fetch(`
		 	SELECT count(distinct win.key_id) as poscount, count(distinct win.value_id) as modcount
		 	FROM sources_wvalues win, shop_allitemgroups ig
		 	WHERE win.entity_id = ${bind.brendart_prop_id} and win.prop_id = ${bind.brendmodel_prop_id}
		 	and ig.key_id = win.key_id and ig.group_id = ${group_id}
		`)
		view.data.poscount = poscount
		view.data.modcount = modcount
	} else {
		const {poscount, modcount} = await db.fetch(`
		 	SELECT count(distinct win.key_id) as poscount, count(distinct win.value_id) as modcount
		 	FROM sources_wvalues win
		 	WHERE win.entity_id = ${bind.brendart_prop_id} and win.prop_id = ${bind.brendmodel_prop_id}
		`)
		view.data.poscount = poscount
		view.data.modcount = modcount
	}


	if (group) {
		view.data.freetable = await ShopAdmin.getFreeTableByGroupIndex(db, group?.parent_id, hashs, count)
		view.data.myfreetable = await ShopAdmin.getFreeTableByGroupIndex(db, group?.group_id, hashs, count)
	}
	
	
	
	
	// const test1 = await ShopAdmin.getSamplesByGroupId(db, 1)
	// const test4 = await ShopAdmin.getSamplesByGroupId(db, 4)
	// const samples = Shop.addSamples(test1, test4)
	// console.log('test1', test1)
	// console.log('test4', test4)
	// console.log('samples', samples)

	//return view.ret()



	const childs = view.data.childs = await db.all(`
		SELECT gr.group_id, 
			(select count(*) from shop_allitemgroups ig where ig.group_id = gr.group_id) as poscount,
			(select count(*) from shop_itemgroups ig where ig.group_id = gr.group_id) as freeposcount
		FROM shop_groups gr
		WHERE gr.parent_id <=> :group_id
		ORDER BY gr.ordain
	`, { group_id: group?.group_id || null })

	for (const i in childs) {
		const row = childs[i]
		row.busyposcount = row.poscount - row.freeposcount
		const group_id = row.group_id
		childs[i].group = await Shop.getGroupById(db, group_id)
	}

	// if (childs.length) {
	// 	const ym = ShopAdmin.getNowYM()
	// 	const rows = await db.all(`select *, UNIX_TIMESTAMP(date_cost) as date_cost
	// 		FROM shop_stat_groups 
	// 		WHERE year = :year and month = :month
	// 		and group_id in (${childs.map(g => g.group_id).join(',')})
	// 		ORDER BY year DESC, month DESC
	// 	`, { ...ym})

	// 	for (const group of childs) {
	// 		group.stat = rows.find(row => row.group_id == group.group_id)
	// 	}
	// }

	return view.ret()
})