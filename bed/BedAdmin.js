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
BedAdmin.getFreeItems = async (db, md, bind) => {
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
				left join sources_winners da${i} ON (
					da${i}.entity_id = win.entity_id 
					and da${i}.key_id = win.key_id 
					and da${i}.prop_id = ${md.props[prop_nick]?.prop_id || 0}
				)
				left join sources_cells ce${i} on (
					da${i}.source_id = ce${i}.source_id 
					and da${i}.sheet_index = ce${i}.sheet_index
					and da${i}.row_index = ce${i}.row_index
					and da${i}.col_index = ce${i}.col_index
				)
			`)
			where.push(`
				ce${i}.value_id in (${Object.keys(md.group.mgroup[prop_nick]).map(val => `"${md.values[val]?.value_id || 0}"`).join(', ')})
			`)
			
		}
	}
	for (const child of md.childs) { //Исключаем позиции подгрупп
		const marks = []
		const mgroup = await Bed.getMgroupDirect(db, child.group_id)
		for (const prop_nick in mgroup) {
			i++
			from.push(`left join sources_groups da${i} ON (da${i}.entity_id = win.entity_id and da${i}.key_id = win.key_id and da${i}.prop_id = ${md.props[prop_nick]?.prop_id || 0})`)
			const values = Object.keys(mgroup[prop_nick]).map(val => `"${md.values[val]?.value_id || 0}"`).join(', ')
			marks.push(`(da${i}.value_id not in (${values}) or da${i}.value_id is null)`)
		}
		if (marks.length) {
			where.push('(' + marks.join(' or ') + ')')
		}
	}
	const sql = `
		SELECT win.key_id
		FROM 
			${from.join(' ')}
		WHERE 
			${where.join(' and ')}
		LIMIT 1000
	`

	bind.sql = sql
	
	const list = await db.colAll(sql, bind)
	return list
}
BedAdmin.getItemsValues = async (db, itemids, bind) => {
	if (!itemids.length) return []
	const itemprops = await db.all(`
		SELECT 
			win.key_id,
			pr.prop_title,
			va.value_title
		FROM sources_winners win, 
			sources_wvalues wv,
			sources_values va,
			sources_props pr
		WHERE win.entity_id = :pos_entity_id


			and wv.win_id = win.win_id

			and pr.prop_id = win.prop_id
		 	and va.value_id = wv.value_id

			and win.key_id in (${itemids.join(',')})
		ORDER BY win.win_id
	`, bind)
	
	const items = Object.groupBy(itemprops, row => row.key_id)
	for (const key_id in items) {
		const more = Object.groupBy(items[key_id], row => row.prop_title)
		for (const prop_title in more) {
			const myvals = more[prop_title].map(row => row.value_title).join(', ')
			more[prop_title] = myvals
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