import fs from "fs/promises"
import ShopAdmin from "/-shop/admin/ShopAdmin.js"
import Shop from "/-shop/Shop.js"
import nicked from "/-nicked"
import Recalc from "/-sources/Recalc.js"
import BulkInserter from "/-sources/BulkInserter.js"
import { whereisit } from '/-controller/whereisit.js'
const { FILE_MOD_ROOT, IMPORT_APP_ROOT } = whereisit(import.meta.url)

import Rest from '/-rest'
const rest = new Rest()
export default rest


// import rest_shop from '/-shop/rest.shop.js'
// rest.extra(rest_shop)

import rest_shopadmin from '/-shop/admin/rest.shopadmin.js'
rest.extra(rest_shopadmin)

import rest_recalc from '/-sources/rest.recalc.js'
rest.extra(rest_recalc)

// rest.addResponse('set-reset', ['admin'], async view => {	
// 	const db = await view.get('db')

// 	// const res = await db.exec(`DROP TABLE IF EXISTS 
// 	// 	${rest_shopadmin.TABLES.join(',')}
// 	// `)
	
// 	const src = FILE_MOD_ROOT + '/update.sql'
// 	const sql = await fs.readFile(src, 'utf8');  //.then(buffer => buffer.toString())
// 	//const sqls = sql.split(';')
	
// 	await db.db.query(sql);
// 	// await Promise.all(sqls.map((sql,i) => {
// 	// 	sql = sql.trim()
// 	// 	if (!sql) return Promise.resolve()
// 	// 	return db.exec(sql)
// 	// }))
	
// 	return view.ret('База обновлена')
// })

rest.addAction('set-recalc', ['admin','checkrecalc'], async view => { //Пересчитать в aside меню
	const db = await view.get('db')
	Recalc.recalc(async (db) => {
		await ShopAdmin.recalcIndexGroups(db) 
		await ShopAdmin.checkRestat(db)
	})
	return view.ret()
})
// rest.addAction('set-recalc-publicate', async view => { //Пересчитать в aside меню
// 	const db = await view.get('db')

// 	Recalc.recalc(async (db) => {
// 		await ShopAdmin.recalcIndexGroups(db) //статистика
// 	}, true)
// 	return view.ret()
// })

rest.addAction('set-tpl-sub', ['admin','checkrecalc','setaccess'], async view => {
	const type = await view.get('type#required') //card, filter
	const sub = await view.get('sub#required')
	const db = await view.get('db')
	const prop_nick = await view.get('prop_nick#required')
	const tpl = await import(`/-shop/${type}s.html.js`).then(r => r.default).catch(r => false)
	if (!tpl) return view.err('Некорректный type')
	if (!tpl.prop[sub]) return view.err('Не найден шаблон')
	view.data.sub = sub
	await db.exec(`
		REPLACE INTO shop_props 
		SET ${type}_tpl = :sub, prop_nick = :prop_nick
	`, { sub, prop_nick })

	
	return view.ret()
})



