import Shop from "/-shop/Shop.js"
import config from '/-config'
import nicked from '/-nicked'
import PerformanceMonitor from "/-sources/PerformanceMonitor.js"
import BulkInserter from "/-sources/BulkInserter.js"
import scheduleDailyTask from "/-sources/scheduleDailyTask.js"
const ShopAdmin = {}
export default ShopAdmin


// ShopAdmin.getActivities = async db => {
// 	const dates = await db.fetch(`
// 		SELECT 
// 			UNIX_TIMESTAMP(date_index) as date_index, 
// 			UNIX_TIMESTAMP(date_recalc) as date_recalc 
// 		FROM shop_settings
// 	`)
// 	dates.date_index = new Date(dates.date_index * 1000)
// 	dates.date_recalc = new Date(dates.date_recalc * 1000)

// 	dates.indexneed = dates.date_recalc > dates.date_index
// 	return dates
// }
// ShopAdmin.checkActivities = async (db) => {
// 	await db.exec(`INSERT IGNORE INTO shop_settings (singleton, comment) VALUES ('X','Общий комментарий')`)
// }
ShopAdmin.getGroupById = async (db, group_id = false) => {
	if (!group_id) return false
	const group = await db.fetch(`
		SELECT 
			gr.group_id,
			gr.group_nick,
			gr.group_title,
			gr.group_id,
			gr.ordain,
			gr.parent_id,
			pr.group_title as parent_title,
			pr.group_nick as parent_nick,
			pr.group_name as parent_name,
			gr.self_filters + 0 as self_filters,
			gr.self_cards + 0 as self_cards
		FROM shop_groups gr
			LEFT JOIN shop_groups pr on (pr.group_id = gr.parent_id)
		WHERE gr.group_id = :group_id
	`, {group_id})
	if (!group) return false
	group.childs = await db.colAll(`select group_id from shop_groups where parent_id = :group_id`, {group_id})
	return group
}
ShopAdmin.getSamplesByGroupId = async (db, group_id = null) => {	
	

	const list = group_id ? await db.all(`
		SELECT sa.sample_id, sp.prop_nick, if(pr.type = "number", spv.number, spv.value_nick) as value_nick, sp.spec
		FROM shop_samples sa
			LEFT JOIN shop_sampleprops sp on sp.sample_id = sa.sample_id
			LEFT JOIN shop_samplevalues spv on (spv.sample_id = sa.sample_id and spv.prop_nick = sp.prop_nick)
			LEFT JOIN sources_wprops pr on pr.prop_nick = sp.prop_nick
		WHERE sa.group_id = :group_id and pr.prop_id is not null
		ORDER BY sa.date_create, sp.date_create, spv.date_create
	`, {group_id}) : [] 
	/*await db.all(`
		SELECT sa.sample_id, sp.prop_nick, spv.value_nick, sp.spec
		FROM shop_groups gr, shop_samples sa
			LEFT JOIN shop_sampleprops sp on sp.sample_id = sa.sample_id
			LEFT JOIN shop_samplevalues spv on (spv.sample_id = sa.sample_id and spv.prop_nick = sp.prop_nick)
		WHERE gr.parent_id is null and sa.group_id = gr.group_id
		ORDER BY sa.date_create, sp.date_create, spv.date_create
	`)*/



	const sampleids = {}
	for (const {sample_id, prop_nick, value_nick, spec} of list) {
		if (!prop_nick) continue
		if (!value_nick && spec == 'exactly') continue
		sampleids[sample_id] ??= {}
		if (spec == 'exactly') {
			sampleids[sample_id][prop_nick] ??= {}
			sampleids[sample_id][prop_nick][value_nick] = 1
		} else {
			sampleids[sample_id][prop_nick] = spec
		}
	}
	/*
		[
			{
				cena: {from:1, upto:2}
				art: {
					nick: 1, 
					some: 1, 
					test: 1
				},
				images: empty,
				ves: any,
			}, {
				...	
			}
		]
	*/
	return Object.values(sampleids)
}
ShopAdmin.getSamplesUpByGroupId = async (db, group_id = null, childsamples = [{}]) => {
	const groupsamples = await ShopAdmin.getSamplesByGroupId(db, group_id)
	//if (!groupsamples.length) return []
	const samples = Shop.addSamples(groupsamples, childsamples)
	const group = await ShopAdmin.getGroupById(db, group_id)
	if (group_id && group.parent_id) return ShopAdmin.getSamplesUpByGroupId(db, group.parent_id, samples) //childsamples
	return samples
}
ShopAdmin.getWhereBySamples = async (db, samples, hashs = [], partner = '', fulldef = false) => {
	//fulldef false значит без выборки ничего не показываем, partner нужен чтобы выборка по цене была по нужному ключу
	//win.key_id - позиция, wva.value_id - модель
	const from = ['sources_wvalues wva, sources_wcells win']
	const join = []
	const where = [`
		win.entity_id = :brendart_prop_id and win.prop_id = :brendmodel_prop_id 
		and wva.entity_id = win.entity_id and wva.prop_id = win.prop_id and wva.key_id = win.key_id and wva.multi_index = 0
	`]
	if (hashs.length) {
		from.unshift('sources_items wit')
		where.push('wit.entity_id = win.entity_id and wit.key_id = win.key_id')
		where.push('(' + hashs.map(hash => 'wit.search like "%' + hash.join('%" and wit.search like "%') + '%"').join(' or ')+')' || '1 = 1')
	}

	let sort = ['win.source_id, win.sheet_index, win.row_index, win.col_index, wva.multi_index']

	const whereor = []
	let i = 0

	for (const sample of samples) { //OR

		const whereand = []
		for (const prop_nick in sample) { //Находим позиции группы
			const prop = await Shop.getPropByNick(db, prop_nick)
			

			i++
			if (prop.type == 'value') {
				join.push(`
					LEFT JOIN sources_wvalues da${i} ON (
						da${i}.entity_id = win.entity_id 
						and da${i}.key_id = win.key_id 
						and da${i}.prop_id = ${prop.prop_id || 0}
					)
				`)
			} else if (prop.type == 'number') {
				if (prop_nick == 'cena') {
					const {prop_id} = partner?.cost_nick ? await Shop.getPropByNick(db, partner?.cost_nick) : prop  //Подмена цены
					join.push(`
						LEFT JOIN sources_wnumbers da${i} ON (
							da${i}.entity_id = win.entity_id 
							and da${i}.key_id = win.key_id 
							and da${i}.prop_id = ${prop_id || 0}
						)
					`)
				} else {
					join.push(`
						LEFT JOIN sources_wnumbers da${i} ON (
							da${i}.entity_id = win.entity_id 
							and da${i}.key_id = win.key_id 
							and da${i}.prop_id = ${prop.prop_id || 0}
						)
					`)
				}
			} else if (prop.type == 'text') {
				join.push(`
					LEFT JOIN sources_wtexts da${i} ON (
						da${i}.entity_id = win.entity_id 
						and da${i}.key_id = win.key_id 
						and da${i}.prop_id = ${prop.prop_id || 0}
					)
				`)
			} else {
				
			}
			if (typeof(sample[prop_nick]) == 'object') { //Значение не объект
				if (prop.type == 'value') {
					
					const value_ids = []
					for (const value_nick in sample[prop_nick]) {
						const value = await Shop.getValueByNick(db, value_nick)
						value_ids.push(value?.value_id || 0)
					}
					if (value_ids.length) { //У позиции с мульти значениями может совпать два значения и будет дубль
						whereand.push(`
							da${i}.value_id in (${value_ids.join(', ')})
						`)
					} else {
						whereand.push(`1=0`)
					}
				} else if (prop.type == 'number') {

					const isdiscost = partner?.discount && prop_nick == 'cena'
					const disCost = isdiscost ? number => Math.round(number * (100 + partner.discount) / 100) : number => number
						
					if (sample[prop_nick]['upto'] || sample[prop_nick]['from']) {
						sort = []
						if (sample[prop_nick]['upto']) {
							const number = disCost(sample[prop_nick]['upto'])
							whereand.push(`da${i}.number <= ${number}`)
							sort.push(`da${i}.number DESC`)
						}
						if (sample[prop_nick]['from']) {
							const number = disCost(sample[prop_nick]['from'])
							whereand.push(`da${i}.number >= ${number}`)
							sort.push(`da${i}.number ASC`)
						}
					} else {
						const numbers = Object.keys(sample[prop_nick]).map(number => disCost(number))
						if (numbers.length) {
							whereand.push(`
								da${i}.number in (${numbers.join(', ')})
							`)
						} else {
							whereand.push(`1=0`)
						}
					}	
				} else { //Неизвестный prop.type
					where.push(`1=0`) //что делать если в sample не существующее свойство, должно быть найдено 0
				}
			} else { //Значение не объект
				if (prop.type == 'value') {
					
					if (sample[prop_nick] == 'any') {
						// whereand.push(`
						// 	da${i}.value_id is not null
						// `)
						whereand.push(`
							da${i}.multi_index = 0
						`)
					} else if (sample[prop_nick] == 'empty') {

						whereand.push(`
							da${i}.value_id is null
						`)
					}
				} else if (prop.type == 'number') {

					if (sample[prop_nick] == 'any') {
						// whereand.push(`
						// 	da${i}.number is not null
						// `)
						whereand.push(`
							da${i}.multi_index = 0
						`)
					} else if (sample[prop_nick] == 'empty') {
						whereand.push(`
							da${i}.number is null
						`)
					} else {
						where.push(`1=0`)
					}
				} else if (prop.type == 'text') {

					if (sample[prop_nick] == 'any') {
						// whereand.push(`
						// 	da${i}.text is not null
						// `)
						whereand.push(`
							da${i}.multi_index = 0
						`)
					} else if (sample[prop_nick] == 'empty') {
						whereand.push(`
							da${i}.text is null
						`)
					} else {
						where.push(`1=0`)
					}
				} else {
					where.push(`1=0`)
				}
			}
		}
		if (whereand.length) whereor.push(whereand.join(` and `))
	}
	if (whereor.length)	where.push(`((${whereor.join(') or (')}))`)
	else if (!fulldef) where.push(`1=0`)
	return {from, join, where, sort}
}
const calcCounts = async (db, group_id) => {
	const bind = await Shop.getBind(db)
	const samples = await ShopAdmin.getSamplesUpByGroupId(db, group_id)	

	const {from, join, where} = await ShopAdmin.getWhereBySamples(db, samples)
	const counts = await db.fetch(`
		SELECT count(*) as poscount, count(distinct wva.value_id) as modcount
		FROM ${from.join(', ')} ${join.join(' ')}
		WHERE ${where.join(' and ')}
	`, bind)
	return counts
}

