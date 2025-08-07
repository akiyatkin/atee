import Access from "/-controller/Access.js"
import Db from "/-db/Db.js"
import nicked from "/-nicked"
import unique from "/-nicked/unique.js"
import filter from "/-nicked/filter.js"
import fs from 'fs/promises'
import config from '/-config'

const Shop = {}
export default Shop



// Shop.getAllGroupIdFilterIds = Access.poke(async (db) => {
// 	const rows = await db.all(`
// 		SELECT 
// 			fi.group_id, pr.prop_id
// 		FROM shop_filters fi, sources_props pr
// 		WHERE pr.prop_nick = fi.prop_nick
// 	`)
// 	const list = Object.groupBy(rows, ({ group_id }) => group_id)
// 	for (const group_id in list) {
// 		list[group_id] = list[group_id].map(({prop_id}) => prop_id)
// 	}
// 	return list
// })
Shop.getAllGroupIds = Access.poke(async (db) => {
	const group_ids = await db.colAll(`select group_id from shop_groups`)
	return group_ids
})
Shop.getGroupIdsByItem = async (db, item) => {
	/*
		item = {
			'cena':[nick, nick]
		}
	*/
	const group_ids = await Shop.getAllGroupIds(db)

	const list = []
	for (const group_id of group_ids) {
		const samples = await Shop.getSamplesUpByGroupId(db, group_id)

		if (!Shop.isItemSamples(item, samples)) continue;

		list.push(group_id)
	}
	return list
}
Shop.isItemSamples = (item, samples) => {
	
	for (const sample of samples) {
		let r = false
		for (const prop_nick in sample) {
			if (!item[prop_nick]) {
				r = false
				break
			}

			if (item[prop_nick].some(nick => sample[prop_nick][nick])) {
				r = true
				continue
			} else {
				r = false
				break
			}

		}
		if (r) return true
	}
}



Shop.getGroupIdsBySnap = async (db, snap) => {
	/*
		snap = {
			'cena':[{value_nick, number},{value_nick, number}],
			'naimenovanie':[{value_nick, number},{value_nick, number}]
		}
	*/
	const group_ids = await Shop.getAllGroupIds(db)
	const list = []
	for (const group_id of group_ids) {
		const samples = await Shop.getSamplesUpByGroupId(db, group_id)
		if (!Shop.isSnapSamples(snap, samples)) continue
		list.push(group_id)
	}
	return list
}
Shop.isSnapSamples = (snap, samples) => {
	for (const sample of samples) {
		let r = false
		for (const prop_nick in sample) {
			if (!snap[prop_nick]) {
				r = false
				break;
			}
			if (snap[prop_nick].some(row => sample[prop_nick][row.value_nick ?? row.number])) {
				r = true
				continue
			} else {
				r = false
				break;
			}
		}
		if (r) return true
	}
}
Shop.getValueByNick = Access.poke(async (db, value_nick) => {
	const value = await db.fetch(`
		SELECT 
			va.value_nick,
			va.value_title,
			va.value_id
		FROM sources_values va
		WHERE va.value_nick = :value_nick
	`, {value_nick})
	return value
})
Shop.getPropByNick = Access.poke(async (db, prop_nick = false) => {
	if (!prop_nick) return false
	const prop = await db.fetch(`
		SELECT 
			pr.prop_nick,
			pr.prop_title,
			pr.prop_id,
			pr.name,
			pr.type,
			pr.unit,
			nvl(spr.card_tpl, "") as card_tpl,
			spr.filter_tpl,
			spr.known + 0 as known
		FROM sources_props pr
		LEFT JOIN shop_props spr on (spr.prop_nick = pr.prop_nick)
		WHERE pr.prop_nick = :prop_nick
	`, {prop_nick})
	if (!prop) return false
	if (prop) prop.toString = () => prop.prop_id
	return prop
})

Shop.getGroupIdByNick = Access.poke(async (db, group_nick) => {
	const group_id = await db.col(`
		SELECT gr.group_id
		FROM shop_groups gr
		WHERE gr.group_nick = :group_nick
	`, {group_nick})
	return group_id || false
})
Shop.isNest = Access.poke(async (db, child_id, parent_id) => {
	//Поднимаемся по родителям
	if (!parent_id) return true
	if (!child_id) return false
	if (child_id == parent_id) return true
	const child = await Shop.getGroupById(db, child_id)
	return Shop.isNest(db, child.parent_id, parent_id)
})
Shop.getGroupById = Access.poke(async (db, group_id = false) => {
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

	if (group.self_filters) {
		group.filters = await db.colAll(`select prop_nick from shop_filters where group_id = :group_id order by ordain`, {group_id})
	} else {
		const parent = await Shop.getGroupById(db, group.parent_id)
		group.filters = parent.filters || []
	}

	if (group.self_cards) {
		group.cards = await db.colAll(`select prop_nick from shop_cards where group_id = :group_id order by ordain`, {group_id})
	} else {
		const parent = await Shop.getGroupById(db, group.parent_id)
		group.cards = parent.cards || []
	}
	group.toString = () => group.group_id
	return group
})