rest.addAction('set-sample-prop-value-delete', ['admin','checkrecalc'], async view => {
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
	Recalc.recalc(async (db) => {
		await ShopAdmin.recalcChangeGroups(db, group.group_id) //статистика
	})

	await ShopAdmin.reorderGroups(db)

	return view.ret()
})
rest.addAction('set-sample-delete', ['admin','checkrecalc'], async view => {
	const sample_id = await view.get('sample_id#required')
	const db = await view.get('db')
	const group_id = await db.col(`select group_id from shop_samples where sample_id = :sample_id`, {sample_id})
	if (!group_id) return view.err('Не найдена группа')
	await db.exec(`
		DELETE sa FROM shop_samples sa
		WHERE sa.sample_id = :sample_id
	`, {
		sample_id
	})	
	Recalc.recalc(async (db) => {
		await ShopAdmin.recalcChangeGroups(db, group_id) //статистика
	})
	
	return view.ret()
})
rest.addAction('set-sample-prop-delete', ['admin','checkrecalc'], async view => {
	const sample_id = await view.get('sample_id#required')
	const prop_nick = await view.get('prop_nick#required')
	const db = await view.get('db')
	const group_id = await db.col(`select group_id from shop_samples where sample_id = :sample_id`, {sample_id})
	if (!group_id) return view.err('Не найдена группа')
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

	Recalc.recalc(async (db) => {
		await ShopAdmin.recalcChangeGroups(db, group_id) //статистика
	})

	return view.ret()
})
rest.addAction('set-sample-prop-create', ['admin','checkrecalc'], async view => {
	let prop_nick = await view.get('prop_nick')
	const query_nick = await view.get('query_nick')
	if (!prop_nick) {
		if (!query_nick) return view.err('Недостаточно данных')
		prop_nick = query_nick
	}
	const sample_id = await view.get('sample_id#required')
	const db = await view.get('db')
	const group_id = await db.col(`select group_id from shop_samples where sample_id = :sample_id`, {sample_id})
	if (!group_id) return view.err('Не найдена группа')
	await db.exec(`
		INSERT IGNORE INTO shop_sampleprops (sample_id, prop_nick)
		VALUES (:sample_id, :prop_nick)
	`, { sample_id, prop_nick })
	await db.exec(`
		INSERT IGNORE INTO shop_props (prop_nick)
		VALUES (:prop_nick)
	`, { prop_nick })

	Recalc.recalc(async (db) => {	
		await ShopAdmin.recalcChangeGroups(db, group_id) //статистика
	})
	
	return view.ret()
})
rest.addAction('set-sample-prop-spec', ['admin','checkrecalc'], async view => {
	const spec = await view.get('spec#required') //any, empty
	const prop_nick = await view.get('prop_nick#required')
	const sample_id = await view.get('sample_id#required')
	const db = await view.get('db')
	const group_id = await db.col(`select group_id from shop_samples where sample_id = :sample_id`, {sample_id})
	if (!group_id) return view.err('Не найдена группа')
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
	Recalc.recalc(async (db) => {
		await ShopAdmin.recalcChangeGroups(db, group_id) //статистика
	})

	return view.ret()
})


rest.addAction('set-sample-prop-value-create', ['admin','checkrecalc'], async view => {
	const prop_nick = await view.get('prop_nick#required')
	const sample_id = await view.get('sample_id#required')
	let value_nick = await view.get('nick')
	const query_nick = await view.get('query_nick')
	let number = null
	if (!value_nick) {
		if (!query_nick) return view.err('Недостаточно данных')
		value_nick = query_nick
		//} else {
		//if (prop?.type != 'value') return view.err('Выборка может быть только по свойствам value')
	}
	if (Number(value_nick) == value_nick) number = Number(value_nick)
	const db = await view.get('db')
	const group_id = await db.col(`select group_id from shop_samples where sample_id = :sample_id`, {sample_id})
	if (!group_id) return view.err('Не найдена группа')
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
	Recalc.recalc(async (db) => {
		await ShopAdmin.recalcChangeGroups(db, group_id) //статистика
	})
	
	return view.ret()
})
rest.addAction('set-prop-delete', ['admin','setaccess'], async view => {
	const db = await view.get('db')
	const prop_nick = await view.get('prop_nick')
	await db.exec(`
		delete from shop_props where prop_nick = :prop_nick
	`, {prop_nick})
	Recalc.recalc()

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
	Recalc.recalc(async (db) => {
		await db.exec(`
			INSERT IGNORE INTO shop_props (prop_nick)
			VALUES (:prop_nick)
		`, { prop_nick })
		//await ShopAdmin.recalcChangeGroups(db) //статистика
	})
	
	return view.ret()
})
rest.addAction('set-group-description', ['admin'], async view => {
	const db = await view.get('db')
	const description = await view.get('description')
	const group_id = await view.get('group_id#required')
	//view.ans.description = description
	await db.exec(`
		UPDATE shop_groups
		SET description = :description
		WHERE group_id = :group_id
	`, {description, group_id})
	return view.ret()
})
rest.addAction('set-group-image_src', ['admin'], async view => {
	const db = await view.get('db')
	const image_src = await view.get('image_src')
	const group_id = await view.get('group_id#required')
	view.ans.image_src = image_src
	await db.exec(`
		UPDATE shop_groups
		SET image_src = :image_src
		WHERE group_id = :group_id
	`, {image_src, group_id})
	return view.ret()
})
rest.addAction('set-sample-boxes', ['admin','checkrecalc'], async view => {
	const group_id = await view.get('group_id#required')
	const nicks = await view.get('nicks#required')
	const db = await view.get('db')
	const group = await Shop.getGroupById(db, group_id)
	
	const prop_nick = 'brendmodel'
	let sample_id = await db.col(`
		SELECT sa.sample_id
		FROM shop_samples sa, shop_sampleprops sp
		WHERE sa.group_id = :group_id and sp.prop_nick = :prop_nick
		and sp.sample_id = sa.sample_id
	`, {group_id, prop_nick})

	if (!sample_id) {
		sample_id = await db.insertId(`
			INSERT INTO shop_samples (group_id)
			VALUES (:group_id)
		`, {group_id})
		await db.exec(`
			INSERT INTO shop_sampleprops (sample_id, prop_nick, spec)
			VALUES (:sample_id, :prop_nick, 'exactly')
		`, {sample_id, prop_nick})
	}

	const shop_samplevalues = new BulkInserter(db, 'shop_samplevalues', ['sample_id', 'prop_nick', 'value_nick'], 100, true)
	for (const value_nick of nicks) {
		await shop_samplevalues.insert([sample_id, prop_nick, value_nick])
	}
	await shop_samplevalues.flush()
	// await db.exec(`
	// 	INSERT IGNORE INTO shop_samplevalues (sample_id, prop_nick, value_nick)
	// 	VALUES (:sample_id, :prop_nick, :value_nick)
	// `, {
	// 	sample_id, prop_nick, value_nick
	// })	
	Recalc.recalc(async (db) => {
		await ShopAdmin.recalcChangeGroups(db, group_id)
	})
	return view.ret()
})
rest.addAction('set-sample-create', ['admin','checkrecalc'], async view => {
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
	Recalc.recalc(async (db) => {
		await ShopAdmin.recalcChangeGroups(db, group_id)
	})


	return view.ret()
})



