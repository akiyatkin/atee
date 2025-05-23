import Files from "/-showcase/Files.js"
import Excel from "/-showcase/Excel.js"
import fs from "fs/promises"

import nicked from '/-nicked/nicked.js'
import unique from '/-nicked/unique.js'

import Rest from "/-rest"
import rest_vars from '/-showcase/rest.vars.js'
import rest_admin from '/-controller/rest.admin.js'

const rest = new Rest(rest_vars, rest_admin)
export default rest

import { whereisit } from '/-controller/whereisit.js'
const { FILE_MOD_ROOT, IMPORT_APP_ROOT } = whereisit(import.meta.url)
rest.addAction('set-reset', ['setaccess'], async view => {
	await view.gets(['admin','start'])
	const { db } = await view.gets(['db'])

	const res = await db.exec(`DROP TABLE IF EXISTS 
		showcase_groups,
		showcase_prices,
		showcase_tables,
		showcase_brands,
		showcase_articles,
		showcase_files,
		showcase_filekeys,
		showcase_props,
		showcase_values,
		showcase_bonds,
		showcase_items,
		showcase_models,
		showcase_search,
		showcase_iprops,

		showcase_partners
	`)
	
	const src = FILE_MOD_ROOT + '/update.sql'
	const sql = await fs.readFile(src).then(buffer => buffer.toString())
	const sqls = sql.split(';')
	const promises = sqls.map(sql => {
		sql = sql.trim()
		if (!sql) return Promise.resolve()
		return db.exec(sql)
	})
	
	await Promise.all(promises)
	
	return view.ret('База пересоздана')
})
rest.addAction('set-brands-clearempty', ['setaccess'], async view => {
	await view.gets(['admin','start'])
	const { db } = await view.gets(['db'])
	await db.changedRows(`
		DELETE b
		FROM showcase_brands b
		LEFT JOIN showcase_models m on m.brand_id = b.brand_id
		WHERE m.brand_id is null
	`)
	return view.ret('Удалено')
})