Shop.getSamplesByGroupId = Access.poke(async (db, group_id = null) => {	
	

	const list = group_id ? await db.all(`
		SELECT sa.sample_id, sp.prop_nick, if(pr.type = "number", spv.number, spv.value_nick) as value_nick, sp.spec
		FROM shop_samples sa
			LEFT JOIN shop_sampleprops sp on sp.sample_id = sa.sample_id
			LEFT JOIN shop_samplevalues spv on (spv.sample_id = sa.sample_id and spv.prop_nick = sp.prop_nick)
			LEFT JOIN sources_props pr on pr.prop_nick = sp.prop_nick
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
})
Shop.getSamplesUpByGroupId = async (db, group_id = null, childsamples = [{}]) => {
	const groupsamples = await Shop.getSamplesByGroupId(db, group_id)
	//if (!groupsamples.length) return []
	const samples = Shop.addSamples(groupsamples, childsamples)
	const group = await Shop.getGroupById(db, group_id)
	if (group_id && group.parent_id) return Shop.getSamplesUpByGroupId(db, group.parent_id, samples) //childsamples
	return samples
}
// Shop.addSamples = (groups = [], childs = []) => {
// 	let list = []
// 	if (!childs.length) list = groups
// 	else if (!groups.length) list = childs
// 	for (const group of groups) {
// 		for (const child of childs) {
// 			const ch = {...child}
// 			for (const prop_nick in group) {
// 				if (typeof(group[prop_nick]) == 'object') {
// 					if (typeof(ch[prop_nick]) == 'object') {
// 						//Найти пересечения
// 						const keys = Object.keys(group[prop_nick]).filter(key => key in ch[prop_nick]);
// 						ch[prop_nick] = Object.fromEntries(keys.map(key => [key, obj2[key]]))
// 						//ch[prop_nick] = group[prop_nick].filter(item => ch[prop_nick].includes(item))
// 					} else if (ch[prop_nick] == 'any') {
// 						ch[prop_nick] = group[prop_nick]
// 					} else if (ch[prop_nick] == 'empty') { //У родителя список, а ребёнка говорит дай неуказанные, нет пересечений
// 						ch[prop_nick] = {}
// 					}
// 				} else if (group[prop_nick] == 'any') {
// 					if (typeof(ch[prop_nick]) == 'object') {
// 						//Не меняется
// 					} else if (ch[prop_nick] == 'any') {
// 						//Не меняется
// 					} else if (ch[prop_nick] == 'empty') {
// 						//Нет пересечений
// 						ch[prop_nick] = {}
// 					}
// 					ch[prop_nick] = group[prop_nick]
// 				} else if (group[prop_nick] == 'empty') {
// 					if (typeof(ch[prop_nick]) == 'object') {
// 						//Нет пересечений
// 						ch[prop_nick] = {}
// 					} else if (ch[prop_nick] == 'any') {
// 						//Нет пересечений
// 						ch[prop_nick] = {}
// 					} else if (ch[prop_nick] == 'empty') {
// 						//Не меняется
// 					}
// 					ch[prop_nick] = group[prop_nick]
// 				}
// 			}
// 			list.push(ch)
// 		}
// 	}
// 	return list
// }
Shop.addSamples = (sgroups = [], schilds = []) => {
	let list = []
	//if (!schilds.length) list = sgroups
	//else if (!sgroups.length) list = schilds
	for (const sgroup of sgroups) {
		for (const schild of schilds) {
			const ch = {...sgroup, ...schild} //...schild
			for (const prop_nick in schild) { //Надо проверить, чтобы schild уменьшал выборку
				if (typeof(sgroup[prop_nick]) == 'object') { //Список у родителя
					if (typeof(schild[prop_nick]) == 'object') {
						//Найти пересечения по свойствам {model:{a:1,b:2}} {model:{b:1,c:2}}
						const keys = Object.keys(sgroup[prop_nick]).filter(key => key in schild[prop_nick]);
						ch[prop_nick] = Object.fromEntries(keys.map(key => [key, 1]))
					} else if (schild[prop_nick] == 'any') {  
						//ребёнок говорит дай все указанные, список родителя остаётся
						ch[prop_nick] = sgroup[prop_nick]
					} else if (schild[prop_nick] == 'empty') { 
						//У родителя список, а ребёнка говорит дай неуказанные. Нет пересечений
						ch[prop_nick] = {} //гарантированное неудовлетворение результирующей выборки
					}
				} else if (sgroup[prop_nick] == 'any') { //Любой указанный у родителя
					if (typeof(schild[prop_nick]) == 'object') {
						//Не меняется
						ch[prop_nick] = schild[prop_nick]
					} else if (schild[prop_nick] == 'any') {
						//Не меняется
						ch[prop_nick] = 'any'
					} else if (schild[prop_nick] == 'empty') {
						//Нет пересечений
						ch[prop_nick] = {} //гарантированное неудовлетворение результирующей выборки
					}
				} else if (sgroup[prop_nick] == 'empty') {
					if (typeof(schild[prop_nick]) == 'object') {
						//Нет пересечений
						ch[prop_nick] = {} //гарантированное неудовлетворение результирующей выборки
					} else if (schild[prop_nick] == 'any') {
						//Нет пересечений
						ch[prop_nick] = {} //гарантированное неудовлетворение результирующей выборки
					} else if (schild[prop_nick] == 'empty') {
						//Не меняется
						ch[prop_nick] = 'empty'
					}
				}
			}
			list.push(ch)
		}
	}
	return list
}

Shop.makemd = (m) => {
	m = m.replaceAll(/([^:]+)::\./ug, ":$1:$1.")
	const mds = m.split(':').filter(s => s).map((item) => {
        item = item.replace(/\+/g, '%20')
        const r = item.split('=')
        const data = []
        data[0] = decodeURIComponent(r.shift())
        data[1] = data.length ? decodeURIComponent(r.join('=')) : ''
        return data
    })

	
	const newmd = {}

	mds.forEach(data => {
		const name = data[0]
		const val = data[1]
		const r = name.split('.')
		let root = newmd
		const last = r.pop()
		let v
		while (v = r.shift()) {
			if (typeof(root[v]) != 'object') root[v] = {}	
			root = root[v]
		}
		if (!val) delete root[last]
		else root[last] = val
	})
	return newmd
}
Shop.makemark = (md, ar = [], path = []) => {
	if (!path.length) delete md.m
	for (const name in md) {
		const val = md[name]
		if (typeof(val) == 'object') {
			Shop.makemark(val, ar, [...path, name] )	
		} else {
			ar.push([...path, name+'='+val].join('.'))
		}
	}
	return ar
}
Shop.mdfilter = async (db, mgroup) => {
	//Удалить фильтры свойства и значения, которых не существуют
	const newmgroup = {}
	for (const prop_nick in mgroup) {
		const prop = await Shop.getPropByNick(db, prop_nick)
		if (!prop) continue
		if (typeof mgroup[prop_nick] == 'object') {
			newmgroup[prop_nick] = {}
			if (prop.type == 'value') {
				for (const value_nick in mgroup[prop_nick]) {
					if (prop.type == 'number' && (value_nick == 'upto' || value_nick == 'from')) {
						//upto и from сохраняются
					} else {
						const value = await Shop.getValueByNick(db, value_nick)
						if (!value) continue
					}
					newmgroup[prop_nick][value_nick] = mgroup[prop_nick][value_nick]
				}
			} else if (prop.type == 'number') {
				for (const value_nick in mgroup[prop_nick]) {
					if (~['upto','from'].indexOf(value_nick)) { //upto и from сохраняются
						newmgroup[prop_nick][value_nick] = mgroup[prop_nick][value_nick] //1
					} else {
						if (value_nick != Number(value_nick)) continue
						newmgroup[prop_nick][value_nick] = mgroup[prop_nick][value_nick] //1
					}
				}
			}
			if (!Object.keys(newmgroup[prop_nick]).length) delete newmgroup[prop_nick]
		} else if (~['empty','any'].indexOf(mgroup[prop_nick])) {
			newmgroup[prop_nick] = mgroup[prop_nick]
		}
	}
	return newmgroup
}

Shop.getBind = Access.wait(async db => {
	/*
		Системные свойства к которым быват обращение внутри системы
		Нельзя в model.items добавлять свои свойства, 
		системные свойства должны быть рядом по ключу модели model.model
		или model.brendart
	*/
	//Все known колонки должны быть латиницей написаны
	const temp = {
		description: 'Описание', //Описание модели									 - Описание
		posiciya: 'Позиция',	//													 - Позиция
		naimenovanie: 'Наименование', //Для карточки								 - Наименование
		istochnik: 'Источник', //Статистика в админке								 - Источник
		"staraya-cena": "Старая цена",//Необязательно для карточки					 - Старая цена
		cena: 'Цена', //Необязательно для карточки, Статистика в админке			 - Цена
		images: 'images', //Необязательно для карточки, Статистика в админке		 - Картинки
		nalichie: 'Наличие', //Необязательно для карточки							 - Наличие
		
		art: 'Арт', //Навигация														 - Арт
		"skryt-filtry": "Скрыть фильтры",//Необязательно для страницы
		brend: 'Бренд', //Необязательно для карточки, Статистика в админке, Быстрый поиск
		model: 'Модель', //Навигация, Быстрый поиск
	}
	const list = {
		brendart : 'БрендАрт', //Забираемая сущность								 
		brendmodel : 'БрендМодель', //Групировка									 

		
	}
	const bind = {}
	for (const name in list) {
		const prop = await Shop.getPropByNick(db, name)
		bind[`${name}_prop_id`] = prop.prop_id || null
	}
	return bind
})





Shop.getWhereBySamples = async (db, samples, hashs = [], partner = '', fulldef = false) => { //fulldef false значит без выборки ничего не показываем, partner нужен чтобы выборка по цене была по нужному ключу
	//win.key_id - позиция, wva.value_id - модель
	const from = ['sources_wvalues wva, sources_winners win']
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
				if (typeof(sample[prop_nick]) == 'object') {
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
						whereand.push(`1 = 0`)
					}
				} else if (sample[prop_nick] == 'any') {
					whereand.push(`
						da${i}.value_id is not null
					`)
				} else if (sample[prop_nick] == 'empty') {

					whereand.push(`
						da${i}.value_id is null
					`)
				}
			} else if (prop.type == 'number') {
				
				if (typeof(sample[prop_nick]) == 'object') {
					if (prop_nick == 'cena') {
						
						
						const {prop_id} = partner?.cost_nick ? await Shop.getPropByNick(db, partner?.cost_nick) : prop  //Подмена цены
						join.push(`
							LEFT JOIN sources_wnumbers da${i} ON (
								da${i}.entity_id = win.entity_id 
								and da${i}.key_id = win.key_id 
								and da${i}.prop_id = ${prop_id || 0}
							)
						`)
						
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
								whereand.push(`1 = 0`)
							}
						}
					} else { //number object не цена
						join.push(`
							LEFT JOIN sources_wnumbers da${i} ON (
								da${i}.entity_id = win.entity_id 
								and da${i}.key_id = win.key_id 
								and da${i}.prop_id = ${prop.prop_id || 0}
							)
						`)
						if (sample[prop_nick]['upto'] || sample[prop_nick]['from']) {
							sort = []
							if (sample[prop_nick]['upto']) {
								const number = sample[prop_nick]['upto']
								whereand.push(`da${i}.number <= ${number}`)
								sort.push(`da${i}.number DESC`)
							}
							if (sample[prop_nick]['from']) {
								const number = sample[prop_nick]['from']
								whereand.push(`da${i}.number >= ${number}`)
								sort.push(`da${i}.number ASC`)
							}
						} else {
							const numbers = Object.keys(sample[prop_nick])
							if (numbers.length) {
								whereand.push(`
									da${i}.number in (${numbers.join(', ')})
								`)
							} else {
								whereand.push(`1 = 0`)
							}
						}
					}
				} else { //number не object
					join.push(`
						LEFT JOIN sources_wnumbers da${i} ON (
							da${i}.entity_id = win.entity_id 
							and da${i}.key_id = win.key_id 
							and da${i}.prop_id = ${prop.prop_id || 0}
						)
					`)
					if (sample[prop_nick] == 'any') {
						whereand.push(`
							da${i}.number is not null
						`)
					} else if (sample[prop_nick] == 'empty') {
						whereand.push(`
							da${i}.number is null
						`)
					} else {
						where.push(`1=0`)
					}
				}
			} else { //Неизвестный prop.type
				where.push(`1=0`) //что делать если в sample не существующее свойство, должно быть найдено 0
			}
		}
		if (whereand.length) whereor.push(whereand.join(` and `))
	}
	if (whereor.length)	where.push(`((${whereor.join(') or (')}))`)
	else if (!fulldef) where.push(`1=0`)
	return {from, join, where, sort}
}
// Shop.getWhereItemsBySamples = async (db, samples, hashs = [], partner = '', fulldef = false) => { //fulldef false значит без выборки ничего не показываем, partner нужен чтобы выборка по цене была по нужному ключу
// 	//win.key_id - позиция, wva.value_id - модель
// 	const from = ['sources_winners win']
// 	const join = []
// 	const where = [`
// 		win.entity_id = :brendart_prop_id
// 	`]
// 	if (hashs.length) {
// 		from.unshift('sources_items wit')
// 		where.push('wit.entity_id = win.entity_id and wit.key_id = win.key_id')
// 		where.push('(' + hashs.map(hash => 'wit.search like "%' + hash.join('%" and wit.search like "%') + '%"').join(' or ')+')' || '1 = 1')
// 	}

// 	let sort = ['win.source_id, win.sheet_index, win.row_index, win.col_index']

// 	const whereor = []
// 	let i = 0

// 	for (const sample of samples) { //OR

// 		const whereand = []
// 		for (const prop_nick in sample) { //Находим позиции группы
// 			const prop = await Shop.getPropByNick(db, prop_nick)
			

// 			i++
			
// 			if (prop.type == 'value') {
// 				join.push(`
// 					LEFT JOIN sources_wvalues da${i} ON (
// 						da${i}.entity_id = win.entity_id 
// 						and da${i}.key_id = win.key_id 
// 						and da${i}.prop_id = ${prop.prop_id || 0}
// 					)
// 				`)
// 				if (typeof(sample[prop_nick]) == 'object') {
// 					const value_ids = []
// 					for (const value_nick in sample[prop_nick]) {
// 						const value = await Shop.getValueByNick(db, value_nick)
// 						value_ids.push(value?.value_id || 0)
// 					}
// 					if (value_ids.length) {
// 						whereand.push(`
// 							da${i}.value_id in (${value_ids.join(', ')})
// 						`)
// 					} else {
// 						whereand.push(`1 = 0`)
// 					}
// 				} else if (sample[prop_nick] == 'any') {
// 					whereand.push(`
// 						da${i}.value_id is not null
// 					`)
// 				} else if (sample[prop_nick] == 'empty') {

// 					whereand.push(`
// 						da${i}.value_id is null
// 					`)
// 				}
// 			} else if (prop.type == 'number') {
				
// 				if (typeof(sample[prop_nick]) == 'object') {
// 					if (prop_nick == 'cena') {
						
						
// 						const {prop_id} = partner?.cost_nick ? await Shop.getPropByNick(db, partner?.cost_nick) : prop  //Подмена цены
// 						join.push(`
// 							LEFT JOIN sources_wnumbers da${i} ON (
// 								da${i}.entity_id = win.entity_id 
// 								and da${i}.key_id = win.key_id 
// 								and da${i}.prop_id = ${prop_id || 0}
// 							)
// 						`)
						
// 						const isdiscost = partner?.discount && prop_nick == 'cena'
// 						const disCost = isdiscost ? number => Math.round(number * (100 + partner.discount) / 100) : number => number
							
// 						if (sample[prop_nick]['upto'] || sample[prop_nick]['from']) {
// 							sort = []
// 							if (sample[prop_nick]['upto']) {
// 								const number = disCost(sample[prop_nick]['upto'])
// 								whereand.push(`da${i}.number <= ${number}`)
// 								sort.push(`da${i}.number DESC`)
// 							}
// 							if (sample[prop_nick]['from']) {
// 								const number = disCost(sample[prop_nick]['from'])
// 								whereand.push(`da${i}.number >= ${number}`)
// 								sort.push(`da${i}.number ASC`)
// 							}
// 						} else {
// 							const numbers = Object.keys(sample[prop_nick]).map(number => disCost(number))
// 							if (numbers.length) {
// 								whereand.push(`
// 									da${i}.number in (${numbers.join(', ')})
// 								`)
// 							} else {
// 								whereand.push(`1 = 0`)
// 							}
// 						}
// 					} else { //number object не цена
// 						join.push(`
// 							LEFT JOIN sources_wnumbers da${i} ON (
// 								da${i}.entity_id = win.entity_id 
// 								and da${i}.key_id = win.key_id 
// 								and da${i}.prop_id = ${prop.prop_id || 0}
// 							)
// 						`)
// 						if (sample[prop_nick]['upto'] || sample[prop_nick]['from']) {
// 							sort = []
// 							if (sample[prop_nick]['upto']) {
// 								const number = sample[prop_nick]['upto']
// 								whereand.push(`da${i}.number <= ${number}`)
// 								sort.push(`da${i}.number DESC`)
// 							}
// 							if (sample[prop_nick]['from']) {
// 								const number = sample[prop_nick]['from']
// 								whereand.push(`da${i}.number >= ${number}`)
// 								sort.push(`da${i}.number ASC`)
// 							}
// 						} else {
// 							const numbers = Object.keys(sample[prop_nick])
// 							if (numbers.length) {
// 								whereand.push(`
// 									da${i}.number in (${numbers.join(', ')})
// 								`)
// 							} else {
// 								whereand.push(`1 = 0`)
// 							}
// 						}
// 					}
// 				} else { //number не object
// 					join.push(`
// 						LEFT JOIN sources_wnumbers da${i} ON (
// 							da${i}.entity_id = win.entity_id 
// 							and da${i}.key_id = win.key_id 
// 							and da${i}.prop_id = ${prop.prop_id || 0}
// 						)
// 					`)
// 					if (sample[prop_nick] == 'any') {
// 						whereand.push(`
// 							da${i}.number is not null
// 						`)
// 					} else if (sample[prop_nick] == 'empty') {
// 						whereand.push(`
// 							da${i}.number is null
// 						`)
// 					} else {
// 						where.push(`1=0`)
// 					}
// 				}
// 			} else { //Неизвестный prop.type
// 				where.push(`1=0`) //что делать если в sample не существующее свойство, должно быть найдено 0
// 			}
// 		}
// 		if (whereand.length) whereor.push(whereand.join(` and `))
// 	}
// 	if (whereor.length)	where.push(`((${whereor.join(') or (')}))`)
// 	else if (!fulldef) where.push(`1=0`)
// 	return {from, join, where, sort}
// }
Shop.getWhereByGroupId = async (db, group_id = false, hashs = [], partner = false, fulldef = false) => { //depricated
	const bind = await Shop.getBind(db)
	const samples = await Shop.getSamplesUpByGroupId(db, group_id)

	const {from, join, where, sort} = await Shop.getWhereBySamples(db, samples, hashs, partner, fulldef)
	return {from, join, where, sort, bind}
}



// Shop.getmdwhere = (md, sgroup = [], hashs = [], partner = false) => {
// 	const samples = Shop.mutliSMD([md.mget], sgroup)


// 	//win.key_id - позиция, wva.value_id - модель
// 	const from = ['sources_winners win, sources_wvalues wva, sources_items wit']
// 	const where = [
// 		'win.entity_id = :brendart_prop_id and win.prop_id = :brendmodel_prop_id',
// 		'wva.entity_id = win.entity_id and wva.key_id = win.key_id and wva.prop_id = win.prop_id',
// 		'wit.entity_id = win.entity_id and wit.key_id = win.key_id'
// 	]

// 	if (hashs.length) {
// 		const where_search = []
// 		for (const hash of hashs) {
// 			const sql = 'wit.search like "% ' + hash.join('%" and wit.search like "% ') + '%"'
// 			where_search.push(sql)
// 		}
// 		where.push(`(${where_search.join(' or ')})`)
// 	}
// 	const sort = ['win.source_id, win.sheet_index, win.row_index, wva.multi_index']

// 	let i = 0
// 	const where_or = []
// 	for (const mall of samples) {
// 		const whereand = []
// 		for (const prop_nick in mall) {
// 			const values = mall[prop_nick]
// 			const prop = md.props[prop_nick]
// 			if (values == 'empty') {
// 				i++
// 	 			from[0] += `
// 					LEFT JOIN sources_wvalues da${i} on (
// 						da${i}.entity_id = win.entity_id 
// 						and da${i}.key_id = win.key_id
// 						and da${i}.prop_id = ${prop.prop_id}
// 					)
// 	 			`
// 	 			whereand.push(`da${i}.prop_id is null`)
// 	 		} else {
// 	 			i++
	 			
// 				const ids = []
// 				if (prop.type == 'number') {
// 					from.push(`sources_wnumbers da${i}`)
// 					whereand.push(`da${i}.entity_id = win.entity_id`)
// 					whereand.push(`da${i}.key_id = win.key_id`)
// 					whereand.push(`da${i}.prop_id = ${prop.prop_id}`)
// 					for (let name in values) {
// 						let value = name
// 						if (~['upto','from'].indexOf(name)) {
// 							value = values[name]
// 						}
// 						if (typeof(value) == 'string') value = value.replace('-','.')
						
// 						let value_nick = Number(value)
						
// 						if (partner?.discount && prop_nick == 'cena') {
// 							value_nick = value_nick * (100 + partner.discount) / 100
// 						}
// 						if (~['upto','from'].indexOf(name)) {
// 							sort = []
// 							if (name == 'upto') {
// 								whereand.push(`da${i}.number <= ${value_nick}`)
// 								sort.push(`da${i}.number DESC`)
// 							}
// 							if (name == 'from') {
// 								whereand.push(`da${i}.number >= ${value_nick}`)
// 								sort.push(`da${i}.number ASC`)
// 							}
// 						} else {
// 							if (value_nick == value) ids.push(value_nick)
// 							//else  ids.push(prop.prop_id + ', false')	
// 						}
// 					}
// 					if (ids.length) whereand.push(`da${i}.number in (${ids.join(',')})`)
// 				} else if (prop.type == 'value') {
// 					from.push(`sources_wvalues da${i}`)
// 					whereand.push(`da${i}.entity_id = win.entity_id`)
// 					whereand.push(`da${i}.key_id = win.key_id`)
// 					whereand.push(`da${i}.prop_id = ${prop.prop_id}`)
// 					for (const value_nick in values) {
// 						const value = md.values[value_nick]
// 						ids.push(value?.value_id || 0)
// 					}
// 					if (ids.length) whereand.push(`da${i}.value_id in (${ids.join(',')})`)
// 				} else {
// 					//значения других типов пропускаем
// 				}
// 	 		}
// 		}
// 		if (whereand.length) where_or.push(`(${whereand.join(' and ')})`)
// 	}
// 	if (where_or.length) where.push(`(${where_or.join(' or ')})`)
	
// 	return {where, from, sort, bind}
// }
Shop.getModelsByItems = async (db, moditems_ids, partner) => { //[{value_id, key_ids}]
	if (!moditems_ids.length) return []
	const bind = await Shop.getBind(db)
	const modbypos = {}
	for (const row of moditems_ids) {
		row.key_ids.split(',').forEach((key_id) => {
			modbypos[key_id] = row.value_id
		})
	}

	// const conf = await config('shop')


	// const itemprops = await db.all(`
	// 	SELECT 
	// 		win.key_id,
	// 		pr.name,
	// 		pr.unit,
	// 		pr.prop_nick,
	// 		pr.prop_title,
	// 		pr.prop_id,
	// 		va.value_nick,
	// 		pr.type,
	// 		nvl(nvl(va.value_title, pos.text), nvl(pos.number, pos.date)) as text
	// 	FROM sources_winners win
	// 			LEFT JOIN sources_values va on (va.value_id = pos.value_id)
	// 			LEFT JOIN sources_props pr on (pr.prop_id = pos.prop_id)
	// 	WHERE pos.entity_id = :brendart_prop_id
	// 		and key_id in (${moditems_ids.map(row => row.key_ids).join(',')})
	// 	ORDER BY pos.source_ordain, pos.sheet_index, pos.row_index, prop_ordain, pos.multi_index
	// `, bind)

	const itemprops = (await db.all(`
		SELECT 
			win.key_id, 
			pr.prop_nick,
			pr.name,
			pr.unit,
			pr.type,

			val.value_nick, 
			wnum.number,
			wtxt.text, 
			wdate.date

		FROM sources_winners win
			LEFT JOIN sources_props pr on (pr.prop_id = win.prop_id)
			LEFT JOIN sources_wnumbers wnum on (wnum.entity_id = win.entity_id and wnum.key_id = win.key_id and wnum.prop_id = win.prop_id)
			LEFT JOIN sources_wvalues wval on (wval.entity_id = win.entity_id and wval.key_id = win.key_id and wval.prop_id = win.prop_id)
			LEFT JOIN sources_wtexts wtxt on (wtxt.entity_id = win.entity_id and wtxt.key_id = win.key_id and wtxt.prop_id = win.prop_id)
			LEFT JOIN sources_wdates wdate on (wdate.entity_id = win.entity_id and wdate.key_id = win.key_id and wdate.prop_id = win.prop_id)
			LEFT JOIN sources_values val on (val.value_id = wval.value_id)
		WHERE win.entity_id = :brendart_prop_id and win.key_id in (${moditems_ids.map(row => row.key_ids).join(',')})
	`, bind))


	const models = Object.groupBy(itemprops, row => modbypos[row.key_id])
	
	const props = {}
	for (const model_id in models) {
		const items = Object.groupBy(models[model_id], row => row.key_id)
		for (const key_id in items) {
			const iprops = Object.groupBy(items[key_id], row => row.prop_nick)
			for (const prop_nick in iprops) {
				const myvals = iprops[prop_nick]
				props[prop_nick] = await Shop.getPropByNick(db, prop_nick)
				iprops[prop_nick] = {
					prop_nick,
					vals: myvals
				}
			}
			const item = items[key_id] = {}
			for (const prop_id in iprops) {
				const prop = iprops[prop_id]
				item[prop.prop_nick] = prop.vals.map(val => val.text || val.value_nick || val.date || val.number)
			}
			//delete item.model
			//delete item.brend
		}
		models[model_id] = {
			items: Object.values(items)
		}
	}
	
	/*
		const list = {
			pos : 'БрендАрт', //brendart
			mod : 'Модель', //model
			brand : 'Бренд', //brend
			source : 'Источник', //istochnik
			cost : 'Цена' //cena
		}
		//Можно забирать все свойства или указанный список - cards
		//number превращается от до или через запятую в шаблоне
		//number, text, date, value_nick через запятую
		//value_nick потому что иногда нужны ссылки, для фильтров и для ссылок shop/brand/model
		models: [
			{
				model: [111],
				brand: [123],
				brandart: ['111-11'],
				items:[{  //Всегда есть items[0]
					
				}]
			}
		]
	*/
	const list = Object.values(models)

	//Навели порядок в ценах
	for (const model of list) {
		Shop.prepareCost(model, partner)
	}

	//Сделали recap
	for (const model of list) {
		model.recap = {}
		for (const item of model.items) {
			for (const prop_nick in item) {
				model.recap[prop_nick] ??= []
				model.recap[prop_nick].push(...item[prop_nick])
			}
		}
		for (const prop_nick in model.recap) {
			model.recap[prop_nick] = unique(model.recap[prop_nick])
			const prop = await Shop.getPropByNick(db, prop_nick)
			if (prop.type == 'number') {
				model.recap[prop_nick] = model.recap[prop_nick].map(number => Number(number))
			}
			if (prop.type == 'date') {
				model.recap[prop_nick] = model.recap[prop_nick].map(strdate => Math.round(new Date(strdate).getTime() / 1000))
			}
			model.recap[prop_nick].sort()
		}
	}
	
	//На странице модели показываем характеристики выбранного item
	
	/*
		//Чтобы показать отличия по позициями 
		Позиция | Опция | Опция
		X23		| 1 	| 2
		X25		| 1 	| 2
		Тексты нужно хронить по ключу в отдельных файлах
		Нужно массив отличающихся свойств 
			model.recap
			model.model_props
			model.item_props
	*/
	
	


	for (const model of list) {  //Для таблицы в карточке товара
		const model_props = {}
		for (const item of model.items) {
			for (const prop_nick in item) {
				model_props[prop_nick] = item[prop_nick]
			}
		}
		const item_props = {}
		for (const item of model.items) {
			for (const prop_nick in model_props) {
				if (item[prop_nick].join(',') != model_props[prop_nick].join(',')) {
					delete model_props[prop_nick]
					const prop = await Shop.getPropByNick(db, prop_nick)
					if (prop.known) continue
					item_props[prop_nick] = true //нашли item у которого свойство не указано
				}
			}
		}
		delete item_props.naimenovanie
		delete item_props.opisanie
		model.iprops = Object.keys(item_props)
		//model.model_props = Object.keys(model_props)
		//console.log(model)
	}
	console.log(list[0].iprops)
	return list
}

Shop.getModelByBrendmodel = Access.poke(async (db, brendmodel, partner) => {
	const {from, join, where, sort} = await Shop.getWhereBySamples(db, [{brendmodel:{[brendmodel]:1}}], [], partner)
	const bind = await Shop.getBind(db)
	const moditem_ids = await db.all(`
		SELECT wva.value_id, GROUP_CONCAT(win.key_id separator ',') as key_ids 
		FROM ${from.join(', ')} ${join.join(' ')}
		WHERE ${where.join(' and ')}
		GROUP BY wva.value_id 
	`, bind)

	const list = await Shop.getModelsByItems(db, moditem_ids, partner)
	const model = list[0]
	return model
})
// Shop.splitModPropsFromItems = list => {
// 	for (const model of list) {
// 		let model_props = {}
// 		for (const item of model.items) {
// 			for (const prop_nick in item) {
// 				model_props[prop_nick] = item[prop_nick]
// 			}
// 		}
// 		let item_props = {}
// 		for (const item of model.items) {
// 			for (const prop_nick in model_props) {
// 				if (item[prop_nick] != model_props[prop_nick]) {
// 					delete model_props[prop_nick]
// 					item_props[prop_nick] = true //нашли item у которого свойство не указано
// 				}
// 			}
// 		}
// 		item_props = Object.keys(item_props)
// 		for (const prop_nick in model_props) {
// 			model[prop_nick] = model_props[prop_nick]
// 			for (const item of model.items) {
// 				delete item[prop_nick]
// 			}
// 		}
// 	}
// }

Shop.prepareCost = (model, partner) => {	
	if (partner.cost) {
		const change = model => {
			if (!model[partner.cost_nick]) return
			if (partner.cost_nick == 'cena') return
			if (!model['staraya-cena']) {
				model['staraya-cena'] = model['cena']
			}
			model['cena'] = model[partner.cost_nick]
			//delete model[partner.cost]
		}
		change(model)
		if (model.items) for (const item of model.items) {
			change(item)
		}
	}
	if (partner.discount) { //Может быть и свойство и скидка от свойства, типа от "Оптовой цены" партнёру ещё и скидка к ней
		for (const item of model.items) {
			item['staraya-cena'] ??= item['cena']
			item['cena'] = item['cena'].map(number => Math.round(number * (100 - partner.discount) / 100))
		}
	}
	for (const item of model.items) {
		if (!item['cena'] || item['staraya-cena'] == item['cena']) delete item['staraya-cena']
	}
}




/*Shop.prepareCostMinMax = (model) => {
	const cost = {prop_title: 'Цена', prop_nick: 'cena'}
	if (!model.items) return
	
	let is_item_cost
	for (const item of model.items) {
		if (item['cena']) is_item_cost = true
	}
	if (!is_item_cost) return

	let min, max
	for (const item of model.items) {
		const number = item['cena']
		if (!number) continue
		if (!min || number < min) min = number
		if (!max || number > max) max = number
	}
	
	let min_discount, max_discount
	for (const item of model.items) {
		if (!item['discount']) continue
		if (!min_discount || item['discount'] < min_discount) min_discount = item['discount']
		if (!max_discount || item['discount'] > max_discount) max_discount = item['discount']
	}

	if (min == max) { //Цена не у всех позиций
		model['cena'] = min
	} else {
		model['min'] = min
		model['max'] = max
	}
	if (max_discount) {
		model['discount'] = max_discount
	}
}*/
Shop.indexGroups = Access.wait(async (db) => {
	const topids = await db.colAll(`SELECT group_id from shop_groups where parent_id is null`)
	await db.affectedRows(`TRUNCATE shop_itemgroups`)
	let count = 0
	for (const top_id of topids) {
		await Shop.runGroupDown(db, top_id, async ({group_id}) => {
			const { list } = await Shop.getFreeKeyIds(db, group_id)
			const data = list.map(key_id => [group_id, key_id])
			if (!list.length) return
			count += await db.affectedRows(`
				INSERT INTO shop_itemgroups (group_id, key_id)
				VALUES ${data.map(() => '(?, ?)').join(', ')}
			`, data.flat())
		})
	}
	console.log('Сохранены группы позиций indexGroups', count)
	return count
})
// Shop.getBindLive = Access.wait(async (db, partner) => {
// 	const bind = {}
// 	for (const name in ({
// 		brend : 'Бренд',
// 		art : 'Арт',
// 		naimenovanie: 'Наименование',
// 		images: 'images',
// 		model : 'Модель'
// 	})) {
// 		const prop = await Shop.getPropByNick(db, name)
// 		bind[`${name}_prop_id`] = prop.prop_id || null
// 	}

// 	const prop = await Shop.getPropByNick(db, nicked(partner.cost || 'Цена'))
// 	bind.cena_prop_id = prop.prop_id || null
// 	return bind
// })
Shop.getItemsWithKnownPropsNoMultiByMd = async (db, group_id, md, partner, {rand = false, limit = false, nicks = [], titles = []}) => {
	const marked_samples = await Shop.getSamplesUpByGroupId(db, group_id, [md.mget])
	const {from, join, where, sort} = await Shop.getWhereBySamples(db, marked_samples, md.hashs, partner, group_id ? false : true)
	
	const bind = await Shop.getBind(db)
	
	const propids = {}
	
	const cols2 = []
	const join2 = []
	let i = 0

	const addJoin2 = (prop, propc) => {
		i++
		propids[prop.prop_id] = prop.prop_id
		const prop_id = prop.prop_nick == 'cena' ? propc.prop_id : prop.prop_id



		if (prop.type == 'text') {
			join2.push(`
				LEFT JOIN sources_wtexts opa${i} on (
					opa${i}.key_id = win.key_id 
					and opa${i}.entity_id = win.entity_id 
					and opa${i}.prop_id = ${prop.prop_id}
					and opa${i}.multi_index = 0
				)
			`)
		} else if (prop.type == 'number') {
			join2.push(`
				LEFT JOIN sources_wnumbers opa${i} on (
					opa${i}.key_id = win.key_id 
					and opa${i}.entity_id = win.entity_id 
					and opa${i}.prop_id = ${prop.prop_id}
					and opa${i}.multi_index = 0
				)
			`)
		} else if (prop.type == 'value') {
			join2.push(`
				LEFT JOIN sources_wvalues opa${i} on (
					opa${i}.key_id = win.key_id 
					and opa${i}.entity_id = win.entity_id 
					and opa${i}.prop_id = ${prop.prop_id} 
					and opa${i}.multi_index = 0
				)
				LEFT JOIN sources_values valopa${i} on (valopa${i}.value_id = opa${i}.value_id)
			`)
		} else if (prop.type == 'date') {
			join2.push(`
				LEFT JOIN sources_wdates opa${i} on (
					opa${i}.key_id = win.key_id 
					and opa${i}.entity_id = win.entity_id 
					and opa${i}.prop_id = ${prop.prop_id}
					and opa${i}.multi_index = 0
				)
			`)
		}
	}
	const propc = await Shop.getPropByNick(db, nicked(partner.cost || 'Цена'))
	for (const prop_nick of nicks) {
		const prop = await Shop.getPropByNick(db, prop_nick)
		if (!prop) continue
		//if (prop.multi) continue
		if (prop.type == 'text') continue
		addJoin2(prop, propc)
		if (prop.type == 'value') {
			cols2.push(`valopa${i}.value_nick as '${prop_nick}_nick'`)
		} else if (prop.type == 'number') {
			cols2.push(`opa${i}.number as '${prop_nick}_nick'`)
		} else if (prop.type == 'date') {
			cols2.push(`opa${i}.date as '${prop_nick}_nick'`)
		}
	}
	for (const prop_nick of titles) {
		const prop = await Shop.getPropByNick(db, prop_nick)
		if (!prop) continue
		//if (prop.multi) continue
		addJoin2(prop, propc)
		if (prop.type == 'value') {
			cols2.push(`valopa${i}.value_title as '${prop_nick}_title'`)
		} else if (prop.type == 'number') {
			cols2.push(`opa${i}.number as '${prop_nick}_title'`)
		} else if (prop.type == 'text') {
			cols2.push(`opa${i}.text as '${prop_nick}_title'`)
		} else if (prop.type == 'date') {
			cols2.push(`opa${i}.date as '${prop_nick}_title'`)
		}
	}
	

	const list = await db.all(`
		SELECT 
			distinct win.key_id,
			vakey.value_nick as brendart_nick, 
			vamod.value_nick as brendmodel_nick, 
			${cols2.join(',')}
		FROM (${from.join(', ')} ${join.join(' ')})
			LEFT JOIN sources_values vakey on (vakey.value_id = win.key_id)
			LEFT JOIN sources_values vamod on (vamod.value_id = wva.value_id)
			${join2.join(' ')}
		WHERE ${where.join(' and ')}		
		ORDER BY ${rand ? 'RAND()' : sort.join(", ")}
		${limit ? 'LIMIT ' + limit : ''}
	`, {...bind})


	const count = limit ? await db.col(`
		SELECT count(distinct wva.value_id)
		FROM (${from.join(', ')} ${join.join(' ')})
		WHERE ${where.join(' and ')}
	`, bind) : list.length
	
	if (~nicks.indexOf('cena') || ~titles.indexOf('cena')) {
		for (const item of list) {
			if (!partner?.discount) continue
			if (!model.cena) continue
			model.cena = Math.round(model.cena * (100 - partner.discount) / 100)
		}
	}
	return {list, count}
}
Shop.getGroupIdsBymd = async (db, group_id, md, partner) => {
	const bind = await Shop.getBind(db)

	const samples = await Shop.getSamplesUpByGroupId(db, group_id)
	const marked_samples = Shop.addSamples(samples, [md.mget])
	const {from, join, where} = await Shop.getWhereBySamples(db, marked_samples, md.hashs, false, group_id ? false : true) //Если корень и нет samples то вязть всё, если группа и нет samples то пусто
	
	
	const res_ids = await db.colAll(`
		SELECT distinct g.group_id 
		FROM 
			(${from.join(', ')}, shop_itemgroups gi, shop_groups g)
			${join.join(' ')}		
		WHERE ${where.join(' and ')}
		and win.key_id = gi.key_id
		and g.group_id = gi.group_id
		ORDER BY g.ordain
	`, bind)

	//Позиция может быть в закрытой группе, тоже и всплывёт закрытая группа
	const list = []
	for (const group_id of res_ids) {
		if (await Shop.canI(db, group_id)) list.push(group_id)
	}
	return list
}
Shop.getFreeKeyIds = async (db, group_id = null, hashs = [], limit = false) => {	
	const bind = await Shop.getBind(db)

	const samples = await Shop.getSamplesUpByGroupId(db, group_id)
	const gw = await Shop.getWhereBySamples(db, samples, hashs, false, group_id ? false : true) //Если корень и нет samples то вязть всё, если группа и нет samples то пусто

	const childs = group_id ? (await Shop.getGroupById(db, group_id)).childs : await db.colAll(`select group_id from shop_groups where parent_id <=> :group_id`, {group_id})
	let childsamples = []
	for (const child_id of childs) { //Исключаем позиции подгрупп
		const child = await Shop.getGroupById(db, child_id)
		const samples = await Shop.getSamplesByGroupId(db, child_id)
		childsamples.push(...samples)
	}
	/*
		Выборка позиций samples (всё кроме указанного)
		Надо из этой выборки исключить childsamples
	*/
	const cw = await Shop.getWhereBySamples(db, childsamples, hashs, false, false)	
	
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
Shop.canI = async (db, group_id) => {
	const conf = await config('shop')
	return await Shop.runGroupUp(db, group_id, (group) => {
		if (group.group_nick == conf.root_nick) return true //Группа вложена или сама является корнем
	})
}
Shop.runGroupDown = async (db, group_id, func) => {
	const group = await Shop.getGroupById(db, group_id)
	const r = await func(group)
	if (r != null) return r
	for (const child_id of group.childs) {
		const r = await Shop.runGroupDown(db, child_id, func)
		if (r != null) return r
	}
}
Shop.runGroupUp = async (db, group_id, func) => {
	if (!group_id) return
	const group = await Shop.getGroupById(db, group_id)
	const r = await func(group)
	if (r != null) return r
	return Shop.runGroupUp(db, group.parent_id, func)
}


















// Shop.getmdids = async (db, samples) => {
// 	const props = {}
// 	const values = {}
	
// 	for (const sample of samples) { //or
// 		for (const prop_nick in sample) {//and
// 			props[prop_nick] = await Shop.getPropByNick(db, prop_nick)
// 			const val = sample[prop_nick]
// 			if (typeof val == 'object') {
// 				for (const value_nick in val) { //or
// 					values[value_nick] = await Shop.getValueByNick(db, value_nick)
// 				}
// 			}	
// 		}
// 	}
	
	
	
// 	// const props = await db.allto('prop_nick', `
// 	// 	SELECT prop_id, prop_nick, prop_title, type, name, unit
// 	// 	FROM sources_props
// 	// 	WHERE prop_nick in ("${unique(prop_nicks).join('","')}")
// 	// `)
// 	// const values = await db.allto('value_nick', `
// 	// 	SELECT value_id, value_nick, value_title
// 	// 	FROM sources_values
// 	// 	WHERE value_nick in ("${unique(value_nicks).join('","')}")
// 	// `)
// 	return {values: Object.values(values), props: Object.values(props)}
// }

// Shop.getmdids = async (db, samples) => {
// 	const prop_nicks = []
// 	const value_nicks = []
	
// 	for (const mall of samples) { //or
// 		for (const prop_nick in mall) {//and
// 			prop_nicks.push(prop_nick)
// 			const val = mall[prop_nick]
// 			if (typeof val == 'object') {
// 				for (const value_nick in val) { //or
// 					value_nicks.push(value_nick)
// 				}
// 			}	
// 		}
// 	}
	
	
	
// 	const props = await db.allto('prop_nick', `
// 		SELECT prop_id, prop_nick, prop_title, type, name, unit
// 		FROM sources_props
// 		WHERE prop_nick in ("${unique(prop_nicks).join('","')}")
// 	`)
// 	const values = await db.allto('value_nick', `
// 		SELECT value_id, value_nick, value_title
// 		FROM sources_values
// 		WHERE value_nick in ("${unique(value_nicks).join('","')}")
// 	`)
// 	return {values, props}
// }
// Shop.getOldSamples = async (db, group_id) => { //depricated
// 	const values = await db.all(`
// 		SELECT 
// 			sv.sample_id, 
// 			sv.prop_nick, 
// 			sv.value_nick
// 		FROM 
// 			shop_samples gs, 
// 			shop_samplevalues sv
// 		WHERE 
// 			gs.group_id = :group_id 
// 			and gs.sample_id = sv.sample_id
// 			and sv.value_nick is not null
// 	`, {group_id})
// 	const samples = {}
// 	for (const {prop_nick, sample_id, value_nick} of values) {
// 		samples[sample_id] ??= {}
// 		samples[sample_id][prop_nick] ??= {}
// 		samples[sample_id][prop_nick][value_nick] ??= 1
// 	}
// 	return Object.values(samples)
// }
// Shop.getSgroup = async (db, group_id, csgroup = []) => { //depricated lgroup поднимаемся наверх от lgroup, уточняем lgroup
// 	if (!group_id) return csgroup
// 	const samples = await Shop.getOldSamples(db, group_id)
	
// 	const list = Shop.mutliSMD(samples, csgroup)
// 	const parent_id = await db.col(`select parent_id from shop_groups where group_id = :group_id`, {group_id})
// 	return Shop.getSgroup(db, parent_id, list)
// }

Shop.getGroupFilterChilds = async (db, group_id = null) => {
	const conf = await config('shop')
	const childs = await Shop.runGroupUp(db, group_id, group => {
		if (group.group_nick == conf.root_nick) return [...group.childs] //Выше подниматься нельзя
		if (group.childs.length) return [...group.childs]
	})
	for (const i in childs) {
		childs[i] = await Shop.getGroupById(db, childs[i])
	}
	return childs
}
Shop.getModcount = Access.poke(async (db, md, partner, group_id = null) => { 
	const bind = await Shop.getBind(db)
	const samples = await Shop.getSamplesUpByGroupId(db, group_id)
	const marked_samples = Shop.addSamples(samples, [md.mget])

	const {from, join, where, sort} = await Shop.getWhereBySamples(db, marked_samples, md.hashs, partner)

	const modcount = await db.col(`
		SELECT count(distinct wva.value_id)
		FROM ${from.join(', ')} ${join.join(' ')}
		WHERE ${where.join(' and ')}
		ORDER BY ${sort.join(', ')}
	`, bind)
	return modcount
})
Shop.getmd = async (db, origm, query = '', hashs = []) => {
	

	const mgetorig = Shop.makemd(origm)
	
	const mget = await Shop.mdfilter(db, mgetorig) //Удалить фильтры свойства и значения, которых не существуют
	const m = Shop.makemark(mget).join(':')
	
	const md = {m, mget, query, hashs}
	md.toString = () => [md.m, md.query].join(':')
	return md
}

/*
	lgroup = [
		{
			prop_nick:[
				{value_nick}, 
				{value_nick}
			]
		}
	]
*/
// Shop.mutliSMD = (psgroup, csgroup) => {
// 	let list = []
// 	if (!csgroup.length) list = psgroup
// 	else if (!psgroup.length) list = csgroup
// 	else for (const pmgroup of psgroup) {
// 		for (const cmgroup of csgroup) {
// 			const nmgroup = {...cmgroup}
// 			for (const prop_nick in pmgroup) {
// 				nmgroup[prop_nick] ??= {}
// 				Object.assign(nmgroup[prop_nick], pmgroup[prop_nick])
// 			}
// 			list.push(nmgroup)
// 		}
// 	}
// 	return list
// }


Shop.getFilterConf = async (db, prop_nick, group, md, partner) => {
	const prop = await Shop.getPropByNick(db, prop_nick)
	const bind = await Shop.getBind(db)
	const prop_id = prop.prop_id
	if (!~['value','number'].indexOf(prop.type)) return false
	
	const samples = await Shop.getSamplesUpByGroupId(db, group.group_id)
	const group_where = await Shop.getWhereBySamples(db, samples, md.hashs, partner)

	// const marked_samples = Shop.dakdSamples(samples, [md.mget])
	// const marked_where = await Shop.getWhereBySamples(db, marked_samples, md.hashs, partner)


	const filter_tpl = prop.filter_tpl || 'default'
	const filter = {prop_nick, tpl:filter_tpl, descr: ''}
	if (filter.tpl == 'slider') {
		if (prop.type != 'number') return false
		const row = await db.fetch(`
			SELECT min(wn.number) as min, max(wn.number) as max
			FROM 
				${group_where.from.join(', ')} 
				${group_where.join.join(' ')}
				LEFT JOIN sources_wnumbers wn on wn.key_id = win.key_id
			WHERE ${group_where.where.join(' and ')}
			and wn.prop_id = :prop_id
			ORDER BY wn.number
		`, {...bind, ...prop})
		if (row.min === row.max) return false
		filter.min = Number(row.min)
		filter.max = Number(row.max)
		const spread = filter.max - filter.min
		const makefilter = (step) => {
			filter.step = step
			filter.min = Math.floor(filter.min / step) * step
			filter.max = Math.ceil(filter.max / step) * step
		}
		if (spread > 1000000) {
			makefilter(50000)
		} else if (spread > 100000) {
			makefilter(5000)
		} else if (spread > 10000) {
			makefilter(500)
		} else if (spread > 1000) {
			makefilter(50)
		} else if (spread > 100) {
			makefilter(5)
		} else {
			makefilter(1)
		}
		return filter
	}

	
	
	if (prop.type == 'value') {
		filter.values = await db.colAll(`
			SELECT distinct va.value_nick
			FROM 
				${group_where.from.join(', ')} 
				${group_where.join.join(' ')}
				LEFT JOIN sources_wvalues wv on wv.key_id = win.key_id
				LEFT JOIN sources_values va on va.value_id = wv.value_id
			WHERE ${group_where.where.join(' and ')}
			and wv.prop_id = :prop_id
			ORDER BY va.value_title
		`, {...bind, ...prop})
		
	} else if (prop.type == 'number') {
		filter.values = await db.colAll(`
			SELECT distinct wn.number
			FROM 
				${group_where.from.join(', ')} 
				${group_where.join.join(' ')}
				LEFT JOIN sources_wnumbers wn on wn.key_id = win.key_id
			WHERE ${group_where.where.join(' and ')}
			and wn.prop_id = :prop_id
			ORDER BY wn.number
		`, {...bind, ...prop})
		
	}

	const selected = md.mget[prop_nick]
	const values_nicks = Object.keys(selected || {})	
	for (const value_nick of values_nicks) {
		if (filter.values.some(v => v == value_nick)) continue
		filter.values.push(value_nick)
	}
	if (!selected && filter.values.length < 1) return false

	
	const mget = {...md.mget}
	delete mget[prop_nick]
	const nmd = {m: Shop.makemark(mget).join(':'), mget, query: md.query, hashs: md.hashs}
	nmd.toString = () => [md.m, md.query].join(':')
	
	const except_samples = Shop.addSamples(samples, [nmd.mget])
	const except_where = await Shop.getWhereBySamples(db, except_samples, md.hashs, partner)

	if (prop.type == 'value') {
		filter.remains = await db.colAll(`
			SELECT distinct va.value_nick
			FROM 
				${except_where.from.join(', ')} 
				${except_where.join.join(' ')}
				LEFT JOIN sources_wvalues wv on wv.key_id = win.key_id
				LEFT JOIN sources_values va on va.value_id = wv.value_id
			WHERE ${except_where.where.join(' and ')}
			and wv.prop_id = :prop_id
		`, {...bind, ...prop})
	} else if (prop.type == 'number') {
		filter.remains = await db.colAll(`
			SELECT distinct wn.number
			FROM 
				${except_where.from.join(', ')} 
				${except_where.join.join(' ')}
				LEFT JOIN sources_wnumbers wn on wn.key_id = win.key_id
			WHERE ${except_where.where.join(' and ')}
			and wn.prop_id = :prop_id
		`, {...bind, ...prop})
	}
	// filter.mutes = []
	// filter.values.forEach(value_nick => {
	// 	if (!filter.remains.some(v => v == value_nick)) filter.mutes.push(value_nick)
	// })
	return filter
}