// const calcPositions = async (db, group_id) => {
// 	const bind = await Shop.getBind(db)
// 	const samples = await ShopAdmin.getSamplesUpByGroupId(db, group_id)	
// 	const {from, join, where} = await ShopAdmin.getWhereBySamples(db, samples)
// 	const count = await db.col(`
// 		SELECT count(distinct win.key_id)
// 		FROM ${from.join(', ')} ${join.join(' ')}
// 		WHERE ${where.join(' and ')}
// 	`, bind)
// 	return count
// }
// const calcModels = async (db, group_id) => {
// 	const bind = await Shop.getBind(db)
// 	const samples = await ShopAdmin.getSamplesUpByGroupId(db, group_id)	
// 	const {from, join, where} = await ShopAdmin.getWhereBySamples(db, samples)
// 	const count = await db.col(`
// 		SELECT count(distinct wva.value_id)
// 		FROM ${from.join(', ')} ${join.join(' ')}
// 		WHERE ${where.join(' and ')}
// 	`, bind)
// 	return count
// }
const calcBrands = async (db, group_id) => {
	const samples = await ShopAdmin.getSamplesUpByGroupId(db, group_id)
	const bind = await Shop.getBind(db)
	const {from, join, where} = await ShopAdmin.getWhereBySamples(db, samples)
	const prop = await Shop.getPropByNick(db, 'brend')
	if (!prop) return 0
	const count = await db.col(`
		SELECT count(distinct br.value_id)
		FROM ${from.join(', ')} ${join.join(' ')}
		left join sources_wvalues br on (br.entity_id = :brendart_prop_id and br.key_id = win.key_id and br.prop_id = :prop_id)
		WHERE ${where.join(' and ')}
	`, {...bind, ...prop})
	return count
}
const calcSources = async (db, group_id) => {
	const samples = await ShopAdmin.getSamplesUpByGroupId(db, group_id)
	const bind = await Shop.getBind(db)
	const {from, join, where} = await ShopAdmin.getWhereBySamples(db, samples)
	
	const count = await db.col(`
		SELECT count(distinct ce.source_id)
		FROM ${from.join(', ')} ${join.join(' ')}
			left join sources_wcells ce on (ce.entity_id = win.entity_id and ce.key_id = win.key_id)
		WHERE ${where.join(' and ')}
	`, {...bind})
	return count
}
const calcDateContent = async (db, group_id) => {
	const samples = await ShopAdmin.getSamplesUpByGroupId(db, group_id)
	const bind = await Shop.getBind(db)
	const {from, join, where} = await ShopAdmin.getWhereBySamples(db, samples)
	const date_content = await db.col(`
		SELECT UNIX_TIMESTAMP(min(so.date_content))
		FROM ${from.join(', ')} ${join.join(' ')}
		left join sources_sources so on (so.source_id = win.source_id)
		WHERE ${where.join(' and ')}
	`, bind)
	return date_content
}
const calcGroups = async (db, group_id) => {
	const group = await ShopAdmin.getGroupById(db, group_id)
	return group.childs.length
}
const calcSubgroups = async (db, group_id) => {
	const group = await ShopAdmin.getGroupById(db, group_id)
	let count = group.childs.length
	for (const child_id of group.childs) {
		count += await calcSubgroups(db, child_id)
	}
	return count
}




