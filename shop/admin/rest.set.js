import ShopAdmin from "/-shop/admin/ShopAdmin.js"
import Shop from "/-shop/Shop.js"
import nicked from "/-nicked"

import Rest from '/-rest'
const rest = new Rest()
export default rest
import rest_shop from '/-shop/rest.shop.js'
rest.extra(rest_shop)

import rest_shopadmin from '/-shop/admin/rest.shopadmin.js'
rest.extra(rest_shopadmin)

rest.addAction('set-stat', async view => {
	const db = await view.get('db')
	await ShopAdmin.setGroupStats(db)
	return view.ret('Статистика проверена')
})
rest.addAction('set-known', ['admin','setaccess'], async view => {
	const name = 'self_cards'
	const prop_nick = await view.get('prop_nick#required')
	const bit = await view.get('bit') || 0
	const db = await view.get('db')
	await db.exec(`
		UPDATE shop_props
		SET known = :bit
		WHERE prop_nick = :prop_nick
	`, {prop_nick, bit})
	return view.ret()
})
rest.addAction('set-sub', ['admin','setaccess'], async view => {
	const type = await view.get('type#required')
	const sub = await view.get('sub#required')
	const db = await view.get('db')
	const prop_nick = await view.get('prop_nick#required')
	const tpl = await import(`/-shop/${type}s.html.js`).then(r => r.default).catch(r => false)
	if (!tpl) return view.err('Некорректный type')
	if (!tpl.prop[sub]) return view.err('Не найден шаблон')

	await db.exec(`
		UPDATE shop_props 
		SET ${type}_tpl = :sub
		WHERE prop_nick = :prop_nick
	`, { sub, prop_nick })
	view.data.sub = sub
	return view.ret()
})



