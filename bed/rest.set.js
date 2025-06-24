import BedAdmin from "/-bed/BedAdmin.js"
import Bed from "/-bed/api/Bed.js"
import nicked from "/-nicked"

import Rest from '/-rest'
const rest = new Rest()
export default rest
import rest_bed from '/-bed/rest.bed.js'
rest.extra(rest_bed)

import rest_bedadmin from '/-bed/rest.bedadmin.js'
rest.extra(rest_bedadmin)

// rest.addAction('set-group-mark-delete', ['admin'], async view => {
// 	const group = await view.get('group#required')
// 	const prop = await view.get('prop#required')
// 	const db = await view.get('db')
// 	await db.exec(`
// 		DELETE FROM bed_samplevalues
// 		WHERE group_id = :group_id 
// 		and prop_nick = :prop_nick
// 	`, {
// 		group_id: group.group_id, 
// 		prop_nick: prop.prop_nick
// 	})

// 	await BedAdmin.reorderGroups(db)

// 	return view.ret()
// })
rest.addAction('set-group-mark-value-delete', ['admin'], async view => {
	const group = await view.get('group#required')
	const prop_nick = await view.get('prop_nick#required')
	const value_nick = await view.get('value_nick')
	const db = await view.get('db')
	await db.exec(`
		DELETE ma FROM bed_samplevalues ma, bed_samples gs
		WHERE gs.group_id = :group_id and gs.sample_id = ma.sample_id
		and prop_nick = :prop_nick
		and value_nick = :value_nick
	`, {
		group_id: group.group_id, 
		prop_nick, value_nick
	})

	await BedAdmin.reorderGroups(db)

	return view.ret()
})
rest.addAction('set-sample-delete', ['admin'], async view => {
	const sample_id = await view.get('sample_id#required')
	const db = await view.get('db')
	await db.exec(`
		DELETE sa FROM bed_samples sa
		WHERE sa.sample_id = :sample_id
	`, {
		sample_id
	})

	//await BedAdmin.reorderGroups(db)

	return view.ret()
})
rest.addAction('set-sample-prop-delete', ['admin'], async view => {
	const sample_id = await view.get('sample_id#required')
	const prop_nick = await view.get('prop_nick#required')
	const db = await view.get('db')
	await db.exec(`
		DELETE sp, spv FROM bed_sampleprops sp
		LEFT JOIN bed_samplevalues spv on (spv.sample_id = sp.sample_id and spv.prop_nick = sp.prop_nick)
		WHERE sp.sample_id = :sample_id and sp.prop_nick = :prop_nick
		and sp.prop_nick = :prop_nick
		and sp.sample_id = :sample_id
	`, {
		sample_id, 
		prop_nick
	})

	//await BedAdmin.reorderGroups(db)

	return view.ret()
})
rest.addAction('set-sample-prop-spec', ['admin'], async view => {
	const spec = await view.get('spec#required')
	const prop_nick = await view.get('prop_nick#required')
	const sample_id = await view.get('sample_id#required')
	const db = await view.get('db')

	await db.exec(`
		UPDATE bed_sampleprops 
		SET spec = :spec
		WHERE sample_id = :sample_id and prop_nick = :prop_nick
	`, {
		spec,
		sample_id, 
		prop_nick
	})

	
	await db.exec(`
		DELETE FROM bed_samplevalues WHERE sample_id = :sample_id and prop_nick = :prop_nick
	`, {sample_id, prop_nick})

	return view.ret()
})
rest.addAction('set-sample-prop-value', ['admin'], async view => {
	const prop_nick = await view.get('prop_nick#required')
	const sample_id = await view.get('sample_id#required')
	const value_nick = await view.get('value_nick#required')
	const db = await view.get('db')

	await db.exec(`
		UPDATE bed_sampleprops 
		SET spec = 'exactly'
		WHERE sample_id = :sample_id and prop_nick = :prop_nick
	`, {
		sample_id, 
		prop_nick
	})
	await db.exec(`
		INSERT IGNORE INTO bed_samplevalues (sample_id, prop_nick, value_nick)
		VALUES (:sample_id, :prop_nick, :value_nick)
	`, {
		sample_id, 
		prop_nick, value_nick
	})
	
	return view.ret()
})
rest.addAction('set-sample-prop-create', ['admin'], async view => {
	const prop = await view.get('prop#required')
	if (prop.type != 'value') return view.err('Выборка может быть только по свойствам value')
	const sample_id = await view.get('sample_id#required')
	const db = await view.get('db')
		
	await db.exec(`
		INSERT IGNORE INTO bed_sampleprops (sample_id, prop_nick)
		VALUES (:sample_id, :prop_nick)
	`, {
		sample_id: sample_id, 
		prop_nick: prop.prop_nick
	})
	return view.ret()
})
rest.addAction('set-sample-create', ['admin'], async view => {
	const prop = await view.get('prop#required')
	if (prop.type != 'value') return view.err('Выборка может быть только по свойствам value')
	const group = await view.get('group#required')
	const db = await view.get('db')
	const sample_id = await db.insertId(`
		INSERT INTO bed_samples (group_id)
		VALUES (:group_id)
	`, {
		group_id: group.group_id
	})	
	await db.exec(`
		INSERT INTO bed_sampleprops (sample_id, prop_nick)
		VALUES (:sample_id, :prop_nick)
	`, {
		sample_id: sample_id, 
		prop_nick: prop.prop_nick
	})
	return view.ret()
})
rest.addAction('set-group-filter', ['admin'], async view => {
	const prop = await view.get('prop#required')
	if (!~['value','number'].indexOf(prop.type)) return view.err('Тип свойства <b>'+prop.type+'</b> не подходит для фильтра')

	const group = await view.get('group#required')
	const db = await view.get('db')
	await db.exec(`
		INSERT IGNORE INTO bed_filters (group_id, prop_nick)
		VALUES (:group_id, :prop_nick)
	`, {
		group_id: group.group_id, 
		prop_nick: prop.prop_nick
	})

	return view.ret()
})
rest.addAction('set-group-create', ['admin'], async view => {
	const group = await view.get('group')
	const db = await view.get('db')

	const group_title = await view.get('group_title')
	const group_nick = nicked(group_title)
	if (!group_nick) return view.err('Укажите название')

	const ready = await Bed.getGroupByNick(db, group_nick)
	if (ready) return view.err('Такая подгруппа уже есть в группе ' + ready.parent_title)

	const parent_id = group?.group_id || null
	const ordain = await db.col(`select max(ordain) from bed_groups where parent_id <=> :parent_id`, {parent_id}) || 0
	//const level = group?.level || 0
	await db.exec(`
		INSERT INTO bed_groups (group_nick, group_title, group_name, parent_id, ordain)
		VALUES (:group_nick, :group_title, :group_title, :parent_id, :ordain + 1)
	`, {parent_id, group_title, group_nick, ordain})	
	

	await BedAdmin.reorderGroups(db)

	return view.ret()
})
rest.addAction('set-filter-delete', ['admin'], async view => {
	const group = await view.get('group#required')
	const group_id = group.group_id
	const prop_nick = await view.get('prop_nick#required')
	const db = await view.get('db')
	
	await db.exec(`
		DELETE FROM bed_filters
		WHERE group_id = :group_id and prop_nick = :prop_nick
	`, {group_id, prop_nick})

	await BedAdmin.reorderGroups(db)

	return view.ret()
})
rest.addAction('set-group-delete', ['admin'], async view => {
	const group = await view.get('group#required')
	const db = await view.get('db')
	const childs = await Bed.getChilds(db, group.group_id)
	if (childs.length) return view.err('Удалите сначало подгруппы')
	await db.exec(`
		DELETE FROM bed_groups
		WHERE group_id = :group_id
	`, group)

	await BedAdmin.reorderGroups(db)

	return view.ret()
})
rest.addAction('set-group-title', ['admin'], async view => {
	const group = await view.get('group#required')
	const db = await view.get('db')

	const group_title = await view.get('group_title')
	const group_nick = nicked(group_title)
	const g = await Bed.getGroupByNick(db, group_nick)
	if (g) return view.err('Такое имя уже есть ' + g.group_title)
	await db.exec(`
		UPDATE bed_groups 
		SET group_title = :group_title, group_nick = :group_nick 
		WHERE group_id = :group_id
	`, {...group, group_title, group_nick})
	view.data.group_nick = group_nick
	return view.ret()
})
rest.addAction('set-group-ordain', ['admin'], async view => {
	const next_id = await view.get('next_id')
	const id = await view.get('id#required')
	const db = await view.get('db')

	let ordain
	if (!next_id) ordain = await db.col('SELECT max(ordain) FROM bed_groups') + 1
	if (next_id) ordain = await db.col('SELECT ordain FROM bed_groups WHERE group_id = :next_id', {next_id}) - 1
	if (ordain < 0) ordain = 0
	await db.exec(`
		UPDATE bed_groups 
		SET ordain = :ordain 
		WHERE group_id = :id
	`, {ordain, id})

	await BedAdmin.reorderGroups(db)	

	return view.ret()
})
rest.addAction('set-filter-ordain', ['admin'], async view => {
	const group = await view.get('group#required')
	const group_id = group.group_id
	const next_nick = await view.get('next_nick')
	const prop_nick = await view.get('prop_nick#required')
	const db = await view.get('db')

	let ordain
	if (!next_nick) ordain = await db.col('SELECT max(ordain) FROM bed_filters') + 1
	if (next_nick) ordain = await db.col('SELECT ordain FROM bed_filters WHERE prop_nick = :next_nick and group_id = :group_id', {next_nick, group_id}) - 1
	if (ordain < 0) ordain = 0
	await db.exec(`
		UPDATE bed_filters 
		SET ordain = :ordain 
		WHERE prop_nick = :prop_nick and group_id = :group_id
	`, {ordain, group_id, prop_nick})

	await BedAdmin.reorderFilters(db)	

	return view.ret()
})