const addParents = (group, parent_id, tree) => {
	if (!parent_id) return
	group.path.unshift(parent_id)
	addParents(group, tree[parent_id].parent_id, tree)
}
const getTree = async (db) => {
	const tree = {}
	const rows = await db.all(`
		SELECT group_id, parent_id, group_nick, icon_id, group_title 
		FROM showcase_groups 
		ORDER by ordain
	`)

	for (const group of rows) {
		tree[group.group_id] = group
	}
	for (const group of rows) {
		group.path = []
		addParents(group, group.parent_id, tree)
	}
	for (const group of rows) {
		group.groups = [group.group_id]
		group.childs = []
	}
	
	for (const group of rows) {
		const group_id = group.group_id
		if (group.parent_id) {
			const parent = tree[group.parent_id]
			parent.childs.push(group.group_id)
		}
		group.path.forEach(parent_id => {
			const parent = tree[parent_id]
			parent.groups.push(group.group_id)
		})
	}
	return tree
}
rest.addAction('set-groups-replace', ['setaccess'], async view => {
	await view.gets(['admin'])
	const { id, title, base, db } = await view.gets(['id','title', 'base','db'])
	const parent_nick = base.onicked(title)
	if (!parent_nick) return view.err('Требуется имя родительской группы для переноса')
	const parent_id = await base.getGroupIdByNick(parent_nick)
	if (!parent_id) return view.err('Родительская группа не найдена')
	const group_id = await db.col('select group_id from showcase_groups where group_id = :id', { id })
	if (!group_id) return view.err('Группа не найдена '+id)
	if (parent_id == group_id) return view.err('Вы хотите текущую группу переместить в текущую группу? Этого не будет.')

	const tree = await getTree(db)
	if (~tree[group_id].groups.indexOf(parent_id)) return view.err('Новая родительская группа является вложенной и получается рекурсия. Этого не будет.')

	const r = await db.changedRows(`
		UPDATE showcase_groups
		SET parent_id = :parent_id
		WHERE group_id = :group_id
	`, {group_id, parent_id})
	if (!r) return view.err('Что-то пошло не так')
	return view.ret('Готово '+id + ' ' + title)
})
rest.addAction('set-groups-clearempty', ['setaccess'], async view => {
	await view.gets(['admin','start'])
	const { db } = await view.gets(['db'])

	
	const groups = await db.all(`
		SELECT 
			g.group_title,
			g.group_nick,
			g.group_id,
			g.parent_id,
			count(m.model_id) as direct
		FROM showcase_groups g
		LEFT JOIN showcase_models m on m.group_id = g.group_id
		GROUP BY g.group_id
	`)
	const objgroups = {}
	for (const group of groups) {
		group.inside = group.direct
		objgroups[group.group_id] = group
	}
	for (let group of groups) {
		//if (!group.parent_id) continue
		const direct = group.direct
		while(group.parent_id) {
			group = objgroups[group.parent_id]
			group.inside += direct
		}
		
	}
	
	for (const group of groups) {
		if (group.inside > 0) continue
		await db.changedRows(`
			DELETE g
			FROM showcase_groups g
			WHERE g.group_id = :group_id
		`, group)
	}
	
	return view.ret('Удалено')
})
rest.addAction('set-brands-move', ['setaccess'], async view => {
	await view.gets(['admin','start'])
	const { db, before_id, after_id } = await view.gets(['db','before_id','after_id'])
	await db.start()
	const brands = await db.all(`
		SELECT 
			p.brand_id,
			p.ordain
		FROM showcase_brands p
		ORDER by ordain
	`)

	let before_index, after_index
	brands.forEach(({brand_id}, index) => {
		if (brand_id == before_id) before_index = index
		if (brand_id == after_id) after_index = index
	})

	brands.splice(after_index, 0, brands.splice(before_index, 1)[0]);
	
	let ordain = 1
	brands.forEach(brand => {
		brand.ordain = ordain++
	})

	// let ordain = 0
	// let before, after
	// brands.forEach(brand => {
	// 	if (brand.brand_id == after_id) after = brand
	// 	if (brand.brand_id == before_id) before = brand
	// 	ordain = ordain + 2
	// 	brand.ordain = ordain
	// })
	// if (!before || !after) return view.err('Не найдены свойства')
	// before.ordain = after.ordain - 1

	for (const brand of brands) {
		await db.changedRows(`
			UPDATE
				showcase_brands 
			SET
				ordain = :ordain
			WHERE brand_id = :brand_id
		`, brand)
	}

	await db.commit()
	return view.ret('Перенесено')
})
rest.addAction('set-groups-move', ['setaccess'], async view => {
	await view.gets(['admin'])
	const { db, before_id, after_id } = await view.gets(['db','before_id','after_id'])
	//нужно before поставить перед after
	const groups = await db.all(`
		SELECT 
			p.parent_id,
			p.group_id,
			p.ordain
		FROM showcase_groups p
		ORDER by ordain
	`)

	let before_index, after_index
	groups.forEach(({group_id}, index) => {
		if (group_id == before_id) before_index = index
		if (group_id == after_id) after_index = index
	})

	groups.splice(after_index, 0, groups.splice(before_index, 1)[0]);

	let ordain = 1
	groups.forEach(group => {
		group.ordain = ordain++
	})
	// let ordains = {}
	// let before, after
	// groups.forEach(group => {
	// 	if (group.group_id == after_id) after = group
	// 	if (group.group_id == before_id) before = group
	// 	if (!ordains[group.parent_id || 0]) ordains[group.parent_id || 0] = 0
	// 	ordains[group.parent_id || 0] += 2
	// 	group.ordain = ordains[group.parent_id || 0]
	// })
	// if (!before || !after) return view.err('Не найдены свойства')
	// before.ordain = after.ordain - 1

	for (const group of groups) {
		await db.changedRows(`
			UPDATE
				showcase_groups 
			SET
				ordain = :ordain
			WHERE group_id = :group_id
		`, group)
	}

	return view.ret('Перенесено')
})
rest.addAction('set-props-move', ['setaccess'], async view => {
	await view.gets(['admin','start'])
	const { db, before_id, after_id } = await view.gets(['db','before_id','after_id'])
	await db.start()
	const props = await db.all(`
		SELECT 
			p.prop_id,
			p.ordain
		FROM showcase_props p
		ORDER by ordain
	`)
	let ordain = 0
	let before, after
	props.forEach(prop => {
		if (prop.prop_id == after_id) after = prop
		if (prop.prop_id == before_id) before = prop
		ordain = ordain + 2
		prop.ordain = ordain
	})
	if (!before || !after) return view.err('Не найдены свойства')
	before.ordain = after.ordain - 1

	for (const prop of props) {
		await db.changedRows(`
			UPDATE
				showcase_props 
			SET
				ordain = :ordain
			WHERE prop_id = :prop_id
		`, prop)
	}
	
	await db.commit()
	return view.ret('Упорядочено')
})
rest.addAction('set-values-clearempty', ['setaccess'], async view => {
	await view.gets(['admin','start'])
	const { db } = await view.gets(['db'])
	await db.changedRows(`
		DELETE v
		FROM showcase_values v
		LEFT JOIN showcase_iprops ip on ip.value_id = v.value_id
		WHERE ip.value_id is null
	`)
	return view.ret('Удалено')
})
rest.addAction('set-props-clearempty', ['setaccess'], async view => {
	await view.gets(['admin','start'])
	const { db } = await view.gets(['db'])
	await db.changedRows(`
		DELETE p
		FROM showcase_props p
		LEFT JOIN showcase_iprops ip on ip.prop_id = p.prop_id
		WHERE ip.prop_id is null and p.prop_id > 3
	`)
	//Первый 3 свойства системные model, brand, group
	return view.ret('Удалено')
})