const calcFilters = async (db, group_id) => {
	const groupids = []
	const top_id = await Shop.runGroupUp(db, group_id, async group => {
		if (group.self_filters) return group.group_id
	})
	if (top_id) groupids.push(top_id)

	await Shop.runGroupDown(db, group_id, group => {
		if (group.self_filters)	groupids.push(group.group_id)
	})
	if (!groupids.length) return 0
	const count = await db.col(`
		select count(distinct fi.prop_nick) from shop_filters fi
		where fi.group_id in (${groupids.join(',')})
	`)
	return count
}

const calcWith = async (db, group_id, prop_titles) => {
	const bind = await Shop.getBind(db)

	const samples = await ShopAdmin.getSamplesUpByGroupId(db, group_id)
	const {from, join, where} = await ShopAdmin.getWhereBySamples(db, samples)

	let i = 0
	for (const prop_title of prop_titles) {
		i++
		const { prop_id } = await Shop.getPropByNick(db, nicked(prop_title))
		if (!prop_id) continue
		join.push(`left join sources_wcells w${i} on (w${i}.entity_id = :brendart_prop_id and w${i}.key_id = win.key_id and w${i}.prop_id = ${prop_id})`)
		where.push(`w${i}.key_id is not null`)
	}
	const count = await db.col(`
		SELECT count(distinct win.key_id)
		FROM ${from.join(', ')} ${join.join(' ')}
		WHERE ${where.join(' and ')}
	`, bind)


	return count
}
const calcWithFilters = async (db, group_id, prop_titles = []) => {
	const bind = await Shop.getBind(db)
	
	const samples = await ShopAdmin.getSamplesUpByGroupId(db, group_id)
	const {from, join, where} = await ShopAdmin.getWhereBySamples(db, samples)
	let i = 0
	for (const prop_title of prop_titles) {
		i++
		const { prop_id } = await Shop.getPropByNick(db, nicked(prop_title))
		if (!prop_id) continue
		join.push(`left join sources_wcells w${i} on (w${i}.entity_id = win.entity_id and w${i}.key_id = win.key_id and w${i}.prop_id = ${prop_id})`)
		where.push(`w${i}.key_id is not null`)
	}
	const count = await db.col(`
		SELECT count(distinct win.key_id)
		FROM ${from.join(', ')} ${join.join(' ')}
		WHERE ${where.join(' and ')}
	`, bind)

	return count

	// const rows = (await db.all(`
	// 	SELECT win.key_id, pr.prop_nick, nvl(wnum.number, val.value_nick) as nick
	// 	FROM ${from.join(', ')} ${join.join(' ')}
	// 		LEFT JOIN sources_wcells win2 on (win2.entity_id = win.entity_id and win2.key_id = win.key_id)
	// 		LEFT JOIN sources_wprops pr on (pr.prop_id = win2.prop_id)
	// 		LEFT JOIN sources_wnumbers wnum on (wnum.entity_id = win.entity_id and wnum.key_id = win.key_id and wnum.prop_id = win2.prop_id)
	// 		LEFT JOIN sources_wvalues wval on (wval.entity_id = win.entity_id and wval.key_id = win.key_id and wval.prop_id = win2.prop_id)
	// 		LEFT JOIN sources_values val on (val.value_id = wval.value_id)
	// 	WHERE ${where.join(' and ')} and (wnum.number is not null or wval.value_id is not null)
	// `, bind))



	// let groupids = []
	// await Shop.runGroupDown(db, group_id, (child) => {
	// 	groupids.push(child.group_id) //Список групп чьи фильтры надо удовлетворить
	// })
	// const list = Object.groupBy(rows, ({ key_id }) => key_id)
	
	// let count = 0
	// for (const key_id in list) {
	// 	list[key_id] = Object.groupBy(list[key_id], ({ prop_nick }) => prop_nick)
	// 	for (const prop_nick in list[key_id]) {
	// 		list[key_id][prop_nick] = list[key_id][prop_nick].map(row => row.nick)
	// 	}
	// 	const item = list[key_id] //Снимок позиции
	// 	const ids = (await Shop.getGroupIdsByItem(db, item)).filter(id => ~groupids.indexOf(id))
	// 	count++
	// 	for (const group_id of ids) {
	// 		const top_id = await Shop.runGroupUp(db, group_id, async group => {
	// 			if (group.self_filters) return group.group_id
	// 		})
	// 		if (!top_id) continue
	// 		//const group = await ShopAdmin.getGroupById(db, top_id)
	// 		//if (!group.self_filters) continue
	// 		const filters = await ShopAdmin.getFiltersByGroupId(db, top_id)
	// 		if (filters.some(prop_nick => !item[prop_nick])) { //Какого-то фильтра, для какой-то группы нет
	// 			count--
	// 			break;
	// 		}
	// 	}
	// }
	
	// return count
}