rest.addAction('set-sample-prop-value-delete', ['admin','setaccess'], async view => {
	const group = await view.get('group#required')
	const prop_nick = await view.get('prop_nick#required')
	const value_nick = await view.get('value_nick')
	const db = await view.get('db')
	await db.exec(`
		DELETE ma FROM shop_samplevalues ma, shop_samples gs
		WHERE gs.group_id = :group_id and gs.sample_id = ma.sample_id
		and prop_nick = :prop_nick
		and value_nick = :value_nick
	`, {
		group_id: group.group_id, 
		prop_nick, value_nick
	})

	await ShopAdmin.reorderGroups(db)

	return view.ret()
})
rest.addAction('set-sample-delete', ['admin','setaccess'], async view => {
	const sample_id = await view.get('sample_id#required')
	const db = await view.get('db')
	await db.exec(`
		DELETE sa FROM shop_samples sa
		WHERE sa.sample_id = :sample_id
	`, {
		sample_id
	})

	//await ShopAdmin.reorderGroups(db)

	return view.ret()
})
rest.addAction('set-sample-prop-delete', ['admin','setaccess'], async view => {
	const sample_id = await view.get('sample_id#required')
	const prop_nick = await view.get('prop_nick#required')
	const db = await view.get('db')
	await db.exec(`
		DELETE sp, spv FROM shop_sampleprops sp
		LEFT JOIN shop_samplevalues spv on (spv.sample_id = sp.sample_id and spv.prop_nick = sp.prop_nick)
		WHERE sp.sample_id = :sample_id and sp.prop_nick = :prop_nick
		and sp.prop_nick = :prop_nick
		and sp.sample_id = :sample_id
	`, {
		sample_id, 
		prop_nick
	})

	//await ShopAdmin.reorderGroups(db)

	return view.ret()
})
rest.addAction('set-sample-prop-spec', ['admin','setaccess'], async view => {
	const spec = await view.get('spec#required')
	const prop_nick = await view.get('prop_nick#required')
	const sample_id = await view.get('sample_id#required')
	const db = await view.get('db')

	await db.exec(`
		UPDATE shop_sampleprops 
		SET spec = :spec
		WHERE sample_id = :sample_id and prop_nick = :prop_nick
	`, {
		spec,
		sample_id, 
		prop_nick
	})

	
	await db.exec(`
		DELETE FROM shop_samplevalues WHERE sample_id = :sample_id and prop_nick = :prop_nick
	`, {sample_id, prop_nick})

	return view.ret()
})
rest.addAction('set-sample-prop-value-create', ['admin','setaccess'], async view => {
	const prop_nick = await view.get('prop_nick#required')
	const sample_id = await view.get('sample_id#required')
	let value_nick = await view.get('value_nick')
	const query_nick = await view.get('query_nick')
	let number = null
	if (!value_nick) {
		if (!query_nick) return view.err('Недостаточно данных')
		value_nick = query_nick
		if (Number(value_nick) == value_nick) number = Number(value_nick)
		//} else {
		//if (prop?.type != 'value') return view.err('Выборка может быть только по свойствам value')
	}
	const db = await view.get('db')

	await db.exec(`
		UPDATE shop_sampleprops 
		SET spec = 'exactly'
		WHERE sample_id = :sample_id and prop_nick = :prop_nick
	`, {
		sample_id, 
		prop_nick
	})
	await db.exec(`
		INSERT IGNORE INTO shop_samplevalues (sample_id, prop_nick, value_nick, number)
		VALUES (:sample_id, :prop_nick, :value_nick, :number)
	`, {
		sample_id, 
		prop_nick, value_nick, number
	})
	
	return view.ret()
})
rest.addAction('set-prop-delete', ['admin','setaccess'], async view => {
	const db = await view.get('db')
	const prop_nick = await view.get('prop_nick')
	await db.exec(`
		delete from shop_props where prop_nick = :prop_nick
	`, {prop_nick})
	return view.ret()
})
rest.addAction('set-prop-create', ['admin','setaccess'], async view => {
	let prop_nick = await view.get('prop_nick')
	const query_nick = await view.get('query_nick')
	if (!prop_nick) {
		if (!query_nick) return view.err('Недостаточно данных')
		prop_nick = query_nick
	}	
	const db = await view.get('db')
	
	await db.exec(`
		INSERT IGNORE INTO shop_props (prop_nick)
		VALUES (:prop_nick)
	`, { prop_nick })
	
	return view.ret()
})
rest.addAction('set-sample-prop-create', ['admin','setaccess'], async view => {
	let prop_nick = await view.get('prop_nick')
	const query_nick = await view.get('query_nick')
	if (!prop_nick) {
		if (!query_nick) return view.err('Недостаточно данных')
		prop_nick = query_nick
	}
	const sample_id = await view.get('sample_id#required')
	const db = await view.get('db')
	
	
	await db.exec(`
		INSERT IGNORE INTO shop_sampleprops (sample_id, prop_nick)
		VALUES (:sample_id, :prop_nick)
	`, { sample_id, prop_nick })
	await db.exec(`
		INSERT IGNORE INTO shop_props (prop_nick)
		VALUES (:prop_nick)
	`, { prop_nick })
	
	return view.ret()
})
rest.addAction('set-sample-create', ['admin','setaccess'], async view => {
	let prop_nick = await view.get('prop_nick')
	const query_nick = await view.get('query_nick')
	if (!prop_nick) {
		if (!query_nick) return view.err('Недостаточно данных')
		prop_nick = query_nick
	}

	const group_id = await view.get('group_id#required')
	const db = await view.get('db')
	const sample_id = await db.insertId(`
		INSERT INTO shop_samples (group_id)
		VALUES (:group_id)
	`, {group_id})	
	await db.exec(`
		INSERT INTO shop_sampleprops (sample_id, prop_nick)
		VALUES (:sample_id, :prop_nick)
	`, {
		sample_id: sample_id, 
		prop_nick: prop_nick
	})
	await db.exec(`
		INSERT IGNORE INTO shop_props (prop_nick)
		VALUES (:prop_nick)
	`, { prop_nick })
	return view.ret()
})




rest.addAction('set-group-self_cards', ['admin','setaccess'], async view => {
	const name = 'self_cards'
	const group_id = await view.get('group_id#required')
	const bit = await view.get('bit') || 0
	const db = await view.get('db')
	await db.exec(`
		UPDATE shop_groups
		SET ${name} = :bit
		WHERE group_id = :group_id
	`, {group_id, bit})
	return view.ret()
})
rest.addAction('set-group-card', ['admin','setaccess'], async view => {
	const prop = await view.get('prop#required')
	const group_id = await view.get('group_id#required')
	const db = await view.get('db')
	await db.exec(`
		INSERT IGNORE INTO shop_cards (group_id, prop_nick)
		VALUES (:group_id, :prop_nick)
	`, {
		group_id, 
		prop_nick: prop.prop_nick
	})
	await db.exec(`
		INSERT IGNORE INTO shop_props (prop_nick)
		VALUES (:prop_nick)
	`, { prop_nick: prop.prop_nick })
	return view.ret()
})
rest.addAction('set-group-self_filters', ['admin','setaccess'], async view => {
	const name = 'self_filters'
	const group_id = await view.get('group_id#required')
	const bit = await view.get('bit') || 0
	const db = await view.get('db')
	await db.exec(`
		UPDATE shop_groups
		SET ${name} = :bit
		WHERE group_id = :group_id
	`, {group_id, bit})
	return view.ret()
})