rest.addAction('set-models-reorder', async view => {
	await view.gets(['admin','start'])
	const { upload } = await view.gets(['upload'])
	const r = await upload.reorderModels()
	return view.fin(r)
})
rest.addAction('set-models-clearempty', ['setaccess'], async view => {
	await view.gets(['admin','start'])
	const { db } = await view.gets(['db'])
	
	const models = await db.all(`
		DELETE m
		FROM showcase_groups g, showcase_brands b, showcase_models m
		LEFT JOIN showcase_items i on i.model_id = m.model_id
		WHERE m.brand_id = b.brand_id and g.group_id = m.group_id and i.model_id is null
	`)
	
	return view.ret('Удалено')
})


rest.addAction('set-tables-loadall', ['setaccess'], async view => {
	await view.gets(['admin','start'])
	const { db, upload } = await view.gets(['db', 'upload'])
	
	const files = await upload.getNewTables()
	

	let count = 0
	const msgs = []
	await Promise.all(files.map(async of => {
		const { quantity = 0 } = await upload.loadTable(of.name, msgs)
		count += quantity
	}))
	view.ans.count = count
	
	return view.ret('Внесено ' + count + '<p>'+msgs.join('</p><p>')+'</p>')
})

rest.addAction('set-prices-clearall', async view => {
	await view.gets(['admin','start'])
	const { upload, db } = await view.gets(['upload', 'db'])

	await upload.clearAllPrices()
	
	return view.ret('Прайсы очищены')
})
rest.addAction('set-tables-clearall', ['setaccess'], async view => {
	await view.gets(['admin','start'])
	const { upload, db } = await view.gets(['upload', 'db'])
	
	await upload.clearAllTables()
	await upload.clearAllPrices()

	// const rows = await db.all(`
	// 	SELECT
	// 		table_title
	// 	FROM showcase_tables
	// `)
	// await Promise.all(rows.map(({table_title}) => {
	// 	return upload.clearTable(table_title)
	// }))
	
	return view.ret('Данные очищены')
})

