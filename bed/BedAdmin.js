import Bed from "/-bed/api/Bed.js"
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
BedAdmin.getFreeItems = async (db, md) => {
	const from = ['sources_winners win']
	const where = [`
		win.entity_id = :pos_entity_id 
		and win.prop_id = :mod_entity_id 
	`]
	let i = 0
	if (md.group) {
		for (const prop_nick in md.group.mgroup) { //Находим позиции группы
			i++
			from.push(`
				left join sources_wvalues da${i} ON (
					da${i}.entity_id = win.entity_id 
					and da${i}.key_id = win.key_id 
					and da${i}.prop_id = ${md.props[prop_nick]?.prop_id || 0}
				)
			`)
			where.push(`
				da${i}.value_id in (${Object.keys(md.group.mgroup[prop_nick]).map(val => `"${md.values[val]?.value_id || 0}"`).join(', ')})
			`)
			
		}
	}
	for (const child of md.childs) { //Исключаем позиции подгрупп
		const marks = []		
		const mgroup = await Bed.getMgroupDirect(db, child.group_id)

		for (const prop_nick in mgroup) {
			i++
			from.push(`left join sources_wvalues da${i} ON (da${i}.entity_id = win.entity_id and da${i}.key_id = win.key_id and da${i}.prop_id = ${md.props[prop_nick]?.prop_id || 0})`)
			const values = Object.keys(mgroup[prop_nick]).map(val => `"${md.values[val]?.value_id || 0}"`).join(', ')
			marks.push(`(da${i}.value_id not in (${values}) or da${i}.value_id is null)`)
		}
		if (marks.length) {
			where.push('(' + marks.join(' or ') + ')')
		}
	}

	const count = await db.col(`
		SELECT count(distinct win.key_id)
		FROM 
			${from.join(' ')}
		WHERE 
			${where.join(' and ')}
	`, md)
	const list = await db.colAll(`
		SELECT win.key_id
		FROM 
			${from.join(' ')}
		WHERE 
			${where.join(' and ')}
		LIMIT 500
	`, md)
	if (!count) return {count}
	const freeitems = await BedAdmin.getItemsValues(db, list, md)
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
	return {count, head: props.map(prop => prop.prop_title), rows}
}
BedAdmin.getItemsValues = async (db, itemids, md) => {
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
	`, md)
	
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