rest.addAction('set-group-filter', ['admin','setaccess'], async view => {
	const prop = await view.get('prop#required')
	if (!~['value','number'].indexOf(prop.type)) return view.err('Тип свойства <b>'+prop.type+'</b> не подходит для фильтра')

	const group_id = await view.get('group_id#required')
	const db = await view.get('db')
	await db.exec(`
		INSERT IGNORE INTO shop_filters (group_id, prop_nick)
		VALUES (:group_id, :prop_nick)
	`, {
		group_id, 
		prop_nick: prop.prop_nick
	})
	await db.exec(`
		INSERT IGNORE INTO shop_props (prop_nick)
		VALUES (:prop_nick)
	`, { prop_nick: prop.prop_nick })
	return view.ret()
})




rest.addAction('set-group-create', ['admin','setaccess'], async view => {
	const parent = await view.get('group')
	const db = await view.get('db')

	const group_title = await view.get('group_title')
	let group_nick = nicked(group_title)
	if (!group_nick) return view.err('Укажите название')
	if (~group_title.indexOf('/')) return view.err('Название группы не должно содержать слэш (/) этот символ используется в Ecommerce для обозначения иерархии групп.')
	//if (~['items'].indexOf(group_nick)) return view.err('Ник зарезервирован ' + group_nick)
	//group_nick = nicked((parent?.group_title || '') + '-' + group_nick)

	const ready_id = await Shop.getGroupIdByNick(db, group_nick)
	const ready = await Shop.getGroupById(db, ready_id)
	if (ready) return view.err('Такая подгруппа уже есть в ' + (ready.parent_title || 'корне каталога'))

	const parent_id = parent?.group_id || null
	const ordain = await db.col(`select max(ordain) from shop_groups where parent_id <=> :parent_id`, {parent_id}) || 0
	//const level = group?.level || 0
	view.data.group_id = await db.insertId(`
		INSERT INTO shop_groups (group_nick, group_title, group_name, parent_id, ordain)
		VALUES (:group_nick, :group_title, :group_title, :parent_id, :ordain + 1)
	`, {parent_id, group_title, group_nick, ordain})
	

	await ShopAdmin.reorderGroups(db)

	return view.ret()
})

rest.addAction('set-group-copy', ['admin','setaccess'], async view => {
	const db = await view.get('db')
	const parent_nick = await view.get('group_nick')//Куда
	const what_id = await view.get('group_id#required')//Что
	const parent_id = await Shop.getGroupIdByNick(db, parent_nick) || null

	const what = await Shop.getGroupById(db, what_id)
	const parent = await Shop.getGroupById(db, parent_id)

	const group_title = what.group_title + ' копия'
	const group_nick = nicked((parent?.group_title || '') + '-' + nicked(group_title))

	const ready_id = await Shop.getGroupIdByNick(db, group_nick)
	const ready = await Shop.getGroupById(db, ready_id)
	if (ready) return view.err('Такая подгруппа уже есть в ' + (ready.parent_title || 'корне каталога'))


	const { self_filters, self_cards } = what
	const ordain = await db.col(`select max(ordain) from shop_groups where parent_id <=> :parent_id`, {parent_id}) || 0
	
	const group_id = view.data.group_id = await db.insertId(`
		INSERT INTO shop_groups (group_nick, group_title, group_name, parent_id, ordain, self_filters, self_cards)
		VALUES (:group_nick, :group_title, :group_title, :parent_id, :ordain + 1, :self_filters, :self_cards)
	`, {parent_id, group_title, group_nick, ordain, self_filters, self_cards})

	//what_id выборку скопировать в group_id
	//what_id фильтры скопировать в group_id
	//what_id карточка скопировать в group_id
	//what_id подгруппы скопировать в group_id

	await ShopAdmin.reorderGroups(db)

	return view.ret('Скопировано только имя без подгрупп, свойств, фильтров, выборок. Функция не доделана')
})