rest.addAction('set-tables-clear', ['setaccess'], async view => {
	await view.gets(['admin','start'])
	const { upload, name } = await view.gets(['upload', 'name'])
	view.ans.name = name
	const row = await upload.clearTable(name)
	row.ready = false
	view.ans.row = row
	return view.ret('Очищено')
})
rest.addAction('set-tables-load', ['setaccess'], async view => {
	await view.gets(['admin'])
	const { upload, name } = await view.gets(['upload','name'])
	view.ans.name = name
	const msgs = []
	const row = await upload.loadTable(name, msgs)
	if (!row) return view.err('Неизвестная ошибка с таблицей, проверьте конфиг')
	row.ready = true
	view.ans.msgs = msgs
	view.ans.row = row
	return view.ret('Внесено ' + row.quantity)
})
rest.addAction('set-prices-clear', ['setaccess'], async view => {
	await view.gets(['admin','start'])
	const { upload, name } = await view.gets(['upload', 'name'])
	view.ans.name = name
	const row = await upload.clearPrice(name)
	row.ready = false
	view.ans.row = row
	
	return view.ret('Очищено')
})
rest.addAction('set-prices-load', ['setaccess'], async view => {
	await view.gets(['admin','base'])
	const { upload, name } = await view.gets(['upload','name'])
	view.ans.name = name
	const row = await upload.loadPrice(name)
	if (!row) return view.err('Неизвестная ошибка с прайсом, проверьте конфиг. Нет производителя или некорректное соединение.')
	row.ready = true
	view.ans.row = row
	return view.ret('Внесено ' + row.quantity)
})

rest.addAction('set-load', ['setaccess'], async view => { //Для ручного перехода, при сохранении ссылки	
	//await view.get('admin')
	await view.get('start')
	const upload = await view.get('upload')
	const res = await upload.applyall()
	const Location = '/catalog?alert=' + encodeURIComponent(res.msg)
	view.headers = { Location }
	return view.ret('', 301)
})

rest.addAction('set-applyall', ['setaccess'], async view => {
	await view.gets(['admin','start'])
	const { upload } = await view.gets(['upload'])
	const res = await upload.applyall()
	Object.assign(view.ans, res)
	return view.ret(res.msg)
})
rest.addAction('set-prices-loadall', ['setaccess'], async view => {
	await view.gets(['admin','start'])
	const { upload } = await view.gets(['upload'])
	const files = await upload.getNewPrices()
	let count = 0
	await Promise.all(files.map(async of => {
		const { quantity = 0 } = await upload.loadPrice(of.name)
		count += quantity
	}))
	
	view.ans.count = count
	return view.ret('Внесено ' + count)
})
// rest.addAction('set-files-loadall', async view => {
// 	await view.gets(['admin'])
// 	const { visitor, db, config, upload } = await view.gets(['visitor', 'db', 'config', 'upload'])

	
// 	const {doublepath, count} = await upload.loadAllFiles()		
	
// 	view.ans.doublepath = doublepath
// 	view.ans.count = count
// 	return view.ret('Связано ' + count)
// })
rest.addAction('set-files-indexall', ['setaccess'], async view => {
	await view.gets(['admin'])
	const visitor = view.visitor
	const { db, config, upload } = await view.gets(['db', 'config', 'upload'])

	
	const {doublepath, count} = await upload.indexAllFiles()		
	
	view.ans.doublepath = doublepath
	view.ans.count = count
	return view.ret('Проиндексировано ' + count)
})
rest.addAction('set-files-connectall', ['setaccess'], async view => {
	await view.gets(['admin'])
	const visitor = view.visitor
	const { db, config, upload } = await view.gets(['db', 'config', 'upload'])

	
	const res = await upload.connectAllFiles()
	
	Object.assign(view.ans, res)
	return view.ret()
})