// ShopAdmin.getStatRow = Access.wait(async (db) => {
	
// })
ShopAdmin.getGroupStat = async (db, group_id) => {
	const bind = await Shop.getBind(db)

	const row = {}	
	
	//const monitor = new PerformanceMonitor()

	//monitor.start('calcCounts')
	const counts = await calcCounts(db, group_id)
	row.positions = counts.poscount //await calcPositions(db, group_id)
	row.models = counts.modcount //await calcModels(db, group_id)
	
	//monitor.start('calcGroups')
	row.groups = await calcGroups(db, group_id)
	//monitor.start('calcSubgroups')
	row.subgroups = await calcSubgroups(db, group_id) - row.groups

	//monitor.start('calcBrands')
	row.brands = await calcBrands(db, group_id)
	//monitor.start('calcFilters')
	row.filters = await calcFilters(db, group_id)	
	//monitor.start('calcSources')
	row.sources = await calcSources(db, group_id)
	//monitor.start('calcDateContent')
	row.date_content = await calcDateContent(db, group_id)
	//monitor.start('calcWithFilters '+['Цена', 'images', 'Описание', 'Наименование'].join(','))

	// const monitor = new PerformanceMonitor()
	// monitor.start('calcWithFilters '+ group_id)
	// row.withall = await calcWithFilters(db, group_id, ['Цена', 'images', 'Описание', 'Наименование'])
	// monitor.start('calcWithFilters '+ group_id)
	// row.withfilters = await calcWithFilters(db, group_id)
	// monitor.stop()
	// console.log(monitor.getReport())

	//const monitor = new PerformanceMonitor()
	const filters = await ShopAdmin.getFiltersByGroupId(db, group_id)
	//monitor.start('calcWithFilters '+ group_id)
	row.withfilters = await calcWithFilters(db, group_id, filters)

	//monitor.start('calcWithFiltersAll '+ group_id)	
	row.withall = await calcWithFilters(db, group_id, [...filters, 'Цена', 'images', 'Описание', 'Наименование'])
	
	//monitor.stop()
	//console.log(monitor.getReport())



	row.withcost = await calcWith(db, group_id, ['Цена'])
	
	row.withimage = await calcWith(db, group_id, ['images'])
	
	row.withdescription = await calcWith(db, group_id, ['Описание'])
	
	row.withname = await calcWith(db, group_id, ['Наименование'])
	
	return row
}