rest.addAction('set-prop-singlechoice', ['admin','setaccess'], async view => {
	const name = 'singlechoice'
	const prop = await view.get('prop#required')
	const {prop_nick} = prop
	const bit = await view.get('bit') || 0
	const db = await view.get('db')
	await db.exec(`
		UPDATE shop_props
		SET ${name} = :bit
		WHERE prop_nick = :prop_nick
	`, {prop_nick, bit})

	Recalc.recalc()
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

	Recalc.recalc()
	return view.ret()
})
rest.addAction('set-group-card', ['admin','setaccess'], async view => {
	const prop = await view.get('prop#required')
	if (!~['more','column'].indexOf(prop.known)) return view.err('На карточке будут видны только свойства more или column')
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
	Recalc.recalc()
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
	Recalc.recalc(async (db) => {
		await ShopAdmin.recalcChangeGroups(db, group_id)
	})

	return view.ret()
})

rest.addAction('set-group-filter', ['admin','setaccess'], async view => {
	const prop = await view.get('prop#required')
	if (!~['more','column'].indexOf(prop.known)) return view.err('Фильтры будут видны только свойств more или column')
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

	Recalc.recalc(async (db) => {
		await ShopAdmin.recalcChangeGroups(db, group_id)
	})
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
	const group_id = view.data.group_id = await db.insertId(`
		INSERT INTO shop_groups (group_nick, group_title, group_name, parent_id, ordain)
		VALUES (:group_nick, :group_title, :group_title, :parent_id, :ordain + 1)
	`, {parent_id, group_title, group_nick, ordain})
	

	await ShopAdmin.reorderGroups(db)

	Recalc.recalc(async (db) => {
		await ShopAdmin.recalcChangeGroups(db, group_id)
	})

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
	Recalc.recalc(async (db) => {
		await ShopAdmin.recalcChangeGroups(db, group_id)
	})

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

	Recalc.recalc(async (db) => {
		await ShopAdmin.recalcChangeGroups(db) //статистика
	})
	
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

	Recalc.recalc(async (db) => {
		await ShopAdmin.recalcChangeGroups(db)
	})
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
	Recalc.recalc()
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
	Recalc.recalc(async (db) => {
		await ShopAdmin.recalcChangeGroups(db)
	})
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
	Recalc.recalc()
	return view.ret()
})

rest.addAction('set-group-nick', ['admin','setaccess'], async view => {
	const group_id = await view.get('group_id#required')
	const db = await view.get('db')

	let group_nick = await view.get('next_nick#required')
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
	view.data.next_nick = group_nick
	Recalc.recalc()
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
	Recalc.recalc()
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
	Recalc.recalc()
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
	
	
	Recalc.recalc()
	

	return view.ret()
})


import ImpExp from "/-sources/ImpExp.js"
rest.addResponse('set-import', ['admin'], async view => {
	const db = await view.get('db')
	const json = await view.get('json#required')
	if (!json) return view.err('Укажите данные')	
	const msg = await ImpExp.import(db, json, rest_shopadmin.exporttables)
	if (msg) return view.err(msg)

	Recalc.recalc(async (db) => {
		await ShopAdmin.recalcChangeGroups(db)
	})
	return view.ret()
})
