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
	const parent = group?.parent_id ? await Bed.getGroupById(db, group.parent_id) : false
	
	const md_parent = await Bed.getmd(db, '', parent)
	const md_group = await Bed.getmd(db, '', group)

	if (group) {
		group.filters = await db.all(`
			SELECT fi.prop_nick, pr.prop_title, pr.prop_id
			FROM bed_filters fi
				LEFT JOIN sources_props pr on pr.prop_nick = fi.prop_nick
			WHERE fi.group_id = :group_id
			order by fi.ordain
		`, group)

		group.samples = await db.all(`
			SELECT gs.sample_id, ma.prop_nick, ma.value_nick, pr.prop_title, va.value_title
			FROM bed_gsamples gs, bed_marks ma
				LEFT JOIN sources_props pr on pr.prop_nick = ma.prop_nick
				LEFT JOIN sources_values va on va.value_nick = ma.value_nick
			WHERE gs.group_id = :group_id
			and ma.sample_id = gs.sample_id
		`, group)
		group.samples = Object.groupBy(group.samples, row => row.sample_id)
		for (const sample_id in group.samples) {
			group.samples[sample_id] = Object.groupBy(group.samples[sample_id], row => row.prop_nick)
		}
	}	
	
	
	if (group) {
		const {where, from, sort, bind} = Bed.getmdwhere(md_group, md_group.group.sgroup)
		view.data.poscount = await db.col(`
			SELECT count(distinct win.key_id)
			FROM ${from.join(', ')}
			WHERE ${where.join(' and ')}
		`, bind)
		view.data.modcount = await db.col(`
			SELECT count(distinct wva.value_id)
			FROM ${from.join(', ')}
			WHERE ${where.join(' and ')}
		`, bind)
	} else {
		view.data.modcount = await db.col(`select count(distinct value_id) from sources_wvalues WHERE entity_id = :pos_entity_id and prop_id = :mod_entity_id`, md_group)
		view.data.poscount = await db.col(`select count(distinct key_id) from sources_wvalues WHERE entity_id = :pos_entity_id and prop_id = :mod_entity_id`, md_group)
	}


	view.data.freetable = group ? await BedAdmin.getFreeItems(db, md_parent) : false


	const childs = view.data.childs = await db.all(`
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
	`, {group_id: group?.group_id || null})
	for (const group of childs) {
		const md = await Bed.getmd(db, '', group)
		const {where, from, sort, bind} = Bed.getmdwhere(md, md.group.mgroup)
		
		group.poscount = await db.col(`
			SELECT count(distinct win.key_id)
			FROM ${from.join(', ')}
			WHERE ${where.join(' and ')}
		`, bind)
		group.modcount = await db.col(`
			SELECT count(distinct wva.value_id)
			FROM ${from.join(', ')}
			WHERE ${where.join(' and ')}
		`, bind)
	}

	return view.ret()
})