// ShopAdmin.recalcIndexGroups2 = async (db) => {
// 	const d = new Date()
// 	const topids = await db.colAll(`SELECT group_id from shop_groups where parent_id is null`)
// 	await db.affectedRows(`TRUNCATE shop_itemgroups`)
	
// 	const shop_itemgroups = new BulkInserter(db, 'shop_itemgroups', ['group_id', 'key_id']);
// 	//let count = 0
// 	for (const top_id of topids) {
// 		await Shop.runGroupDown(db, top_id, async ({group_id}) => {
// 			const { list } = await ShopAdmin.getFreeKeyIds(db, group_id) //Свободные позиции, которые не попадают во внутрение группы, те будут уже к своим группам преписаны
// 			// const data = list.map(key_id => [group_id, key_id])
// 			// if (!list.length) return
// 			for (const key_id of list) {
// 				await shop_itemgroups.insert([group_id, key_id])
// 			}
// 			// count += await db.affectedRows(`
// 			// 	INSERT INTO shop_itemgroups (group_id, key_id)
// 			// 	VALUES ${data.map(() => '(?, ?)').join(', ')}
// 			// `, data.flat())
// 		})
// 	}
// 	await shop_itemgroups.flush()
// 	console.log('recalcIndexGroups', new Date() - d)
// 	//console.log('Сохранены группы позиций indexGroups', count)
// 	//return count
// }
// ShopAdmin.scheduleDailyGroupStatCheck = async (db, time = '02:09') => {
// 	console.log('ShopAdmin.scheduleDailyGroupStatCheck', time)
// 	scheduleDailyTask(time, async () => {
// 		await ShopAdmin.setGroupStats(db)
// 		return 'ок'
// 	})
// }