rest.addAction('set-filter-delete', ['admin','setaccess'], async view => {
	const group_id = await view.get('group_id#required')
	const prop_nick = await view.get('prop_nick#required')
	const db = await view.get('db')
	
	await db.exec(`
		DELETE FROM shop_filters
		WHERE group_id = :group_id and prop_nick = :prop_nick
	`, {group_id, prop_nick})

	await ShopAdmin.reorderFilters(db)

	return view.ret()
})
rest.addAction('set-group-move', ['admin','setaccess'], async view => {
	const db = await view.get('db')
	const parent_nick = await view.get('group_nick')//Куда
	const what_id = await view.get('group_id#required')//Что
	const parent_id = await Shop.getGroupIdByNick(db, parent_nick) || null
	if (await Shop.isNest(db, parent_id, what_id)) return view.err('Нельзя перенести группу в её вложенную группу')

	const what = await Shop.getGroupById(db, what_id)
	const parent = await Shop.getGroupById(db, parent_id)

	const group_title = what.group_title
	
	// const group_nick = nicked((parent?.group_title || '') + '-' + nicked(group_title))
	// const ready_id = await Shop.getGroupIdByNick(db, group_nick)
	// const ready = await Shop.getGroupById(db, ready_id)
	// if (ready) return view.err('Такая подгруппа уже есть в ' + (ready.parent_title || 'корне каталога'))

	await db.exec(`
		UPDATE shop_groups 
		SET parent_id = :parent_id
		WHERE group_id = :what_id
	`, {parent_id, what_id})


	return view.ret()
})

rest.addAction('set-card-delete', ['admin','setaccess'], async view => {
	const group_id = await view.get('group_id#required')
	const prop_nick = await view.get('prop_nick#required')
	const db = await view.get('db')
	
	await db.exec(`
		DELETE FROM shop_cards
		WHERE group_id = :group_id and prop_nick = :prop_nick
	`, {group_id, prop_nick})

	await ShopAdmin.reorderCards(db)

	return view.ret()
})
rest.addAction('set-group-delete', ['admin','setaccess'], async view => {
	const group = await view.get('group#required')
	const db = await view.get('db')
	if (group.childs.length) return view.err('Удалите сначало подгруппы')
	await db.exec(`
		DELETE FROM shop_groups
		WHERE group_id = :group_id
	`, group)
	view.data.parent_id = group.parent_id
	await ShopAdmin.reorderGroups(db)

	return view.ret()
})
rest.addAction('set-group-title', ['admin','setaccess'], async view => {
	const group_id = await view.get('group_id#required')
	const db = await view.get('db')

	const group_title = await view.get('group_title')
	if (~group_title.indexOf('/')) return view.err('Название группы не должно содержать слэш (/) этот символ используется в Ecommerce для обозначения иерархии групп.')
	//let group_nick = nicked(group_title)
	//if (!group_nick) return view.err('Укажите название')
	//group_nick = nicked((group?.parent_title || '') + '-' + group_nick)

	// const ready_id = await Shop.getGroupIdByNick(db, group_nick)
	// const ready = await Shop.getGroupById(db, ready_id)
	// if (ready) return view.err('Такая подгруппа уже есть в ' + (ready.parent_title || 'корне каталога'))

	await db.exec(`
		UPDATE shop_groups 
		SET group_title = :group_title
		WHERE group_id = :group_id
	`, {group_id, group_title})
	view.data.group_title = group_title
	return view.ret()
})

