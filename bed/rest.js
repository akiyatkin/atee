import config from "/-config"
import nicked from "/-nicked"
import Access from "/-controller/Access.js"
import Bed from "/-bed/api/Bed.js"
import BedAdmin from "/-bed/BedAdmin.js"

import Rest from "/-rest"
const rest = new Rest()
export default rest

import rest_set from '/-bed/rest.set.js'
rest.extra(rest_set)
import rest_get from '/-bed/rest.get.js'
rest.extra(rest_get)
import rest_bed from '/-bed/rest.bed.js'
rest.extra(rest_bed)

rest.addResponse('main', async view => {
	const isdb = await view.get('isdb')
	view.data.admin = await Access.isAdmin(view.visitor.client.cookie)
	view.data.isdb = !!isdb
	if (!view.data.admin || !view.data.isdb) return view.err()

	const db = await view.get('db')
	

	const conf = await config('sources')
	view.data.dir = conf.dir
	return view.ret()
})
rest.addResponse('settings', ['admin'], async view => {

	const conf = await config('bed')
	view.data.dir = conf.dir

	const db = await view.get('db')
	
	view.data.date_access = Math.round(Access.getAccessTime() / 1000)
	view.data.date_update = Math.round(Access.getUpdateTime() / 1000)

	return view.ret()
})
rest.addResponse('groups', ['admin'], async view => {
	const db = await view.get('db')
	const group = view.data.group = await view.get('group')

	let poscount = 0
	let modcount = 0
	let freeitems = {}
	if (group) {
		group.filters = await db.all(`
			SELECT fi.prop_nick, pr.prop_title, pr.prop_id
			FROM bed_filters fi
				LEFT JOIN sources_props pr on pr.prop_nick = fi.prop_nick
			WHERE fi.group_id = :group_id
			order by fi.ordain
		`, group)

		group.marks = await db.all(`
			SELECT ma.prop_nick, pr.prop_title, va.value_title, ma.value_nick
			FROM bed_marks ma
				LEFT JOIN sources_props pr on pr.prop_nick = ma.prop_nick
				LEFT JOIN sources_values va on va.value_nick = ma.value_nick
			WHERE ma.group_id = :group_id
		`, group)
		group.marks = Object.groupBy(group.marks, mark => mark.prop_nick)

		const md = await Bed.getmd(db, '', group)
		const {where, from, sort, bind} = Bed.getmdwhere(md, md.group.mgroup)
		poscount = await db.col(`
			SELECT count(win.key_id)
			FROM ${from.join(', ')}
			WHERE ${where.join(' and ')}
			ORDER BY ${sort.join(', ')}
		`, bind)
		modcount = await db.col(`
			SELECT count(distinct wce.value_id)
			FROM ${from.join(', ')}
			WHERE ${where.join(' and ')}
			ORDER BY ${sort.join(', ')}
		`, bind)

		if (group.parent_id) {
			const parent = await Bed.getGroupById(db, group.parent_id)
			const md = await Bed.getmd(db, '', parent)

			const freeids = await BedAdmin.getFreeItems(db, md, bind)
			freeitems = await BedAdmin.getItemsValues(db, freeids, bind)
			view.data.sql = bind.sql
		} else {
			const md = await Bed.getmd(db, '')
			const freeids = await BedAdmin.getFreeItems(db, md, bind)
			view.data.sql = bind.sql

			//freeitems = await BedAdmin.getItemsValues(db, freeids, bind)
			
			
			// const freeids = await db.all(`
			// 	SELECT win.key_id, wce.value_id
			// 	FROM sources_data pos
			// 	WHERE pos.entity_id = :pos_entity_id and pos.prop_id = :mod_entity_id
			// 	ORDER BY RAND()
			// 	LIMIT 100
			// `, bind)
			// freeitems = await BedAdmin.getItemsValues(db, freeids, bind)
		}

	} else {
		const conf = await config('bed')
		const pos_entity_id = await db.col('SELECT prop_id FROM sources_props where prop_nick = :entity_nick', {entity_nick:nicked(conf.pos_entity_title)})
		if (!pos_entity_id) console.log('Не найден conf.pos_entity_title')
		const mod_entity_id = await db.col('SELECT prop_id FROM sources_props where prop_nick = :entity_nick', {entity_nick:nicked(conf.mod_entity_title)})
		if (!mod_entity_id) console.log('Не найден conf.mod_entity_title')
		const bind = {mod_entity_id, pos_entity_id}
		poscount = await db.col(`select count(*) from sources_data WHERE entity_id = :pos_entity_id and prop_id = :mod_entity_id`, bind)
		modcount = await db.col(`select count(distinct value_id) from sources_data WHERE entity_id = :pos_entity_id and prop_id = :mod_entity_id`, bind)
	}
	const head = {}
	let i = 0
	for (const key_id in freeitems) {
		for (const prop_title in freeitems[key_id]){
			head[prop_title] ??= i++
		}
	}

	const rows = []
	for (const key_id in freeitems) {
		const row = []
		row.length = i
		row.fill('')
		for (const prop_title in freeitems[key_id]){
			row[head[prop_title]] = freeitems[key_id][prop_title]
		}
		
		rows.push(row)
	}
	
	view.data.freeitems = {head: Object.keys(head), rows}
	view.data.poscount = poscount
	view.data.modcount = modcount



	

	const group_id = group?.group_id || null
	const list = view.data.list = await db.all(`
		SELECT 
			gr.group_id, 
			gr.group_nick, 
			gr.group_title,
			pr.group_title as parent_title,
			pr.group_nick as parent_nick,
			pr.group_name as parent_name,
			(select count(*) from bed_groups ch where ch.parent_id = gr.group_id) as childs
		FROM bed_groups gr
			LEFT JOIN bed_groups pr on (pr.group_id = gr.parent_id)
		WHERE gr.parent_id <=> :group_id
		ORDER BY gr.ordain
	`, {group_id})

	for (const group of list) {
		const md = await Bed.getmd(db, '', group)
		const {where, from, sort, bind} = Bed.getmdwhere(md, md.group.mgroup)
		console.log(`
			SELECT count(distinct win.key_id)
			FROM ${from.join(', ')}
			WHERE ${where.join(' and ')}
			ORDER BY ${sort.join(', ')}
		`, bind)
		group.poscount = await db.col(`
			SELECT count(distinct win.key_id)
			FROM ${from.join(', ')}
			WHERE ${where.join(' and ')}
			ORDER BY ${sort.join(', ')}
		`, bind)

		// group.modcount = await db.col(`
		// 	SELECT count(distinct wce.value_id)
		// 	FROM ${from.join(', ')}
		// 	WHERE ${where.join(' and ')}
		// 	ORDER BY ${sort.join(', ')}
		// `, bind)
		break;
	}

	return view.ret()
})