ShopAdmin.recalcIndexGroups = async (db, group_id) => {
	const d = new Date()


	const group_ids = group_id ? await db.colAll(`
		WITH RECURSIVE group_tree AS (
			SELECT group_id
			FROM shop_groups 
			WHERE group_id = :group_id
			
			UNION ALL
			
			SELECT sg.group_id
			FROM shop_groups sg
			INNER JOIN group_tree gt ON sg.parent_id = gt.group_id
		)
		SELECT group_id 
		FROM group_tree;
	`, {group_id}) : await db.colAll(`SELECT group_id from shop_groups`)


	if (!group_id) {
		await db.affectedRows(`TRUNCATE shop_itemgroups`)
	} else {
		await db.db.query(`DELETE FROM shop_itemgroups WHERE group_id in (?)`, [group_ids])
	}
	const shop_itemgroups = new BulkInserter(db, 'shop_itemgroups', ['group_id', 'key_id']);

	//Если изменился родитель, изменились и вложенные группы
	for (const group_id of group_ids) {
		const { list } = await ShopAdmin.getFreeKeyIds(db, group_id) //Свободные позиции, которые не попадают во внутрение группы, те будут уже к своим группам преписаны
		for (const key_id of list) {
			await shop_itemgroups.insert([group_id, key_id])
		}
	}
	await shop_itemgroups.flush()
	console.log('recalcIndexGroups', group_id || 'всё', new Date() - d)
}
ShopAdmin.recalcChangeGroups = async (db, group_id) => { //Нужно добавить в /rest.js
	await ShopAdmin.recalcIndexGroups(db, group_id)

	const d = new Date()
	const topids = group_id ? [group_id] : await db.colAll(`SELECT group_id from shop_groups where parent_id is null`)

	const ym = ShopAdmin.getNowYM()
	const pym = ShopAdmin.getPrevYM() //Записывает для прошлого месяца если записи такой не было
	const pymgroups = await db.colAll(`select group_id from shop_stat where year = :year and month = :month`, pym)

	for (const top_id of topids) {	
		await Shop.runGroupDown(db, top_id, async ({group_id}) => {
			const row = await ShopAdmin.getGroupStat(db, group_id)
			const keys = Object.keys(row).filter(name => !~['date_content'].indexOf(name))

			await db.exec(`
				REPLACE INTO shop_stat (group_id, date_content, ${Object.keys(ym).join(',')}, ${keys.join(',')})
				VALUES (:group_id, FROM_UNIXTIME(:date_content), :${Object.keys(ym).join(',:')}, :${keys.join(',:')})
			`, {group_id, ...ym, ...row})
			console.log(group_id, 'Статистика записана', ym)

			if (~pymgroups.indexOf(group_id)) return //Запись о группе в прошлом месяце есть
			
			await db.exec(`
				INSERT INTO shop_stat (group_id, date_content, ${Object.keys(pym).join(',')}, ${keys.join(',')})
				VALUES (:group_id, FROM_UNIXTIME(:date_content), :${Object.keys(pym).join(',:')}, :${keys.join(',:')})
			`, {group_id, ...pym, ...row})
			
		})
	}
	console.log('recalcChangeGroups', group_id, new Date() - d)
}
ShopAdmin.getGroupStats = async (db, group_id) => {
	//const row = await ShopAdmin.getGroupStat(db, group_id)
	const rows = await db.all(`select *, UNIX_TIMESTAMP(date_content) as date_content from shop_stat WHERE group_id = :group_id order by year DESC, month DESC`, {group_id})
	// const ym = ShopAdmin.getNowYM()
	// rows.unshift({...ym, ...row})
	return rows
}
ShopAdmin.getNowYM = () => {
	const date = new Date()
	const year = date.getFullYear()
	const month = date.getMonth() + 1
	return {year, month}
}
ShopAdmin.getPrevYM = (last) => {
	const date = new Date()
	if (last) {
		date.setFullYear(last.year)
		date.setMonth(last.month - 1, 1)
	}
	date.setMonth(date.getMonth() - 1, 1)
	const year = date.getFullYear()
	const month = date.getMonth() + 1
	
	return {year, month}
}
ShopAdmin.getFiltersByGroupId = async (db, group_id) => {
	if (!group_id) return []
	const group = await ShopAdmin.getGroupById(db, group_id)
	if (!group.self_filters) return ShopAdmin.getFiltersByGroupId(db, group.parent_id)
	const filters = await db.colAll(`
		SELECT fi.prop_nick FROM shop_filters fi
		WHERE fi.group_id = :group_id
	`, {group_id})
	/*
		[prop_nick]
	*/
	return filters
}
ShopAdmin.reorderGroups = async (db) => {
	const list = await db.colAll(`
		SELECT group_id
		FROM shop_groups
		ORDER BY ordain
	`)
	let ordain = 0
	const promises = []
	for (const group_id of list) {
		ordain = ordain + 2
		const r = db.exec(`
			UPDATE shop_groups
			SET ordain = :ordain
			WHERE group_id = :group_id
		`, {ordain, group_id})
		promises.push(r)
	}
	return Promise.all(promises)
}
ShopAdmin.getFreeKeyIdsByGroupIndex = async (db, group_id = null, hashs = [], limit = false) => {
	const bind = await Shop.getBind(db)
	const list = await db.colAll(`
		SELECT ig.key_id
		FROM shop_itemgroups ig, sources_items it
		WHERE ig.group_id = :group_id
		and it.key_id = ig.key_id 
		and it.entity_id = :brendart_prop_id
		and (${hashs.map(hash => 'it.search like "%' + hash.join('%" and it.search like "%') + '%"').join(' or ') || '1 = 1'}) 
		${limit ? 'LIMIT ' + limit : ''}
	`, {...bind, group_id})


	const {poscount, modcount} = await db.fetch(`
		SELECT 
			COUNT(DISTINCT wva.value_id) AS modcount,
			COUNT(*) AS poscount  
		FROM sources_wvalues wva, shop_itemgroups ig, sources_items it
		WHERE ig.group_id = :group_id
		and it.key_id = ig.key_id 
		and it.entity_id = :brendart_prop_id
		and wva.entity_id = it.entity_id 
		and wva.prop_id = :brendmodel_prop_id
		and wva.key_id = ig.key_id
		and (${hashs.map(hash => 'it.search like "%' + hash.join('%" and it.search like "%') + '%"').join(' or ') || '1 = 1'}) 
	`, {...bind, group_id})


	return {poscount, modcount, list}
}
ShopAdmin.getFreeTableByGroupIndex = async (db, group_id = null, hashs = []) => {
	const ans = {poscount:0, modcount:0, head: [], rows:[]}

	
	const {list, poscount, modcount} = await ShopAdmin.getFreeKeyIdsByGroupIndex(db, group_id, hashs, 20)
	
	ans.poscount = poscount
	ans.modcount = modcount
	if (!ans.poscount) return ans
	

	const freeitems = await ShopAdmin.getItems(db, list)
	const headid = {}
	for (const key_id in freeitems) {
		for (const prop_id in freeitems[key_id]){
			headid[prop_id] ??= true
		}
	}
	const props = await db.all(`
		select prop_id, prop_title
		from sources_wprops 
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
ShopAdmin.getFreeKeyIds = async (db, group_id = null, hashs = [], limit = false) => {	
	const bind = await Shop.getBind(db)

	const samples = await ShopAdmin.getSamplesUpByGroupId(db, group_id)
	const gw = await ShopAdmin.getWhereBySamples(db, samples, hashs, false, group_id ? false : true) 
	//Если корень и нет samples то вязть всё, если группа и нет samples то пусто
	const childs = await db.colAll(`select group_id from shop_groups where parent_id <=> :group_id`, {group_id})
	
	let childsamples = []
	for (const child_id of childs) { //Исключаем позиции подгрупп
		const child = await ShopAdmin.getGroupById(db, child_id)
		const samples = await ShopAdmin.getSamplesByGroupId(db, child_id)
		childsamples.push(...samples)
	}
	/*
		Выборка позиций samples (всё кроме указанного)
		Надо из этой выборки исключить childsamples
	*/
	const cw = await ShopAdmin.getWhereBySamples(db, childsamples, hashs, false, false)	
	
	//В wvalues хранятся строчки для каждого multi_index и могут два значения подойти, тогда key_id повторится
	const list = await db.colAll(`
		SELECT distinct win.key_id
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
		${limit ? 'LIMIT ' + limit : ''}
	`, bind)

	const modcount = await db.col(`
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
	const poscount = limit ? await db.col(`
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
	`, bind) : list.length
	return {list, modcount, poscount}
}
ShopAdmin.getFreeTable = async (db, group_id = null, hashs = []) => {
	const ans = {poscount:0, modcount:0, head: [], rows:[]}

	// 


	// const samples = await ShopAdmin.getSamplesUpByGroupId(db, group_id)
	// const gw = await ShopAdmin.getWhereBySamples(db, samples, hashs, false, group_id ? false : true) //Если корень и нет samples то вязть всё, если группа и нет samples то пусто

	// const childs = group_id ? (await ShopAdmin.getGroupById(db, group_id)).childs : await db.colAll(`select group_id from shop_groups where parent_id <=> :group_id`, {group_id})
	
	// let childsamples = []
	// for (const child_id of childs) { //Исключаем позиции подгрупп
	// 	const child = await ShopAdmin.getGroupById(db, child_id)
	// 	const marks = []		
	// 	const samples = await ShopAdmin.getSamplesByGroupId(db, child_id)
	// 	//if (samples.length)	
	// 	childsamples.push(...samples)

	// }

	// /*
	// 	Выборка позиций samples (всё кроме указанного)
	// 	Надо из этой выборки исключить childsamples
	// */
	// const cw = await ShopAdmin.getWhereBySamples(db, childsamples, hashs, false, false)	
	
	const {list, poscount, modcount} = await ShopAdmin.getFreeKeyIds(db, group_id, hashs, 20)
	
	ans.poscount = poscount
	ans.modcount = modcount
	if (!ans.poscount) return ans
	
	
	
	const freeitems = await ShopAdmin.getItems(db, list)
	const headid = {}
	for (const key_id in freeitems) {
		for (const prop_id in freeitems[key_id]){
			headid[prop_id] ??= true
		}
	}
	const props = await db.all(`
		select prop_id, prop_title
		from sources_wprops 
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
ShopAdmin.getItems = async (db, itemids) => {
	if (!itemids.length) return []
	const bind = await Shop.getBind(db)
	const itemprops = await db.all(`
		SELECT 
			win.key_id,
			pr.prop_id,
			pr.scale,
			va.value_title, 
			wn.number,
			wd.date,
			CASE
				WHEN LENGTH(wt.text) <= 21 THEN wt.text
				ELSE CONCAT(TRIM(LEFT(wt.text, 20)), '…')
			END as text
			-- CASE
			-- 	WHEN pr.type = 'value' THEN ce.nick
			-- 	ELSE null
			-- END AS nick,
			-- LEFT(wt.text, 10) as text
		FROM sources_wprops pr, sources_wcells win
			left join sources_wvalues wv on (wv.entity_id = win.entity_id and wv.key_id = win.key_id and wv.prop_id = win.prop_id)
			left join sources_values va on (va.value_id = wv.value_id) 
			left join sources_wnumbers wn on (wn.entity_id = win.entity_id and wn.key_id = win.key_id and wn.prop_id = win.prop_id)
			left join sources_wtexts wt on (wt.entity_id = win.entity_id and wt.key_id = win.key_id and wt.prop_id = win.prop_id)
			left join sources_wdates wd on (wd.entity_id = win.entity_id and wd.key_id = win.key_id and wd.prop_id = win.prop_id)
			
		WHERE win.entity_id = :brendart_prop_id
			and pr.prop_id = win.prop_id
			-- and (wn.number is not null or wv.value_id is not null)
			and win.key_id in (${itemids.join(',')})
		ORDER BY win.source_id, win.sheet_index, win.row_index
	`, bind)
	
	const items = Object.groupBy(itemprops, row => row.key_id)
	for (const key_id in items) {
		const more = Object.groupBy(items[key_id], row => row.prop_id)
		for (const prop_id in more) {
			if (more[prop_id][0].number !== null) {
				more[prop_id] = more[prop_id].map(row => row.number / 10 ** row.scale).join(', ')
			} else if (more[prop_id][0].value_title !== null) {
				more[prop_id] = more[prop_id].map(row => row.value_title).join(', ')
			} else if (more[prop_id][0].date !== null) {
				more[prop_id] = more[prop_id].map(row => row.date).join(', ')
			} else {
				more[prop_id] = more[prop_id].map(row => row.text).join(', ')
			}
		}
		items[key_id] = more
	}
	
	return items
}
ShopAdmin.getItemsValues = async (db, itemids, bind) => {
	if (!itemids.length) return []
	const itemprops = await db.all(`
		SELECT 
			win.key_id,
			pr.prop_id,
			va.value_title
		FROM sources_wcells win, 
			sources_wvalues wv,
			sources_values va,
			sources_wprops pr
		WHERE win.entity_id = :brendart_prop_id

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
ShopAdmin.reorderFilters = async (db) => {
	const list = await db.all(`
		SELECT group_id, prop_nick
		FROM shop_filters
		ORDER BY ordain
	`)
	let ordain = 0
	const promises = []
	for (const {group_id, prop_nick} of list) {
		ordain = ordain + 2
		const r = db.exec(`
			UPDATE shop_filters
			SET ordain = :ordain
			WHERE group_id = :group_id and prop_nick = :prop_nick
		`, {ordain, group_id, prop_nick})
		promises.push(r)
	}
	return Promise.all(promises)
}
ShopAdmin.reorderCards = async (db) => {
	const list = await db.all(`
		SELECT group_id, prop_nick
		FROM shop_cards
		ORDER BY ordain
	`)
	let ordain = 0
	const promises = []
	for (const {group_id, prop_nick} of list) {
		ordain = ordain + 2
		const r = db.exec(`
			UPDATE shop_cards
			SET ordain = :ordain
			WHERE group_id = :group_id and prop_nick = :prop_nick
		`, {ordain, group_id, prop_nick})
		promises.push(r)
	}
	return Promise.all(promises)
}