rest.addAction('set-group-nick', ['admin','setaccess'], async view => {
	const group_id = await view.get('group_id#required')
	const db = await view.get('db')

	let group_nick = await view.get('group_nick#required')
	group_nick = nicked(group_nick)
	if (!group_nick) return view.err('Укажите название')
	//if (~['items'].indexOf(group_nick)) return view.err('Ник зарезервирован ' + group_nick)
	
	const ready_id = await Shop.getGroupIdByNick(db, group_nick)
	const ready = await Shop.getGroupById(db, ready_id)
	if (ready) return view.err('Такая подгруппа уже есть в ' + (ready.parent_title || 'корне каталога'))

	await db.exec(`
		UPDATE shop_groups 
		SET group_nick = :group_nick
		WHERE group_id = :group_id
	`, {group_id, group_nick})
	view.data.group_nick = group_nick

	return view.ret()
})
rest.addAction('set-group-ordain', ['admin','setaccess'], async view => {
	const next_id = await view.get('next_id')
	const id = await view.get('id#required')
	const db = await view.get('db')

	let ordain
	if (!next_id) ordain = await db.col('SELECT max(ordain) FROM shop_groups') + 1
	if (next_id) ordain = await db.col('SELECT ordain FROM shop_groups WHERE group_id = :next_id', {next_id}) - 1
	if (ordain < 0) ordain = 0
	await db.exec(`
		UPDATE shop_groups 
		SET ordain = :ordain 
		WHERE group_id = :id
	`, {ordain, id})

	await ShopAdmin.reorderGroups(db)	

	return view.ret()
})
rest.addAction('set-filter-ordain', ['admin','setaccess'], async view => {
	const group_id = await view.get('group_id#required')
	const next_nick = await view.get('next_nick')
	const prop_nick = await view.get('prop_nick#required')
	const db = await view.get('db')

	let ordain
	if (!next_nick) ordain = await db.col('SELECT max(ordain) FROM shop_filters') + 1
	if (next_nick) ordain = await db.col('SELECT ordain FROM shop_filters WHERE prop_nick = :next_nick and group_id = :group_id', {next_nick, group_id}) - 1
	if (ordain < 0) ordain = 0
	await db.exec(`
		UPDATE shop_filters 
		SET ordain = :ordain 
		WHERE prop_nick = :prop_nick and group_id = :group_id
	`, {ordain, group_id, prop_nick})

	await ShopAdmin.reorderFilters(db)	

	return view.ret()
})
rest.addAction('set-card-ordain', ['admin','setaccess'], async view => {
	const group_id = await view.get('group_id#required')
	const next_nick = await view.get('next_nick')
	const prop_nick = await view.get('prop_nick#required')
	const db = await view.get('db')

	let ordain
	if (!next_nick) ordain = await db.col('SELECT max(ordain) FROM shop_cards') + 1
	if (next_nick) ordain = await db.col('SELECT ordain FROM shop_cards WHERE prop_nick = :next_nick and group_id = :group_id', {next_nick, group_id}) - 1
	if (ordain < 0) ordain = 0
	await db.exec(`
		UPDATE shop_cards 
		SET ordain = :ordain 
		WHERE prop_nick = :prop_nick and group_id = :group_id
	`, {ordain, group_id, prop_nick})

	await ShopAdmin.reorderCards(db)

	return view.ret()
})

rest.addResponse('set-import', ['admin'], async view => {
	const db = await view.get('db')
	const json = await view.get('json')
	if (!json) return view.err('Укажите данные')

	let dump
	try {
		dump = JSON.parse(json)
	} catch(e) {
		 return view.err('Данные не распознаны')
	}

	const tables = rest_shopadmin.exporttables

	for (const table of tables) {
		if (!dump[table]) return view.err('Ошибка: не найдены данные для ' + table)
	}
	
	await db.exec(`SET FOREIGN_KEY_CHECKS = 0`) //truncate быстрей, но с FK не работает
	for (const table in dump) {
		const rows = dump[table]
		if (!rows.length) continue

		const keys = Object.keys(rows[0])
		await db.exec(`TRUNCATE TABLE ${table}`)
		await db.exec(`SET SESSION time_zone = @@session.time_zone;`)

		

		await db.exec(`
			INSERT INTO ${table} (${keys.join(', ')})
			VALUES 
				${'(' + rows.map(row => {
					return Object.values(row).map((value, i) => {
						if (value === null) return "null"
						if (value?.type == "Buffer") return value.data[0]
						//if (keys[i] == 'date_create') return 'CONVERT_TZ(STR_TO_DATE("'+value+'", "%Y-%m-%dT%H:%i:%s.%fZ"), @@session.time_zone, "+00:00")'
						//if (keys[i] == 'date_create') return 'STR_TO_DATE("'+value+'", "%Y-%m-%dT%H:%i:%s.%fZ")'

						if (~keys[i].indexOf('date_')) return 'CONVERT_TZ(SUBSTRING("'+value+'", 1, 19), "+00:00", @@session.time_zone)'
						//if (keys[i] == 'date_create') return 'CAST("'+value+'" AS DATETIME)'
						
						return '"' + value + '"'
					}).join(',')
				}).join('),(') + ')'}
		`)
	}
	await db.exec(`SET FOREIGN_KEY_CHECKS = 1`)
	return view.ret()
})
