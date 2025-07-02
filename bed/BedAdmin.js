import Bed from "/-bed/api/Bed.js"
import config from '/-config'
import nicked from '/-nicked'

const BedAdmin = {}
export default BedAdmin
BedAdmin.reorderGroups = async (db) => {
	const list = await db.colAll(`
		SELECT group_id
		FROM bed_groups
		ORDER BY ordain
	`)
	let ordain = 0
	const promises = []
	for (const group_id of list) {
		ordain = ordain + 2
		const r = db.exec(`
			UPDATE bed_groups
			SET ordain = :ordain
			WHERE group_id = :group_id
		`, {ordain, group_id})
		promises.push(r)
	}
	return Promise.all(promises)
}
BedAdmin.getFreeItems = async (db, group_id = false) => {
	const ans = {poscount:0, modcount:0, head: [], rows:[]}

	const bind = await Bed.getBind(db)

	const samples = await Bed.getAllSamples(db, group_id)
	const gw = await Bed.getWhereBySamples(db, samples)
	
	
	const childs = await Bed.getChilds(db, group_id)
	let childsamples = []
	for (const child of childs) { //Исключаем позиции подгрупп
		const marks = []		
		const samples = await Bed.getSamples(db, child.group_id)
		//if (samples.length)	
		childsamples.push(...samples)
	}
	
	/*
		Выборка позиций samples (всё кроме указанного)
		Надо из этой выборки исключить childsamples
	*/
	const cw = await Bed.getWhereBySamples(db, childsamples, true)	
	
	const list = await db.colAll(`
		SELECT win.key_id
		FROM 
			${gw.from.join(', ')}
			${gw.join.join(' ')}
		WHERE 
			${gw.where.join(' and ')}
			and win.key_id not in (
				SELECT win.key_id
				FROM 
					${cw.from.join(', ')}
					${cw.join.join(' ')}
				WHERE 
					${cw.where.join(' and ')}
			)
		LIMIT 500
	`, bind)


	ans.poscount = await db.col(`
		SELECT count(distinct win.key_id)
		FROM 
			${gw.from.join(', ')}
			${gw.join.join(' ')}
		WHERE 
			${gw.where.join(' and ')}
			and win.key_id not in (
				SELECT win.key_id
				FROM 
					${cw.from.join(', ')}
					${cw.join.join(' ')}
				WHERE 
					${cw.where.join(' and ')}
			)
	`, bind)
	if (!ans.poscount) return ans
	ans.modcount = await db.col(`
		SELECT count(distinct wva.value_id)
		FROM 
			${gw.from.join(', ')}
			${gw.join.join(' ')}
		WHERE 
			${gw.where.join(' and ')}
			and win.key_id not in (
				SELECT win.key_id
				FROM 
					${cw.from.join(', ')}
					${cw.join.join(' ')}
				WHERE 
					${cw.where.join(' and ')}
			)
	`, bind)
	
	
	const freeitems = await BedAdmin.getItemsValues(db, list, bind)
	const headid = {}
	for (const key_id in freeitems) {
		for (const prop_id in freeitems[key_id]){
			headid[prop_id] ??= true
		}
	}
	const props = await db.all(`
		select prop_id, prop_title
		from sources_props 
		where prop_id in (${Object.keys(headid).join(',')})
		order by ordain
	`)
	let index = 0
	for (const prop of props) {
		prop.index = index++
	}

	const propids = Object.groupBy(props, prop => prop.prop_id)
	const rows = []
	for (const key_id in freeitems) {
		const row = []
		row.length = index
		row.fill('')
		for (const prop_id in freeitems[key_id]){
			row[propids[prop_id][0].index] = freeitems[key_id][prop_id]
		}
		rows.push(row)
	}
	ans.head = props.map(prop => prop.prop_title)
	ans.rows = rows
	return ans
}
BedAdmin.getItemsValues = async (db, itemids, bind) => {
	if (!itemids.length) return []
	const itemprops = await db.all(`
		SELECT 
			win.key_id,
			pr.prop_id,
			va.value_title
		FROM sources_winners win, 
			sources_wvalues wv,
			sources_values va,
			sources_props pr
		WHERE win.entity_id = :pos_entity_id

			and wv.entity_id = win.entity_id
			and wv.key_id = win.key_id
			and wv.prop_id = win.prop_id

			and pr.prop_id = win.prop_id
		 	and va.value_id = wv.value_id

			and win.key_id in (${itemids.join(',')})
		ORDER BY win.source_id, win.sheet_index, win.row_index
	`, bind)
	
	const items = Object.groupBy(itemprops, row => row.key_id)
	for (const key_id in items) {
		const more = Object.groupBy(items[key_id], row => row.prop_id)
		for (const prop_id in more) {
			const myvals = more[prop_id].map(row => row.value_title).join(', ')
			more[prop_id] = myvals
		}
		items[key_id] = more
	}
	
	return items
}
BedAdmin.reorderFilters = async (db) => {
	const list = await db.all(`
		SELECT group_id, prop_nick
		FROM bed_filters
		ORDER BY ordain
	`)
	let ordain = 0
	const promises = []
	for (const {group_id, prop_nick} of list) {
		ordain = ordain + 2
		const r = db.exec(`
			UPDATE bed_filters
			SET ordain = :ordain
			WHERE group_id = :group_id and prop_nick = :prop_nick
		`, {ordain, group_id, prop_nick})
		promises.push(r)
	}
	return Promise.all(promises)
}