import Access from "/-controller/Access.js"
//import Sources from "/-sources/Sources.js"

import Db from "/-db/Db.js"
import nicked from "/-nicked"
import unique from "/-nicked/unique.js"
import filter from "/-nicked/filter.js"
import fs from 'fs/promises'
import config from '/-config'

import rest_docx from '/-docx/rest.js'

const Shop = {}
export default Shop



// Shop.getAllGroupIdFilterIds = Access.poke(async (db) => {
// 	const rows = await db.all(`
// 		SELECT 
// 			fi.group_id, pr.prop_id
// 		FROM shop_filters fi, sources_wprops pr
// 		WHERE pr.prop_nick = fi.prop_nick
// 	`)
// 	const list = Object.groupBy(rows, ({ group_id }) => group_id)
// 	for (const group_id in list) {
// 		list[group_id] = list[group_id].map(({prop_id}) => prop_id)
// 	}
// 	return list
// })
Shop.getGroupPage = async (group_nick, visitor) => {
	const conf = await config('shop')
	const src = conf.group_pages + group_nick
	const reans = await rest_docx.get('get-html', { src }, visitor)
	return reans.status == 200 ? reans.data : ''
}
Shop.getGroupIcon = async (group_nick, visitor) => {
	const conf = await config('shop')
	const src = conf.group_pages + group_nick + '.webp'
	const isfile = await fs.lstat(src).catch(e => false)
	if (!isfile) return false
	if (!isfile.isFile()) return false
	return src
}
Shop.getGroupHead = async (group, visitor) => {
	const group_nick = group.group_nick
	const head = {
		title: group.group_title, //Имя в списке
		description: group.description || group.category, //Заголовок на странице
		image_src:group.image_src
	}
	if (!group.description) {
		const page = await Shop.getGroupPage(group_nick, visitor)
		const description = Shop.cleanDescription(page)
		if (description) head.description = description
	}

	return head
}
Shop.getPlopHead = async (plop) => {
	const gain = async (prop_nick) => Shop.cleanDescription(plop[prop_nick + '_title'])
	return Shop.getGainHead(plop, gain)
}
Shop.getItemHead = async (db, item) => {
	const gain = async (prop_nick) => Shop.cleanDescription((await Shop.getSomeTitles(db, item, prop_nick)).join(', '))
	return Shop.getGainHead(item, gain)
}
Shop.getGainHead = async (item, gain) => {
	
	//Доступно из-за sitemap plop titles:['brednart','brendmodel', 'opisanie','brend','art','model','naimenovanie', 'images']

	const opisanie = await gain('opisanie')
	const brend = await gain('brend')
	const brendart = await gain('brendart')
	const brendmodel = await gain('brendmodel')
	const art = await gain('art')
	const model = await gain('model')
	const naimenovanie = await gain('naimenovanie')
	const image_src = await gain('images')
	
	const head = {}

	if (art && model && brend) head.title = [brend, model, art].join(' ')
	else if (brendmodel != brendart && art) head.title = [brendmodel, art].join(' ')
	


	if (image_src) head.image_src = image_src
	
	if (opisanie) head.description = opisanie
	else if (naimenovanie) head.description = naimenovanie
	

	if (!head.title) head.title = brendart
	if (!head.description) head.description = 'Купить ' + brendart
	return head
}
Shop.reduce = (keys, props) => { //Минимизируем выдачу, какие свойства оставить в объектах массива через создание нового объекта. Настройка rest под front
	for (const nick in keys) {
		const obj = keys[nick]
		const nobj = {}
	 	for (const name of props) nobj[name] = obj[name]
	 	keys[nick] = nobj
	}
}
Shop.getAllGroupIds = Access.poke(async (db, group_id) => { //От корня, доступные для просмотра группы
	const conf = await config('shop')
	const root_id = group_id || await Shop.getGroupIdByNick(db, conf.root_nick)
	// if (group_id) {
	// 	const group_ids = []
	// 	const r = await Shop.runGroupUp(db, group_id, ({group_id}) => {
	// 		if (group_id == root_id) return true
	// 	})
	// 	if (!r) return group_ids
	// 	await Shop.runGroupDown(db, group_id, ({group_id}) => {
	// 		group_ids.push(group_id)
	// 	})
	// 	return group_ids
	// } else {
		const group_ids = await db.colAll(`
			WITH RECURSIVE group_tree AS (
				SELECT ${root_id} as group_id
				UNION ALL
				SELECT sg.group_id
				FROM shop_groups sg, group_tree gt 
				WHERE sg.parent_id = gt.group_id
			)
			SELECT group_id FROM group_tree
		`)
		return group_ids
	//}
})



// Shop.getGroupIdsBySnap = async (db, snap) => {
// 	/*
// 		snap = {
// 			'cena':[{value_nick, number},{value_nick, number}],
// 			'naimenovanie':[{value_nick, number},{value_nick, number}]
// 		}
// 	*/
// 	const group_ids = await Shop.getAllGroupIds(db)
// 	const list = []
// 	for (const group_id of group_ids) {
// 		const samples = await Shop.getSamplesUpByGroupId(db, group_id)
// 		if (!Shop.isSnapSamples(snap, samples)) continue
// 		list.push(group_id)
// 	}
// 	return list
// }
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
Shop.getValueByNick = Access.blink(async (db, value_nick) => {
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
			spr.singlechoice + 0 as singlechoice,
			pr.prop_id,
			pr.name,
			pr.type,
			pr.unit,
			pr.scale,
			pr.ordain,
			nvl(spr.card_tpl, "") as card_tpl,
			spr.filter_tpl,
			pr.known
		FROM sources_wprops pr
		LEFT JOIN shop_props spr on (spr.prop_nick = pr.prop_nick)
		WHERE pr.prop_nick = :prop_nick
	`, {prop_nick})
	if (!prop) return false
	if (prop) prop.toString = () => prop.prop_id
	return prop
})
Shop.getGroupByNick = async (db, group_nick) => {
	const group_id = await Shop.getGroupIdByNick(db, group_nick)
	return Shop.getGroupById(db, group_id)
}
Shop.getGroupIdByNick = Access.poke(async (db, group_nick) => {
	const group_id = await db.col(`
		SELECT gr.group_id
		FROM shop_groups gr
		WHERE gr.group_nick = :group_nick
	`, {group_nick})
	return group_id || false
})
Shop.isNest = async (db, child_id, parent_id) => { //canI
	//Поднимаемся по родителям
	if (!parent_id) return true
	if (!child_id) return false
	if (child_id == parent_id) return true
	const child = await Shop.getGroupById(db, child_id)
	return Shop.isNest(db, child.parent_id, parent_id)
}
Shop.isInRootById = async (db, group_id) => {
	const conf = await config('shop')
	return await Shop.runGroupUp(db, group_id, (group) => {
		if (group.group_nick == conf.root_nick) return true //Группа вложена или сама является корнем
	})
}
Shop.isInRootByNick = async (db, group_nick) => {
	const conf = await config('shop')
	const group_id = await Shop.getGroupIdByNick(group_nick)
	return Shop.isInRootById(db, group_id)	
}


Shop.getGroupById = Access.poke(async (db, group_id = false) => {
	if (!group_id) return false
	const group = await db.fetch(`
		SELECT 
			gr.group_id,
			gr.group_nick,
			gr.group_title,
			gr.group_id,
			gr.description,
			gr.image_src,
			gr.ordain,
			gr.parent_id,
			pr.group_title as parent_title,
			pr.group_nick as parent_nick,
			pr.group_name as parent_name,
			gr.self_filters + 0 as self_filters,
			gr.self_cards + 0 as self_cards
		FROM shop_groups gr
			LEFT JOIN shop_groups pr on (pr.group_id = gr.parent_id)
		WHERE gr.group_id = ${group_id}
	`)
	if (!group) return false

	
	const childs = await db.all(`select group_id, group_nick from shop_groups where parent_id = ${group_id} order by ordain`)
	group.child_ids = []
	group.child_nicks = []
	for (const child of childs) {
		group.child_ids.push(child.group_id)
		group.child_nicks.push(child.group_nick)
	}
	group.childs = group.child_nicks //depricated

	if (group.self_filters) {
		group.filter_nicks = await db.colAll(`select prop_nick from shop_filters where group_id = ${group_id} order by ordain`)
	} else {
		const parent = await Shop.getGroupById(db, group.parent_id)
		group.filter_nicks = parent.filter_nicks || []
	}
	group.filters = group.filter_nicks //depricated


	if (group.self_cards) {
		group.card_nicks = await db.colAll(`select prop_nick from shop_cards where group_id = ${group_id} order by ordain`)
	} else {
		const parent = await Shop.getGroupById(db, group.parent_id)
		group.card_nicks = parent.card_nicks || []
	}
	group.cards = group.card_nicks //depricated

	group.category = await db.col(`
		WITH RECURSIVE tree AS (
		    SELECT 
		        group_id, 
		        parent_id, 
		        group_title, 
		        0 AS level,
		        CAST(group_title AS CHAR(1000)) AS category
		    FROM shop_groups
		    WHERE parent_id IS null
		    
		    UNION ALL
		    
		    SELECT 
		        c.group_id, 
		        c.parent_id, 
		        c.group_title, 
		        t.level + 1,
		        CONCAT(t.category, ' / ', c.group_title) AS category
		    FROM shop_groups c
		    JOIN tree t ON c.parent_id = t.group_id
		)
		SELECT category FROM tree
		WHERE group_id = ${group_id}
	`)

	group.toString = () => group_id
	return group
})


// Shop.getSamplesByGroupId = Access.poke(async (db, group_id = null) => {	//depricated use ShopAdmin
	

// 	const list = group_id ? await db.all(`
// 		SELECT sa.sample_id, sp.prop_nick, if(pr.type = "number", spv.number, spv.value_nick) as value_nick, sp.spec
// 		FROM shop_samples sa
// 			LEFT JOIN shop_sampleprops sp on sp.sample_id = sa.sample_id
// 			LEFT JOIN shop_samplevalues spv on (spv.sample_id = sa.sample_id and spv.prop_nick = sp.prop_nick)
// 			LEFT JOIN sources_wprops pr on pr.prop_nick = sp.prop_nick
// 		WHERE sa.group_id = :group_id and pr.prop_id is not null
// 		ORDER BY sa.date_create, sp.date_create, spv.date_create
// 	`, {group_id}) : [] 
// 	/*await db.all(`
// 		SELECT sa.sample_id, sp.prop_nick, spv.value_nick, sp.spec
// 		FROM shop_groups gr, shop_samples sa
// 			LEFT JOIN shop_sampleprops sp on sp.sample_id = sa.sample_id
// 			LEFT JOIN shop_samplevalues spv on (spv.sample_id = sa.sample_id and spv.prop_nick = sp.prop_nick)
// 		WHERE gr.parent_id is null and sa.group_id = gr.group_id
// 		ORDER BY sa.date_create, sp.date_create, spv.date_create
// 	`)*/



// 	const sampleids = {}
// 	for (const {sample_id, prop_nick, value_nick, spec} of list) {
// 		if (!prop_nick) continue
// 		if (!value_nick && spec == 'exactly') continue
// 		sampleids[sample_id] ??= {}
// 		if (spec == 'exactly') {
// 			sampleids[sample_id][prop_nick] ??= {}
// 			sampleids[sample_id][prop_nick][value_nick] = 1
// 		} else {
// 			sampleids[sample_id][prop_nick] = spec
// 		}
// 	}
// 	/*
// 		[
// 			{
// 				cena: {from:1, upto:2}
// 				art: {
// 					nick: 1, 
// 					some: 1, 
// 					test: 1
// 				},
// 				images: empty,
// 				ves: any,
// 			}, {
// 				...	
// 			}
// 		]
// 	*/
// 	return Object.values(sampleids)
// })



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
Shop.getPartnerByKey = async key => {
	const conf = await config('shop')
	const partner = conf.partners[key]
	if (!partner) return false
	partner.key = key
	if (partner.cost) partner.cost_nick = nicked(partner.cost)
	partner.toString = () => key
	return partner
}
Shop.mdfilter = async (db, mgroup) => {
	//Удалить фильтры свойства и значения, которых не существуют
	const newmgroup = {}

	for (const prop_nick in mgroup) {
		const prop = await Shop.getPropByNick(db, prop_nick)
		if (!prop) continue
		if (!~['more','column'].indexOf(prop.known)) continue

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
						if (mgroup[prop_nick][value_nick] != Number(mgroup[prop_nick][value_nick])) continue
						newmgroup[prop_nick][value_nick] = mgroup[prop_nick][value_nick]
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
		modifikaciya: 'Модификация', //Проверяется в корзине
		naimenovanie: 'Наименование', //Для карточки								 - Наименование
		istochnik: 'Источник', //Статистика в админке								 - Источник
		"staraya-cena": "Старая цена",//Необязательно для карточки					 - Старая цена
		cena: 'Цена', //Необязательно для карточки, Статистика в админке			 - Цена
		images: 'images', //Необязательно для карточки, Статистика в админке		 - Картинки
		nalichie: 'Наличие', //Необязательно для карточки							 - Наличие
		
		art: 'Арт', //Навигация														 - Арт
		"skryt-filtry": "Скрыть фильтры",//Необязательно для страницы
		
		model: 'Модель', //Навигация, Быстрый поиск
	}
	const list = {
		brend: 'Бренд', //Необязательно для карточки, Статистика в админке, Быстрый поиск
		brendart : 'БрендАрт', //Забираемая сущность								 
		brendmodel : 'БрендМодель', //Групировка
	}
	const bind = {}
	for (const name in list) {
		const prop = await Shop.getPropByNick(db, name)
		if (!prop) throw 'Требуется обязательное свойство ' + name
		bind[`${name}_prop_id`] = prop.prop_id || null
	}
	return bind
})








// Shop.getmdwhere = (md, sgroup = [], hashs = [], partner = false) => {
// 	const samples = Shop.mutliSMD([md.mget], sgroup)


// 	//win.key_id - позиция, wva.value_id - модель
// 	const from = ['sources_wcells win, sources_wvalues wva, sources_witems wit']
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
Shop.getSomeTitles = async (db, item, prop_nick) => {
	if (!item[prop_nick]) return []
	const prop = await Shop.getPropByNick(db, prop_nick)
	const res = []
	for (const nick of item[prop_nick]) {
		if (prop.type == 'value') {
			const value = await Shop.getValueByNick(db, nick)
			res.push(value?.value_title || nick)
		} else if (prop.type == 'date') {
			res.push(ddd.ai(nick))
		} else { //text, number
			res.push(nick)
		}
	}
	return res
}
Shop.cleanDescription = (text) => {
	if (!text) return ''
	text = text
		.replace(/<script([\S\s]*?)>([\S\s]*?)<\/script>/ig, '')
		.replace(/<style([\S\s]*?)>([\S\s]*?)<\/style>/ig, '')
		.replace(/<h1[^>]*>.*<\/h1>/iu, "")
		.replace(/<\/?[^>]+(>|$)/g, " ")
		.replace(/\s+/," ").trim()
	
	const r = text.match(/.{200}[^\.!]*[\.!]/u)
	text = (r ? r[0] : text).replaceAll(' ,', ',')
	return text
}
Shop.prepareMgetPropsValues = async (db, data, mget) => {
	data.props = {}
	data.values = {}
	for (const prop_nick in mget) {
		const prop = await Shop.getPropByNick(db, prop_nick)
		data.props[prop_nick] = prop
		const val = mget[prop_nick]
		if (typeof val == 'object') {
			for (const value_nick in val) {
				data.values[value_nick] = await Shop.getValueByNick(db, value_nick)
			}
		}	
	}
}

Shop.prepareModelsPropsValues = async (db, data, models) => { //basket.list, models.list
	data.props ??= {}
	data.values ??= {}	
	for (const model of models) {
		const item = model.item || model.recap
		for (const prop_nick in item) {
			const prop = data.props[prop_nick] ??= await Shop.getPropByNick(db, prop_nick)
			if (prop.type != 'value') continue
			for (const value_nick of item[prop_nick]) {
				data.values[value_nick] ??= await Shop.getValueByNick(db, value_nick)
				
			}
		}
	}	
}
Shop.prepareModelsPropsValuesGroups = async (db, data, models) => { //basket.list, models.list
	await Shop.prepareModelsPropsValues(db, data, models)
	data.groups ??= {}
	if (models[0]?.group_nicks) return
	for (const model of models) {
		const item = model.item || model.recap //pos из корзины или model из каталога
		if (!model.group_nicks) continue
		for (const group_nick of model.group_nicks) {
			data.groups[group_nick] = await Shopt.getGroupByNick(db, group_nick)
		}
	}
}

Shop.getModelsByItems = async (db, moditems_ids, partner, props = []) => { //moditems_ids = [{value_id, key_ids}] props = ['brendart']
	if (!moditems_ids.length) return []
	const bind = await Shop.getBind(db)
	const key_id_to_model_id = {}
	const model_id_to_group_nicks = {}
	if (props.length && partner.cost_nick) props.push(partner.cost_nick)
	
	for (const row of moditems_ids) {
		row.key_ids.split(',').forEach((key_id) => {
			key_id_to_model_id[key_id] = row.value_id
		})

		if (!row.group_ids) continue
		const group_ids = row.group_ids.split(',')
		model_id_to_group_nicks[row.value_id] ??= []
		for (const group_id of group_ids) {
			const group = await Shop.getGroupById(db, group_id)

			model_id_to_group_nicks[row.value_id].push(group.group_nick)
		}
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
	// 	FROM sources_wcells win
	// 			LEFT JOIN sources_values va on (va.value_id = pos.value_id)
	// 			LEFT JOIN sources_wprops pr on (pr.prop_id = pos.prop_id)
	// 	WHERE pos.entity_id = :brendart_prop_id
	// 		and key_id in (${moditems_ids.map(row => row.key_ids).join(',')})
	// 	ORDER BY pos.source_ordain, pos.sheet_index, pos.row_index, prop_ordain, pos.multi_index
	// `, bind)
	const checkcost = partner.cost_nick ? ` or pr.prop_nick = "${partner.cost_nick}"` : ''
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

		FROM sources_wcells win
			LEFT JOIN sources_wprops pr on (pr.prop_id = win.prop_id)
			LEFT JOIN sources_wnumbers wnum on (wnum.entity_id = win.entity_id and wnum.key_id = win.key_id and wnum.prop_id = win.prop_id)
			LEFT JOIN sources_wvalues wval on (wval.entity_id = win.entity_id and wval.key_id = win.key_id and wval.prop_id = win.prop_id)
			LEFT JOIN sources_wtexts wtxt on (wtxt.entity_id = win.entity_id and wtxt.key_id = win.key_id and wtxt.prop_id = win.prop_id)
			LEFT JOIN sources_wdates wdate on (wdate.entity_id = win.entity_id and wdate.key_id = win.key_id and wdate.prop_id = win.prop_id)
			LEFT JOIN sources_values val on (val.value_id = wval.value_id)
		WHERE win.entity_id = ${bind.brendart_prop_id} and win.key_id in (${moditems_ids.map(row => row.key_ids).join(',')})
		-- and (val.value_id is null or val.value_nick != '')
		-- and (pr.type != 'value' or (val.value_id is not null and val.value_nick != ''))
		
		${props.length ? 'and pr.prop_nick in ("' + props.join('","') + '")' : 'and (pr.known != "system"' + checkcost + ')'}
	`))

	const models = Object.groupBy(itemprops, row => key_id_to_model_id[row.key_id])

	
	
	//const props = {}
	for (const model_id in models) {
		const items = Object.groupBy(models[model_id], row => row.key_id)
		for (const key_id in items) {
			const iprops = Object.groupBy(items[key_id], row => row.prop_nick)
			for (const prop_nick in iprops) {
				const myvals = iprops[prop_nick]
				//props[prop_nick] = await Shop.getPropByNick(db, prop_nick)
				iprops[prop_nick] = {
					prop_nick,
					vals: myvals
				}
			}
			const item = items[key_id] = {}
			for (const prop_id in iprops) {
				const prop = iprops[prop_id]
				item[prop.prop_nick] = prop.vals.map(val => val.value_nick ?? val.date ?? val.number ?? val.text)
			}
		}
		//Если проверяется доступ по группам, то и группы можно сразу взять
		models[model_id] = {
			group_nicks: model_id_to_group_nicks[model_id] || [],
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

	
	const list = []
	for (const {value_id} of moditems_ids) {
		list.push(models[value_id])
	}
	//const list = Object.values(models)
	//Навели порядок в ценах
	for (const model of list) {
		Shop.prepareCost(model, partner)
	}
	//Навели порядок в images, texts, files, videos .replaceAll('&#44;', ',')
	for (const model of list) {
	 	Shop.prepareFiles(model)
	}
	// for (const model of list) {
	// 	//model.groups = model_id_to_group_nicks[row.value_id]
	// }
	//Сделали recap	
	for (const model of list) {
		model.recap = {}
		for (const item of model.items) {
			for (const prop_nick in item) {
				model.recap[prop_nick] ??= []
				const prop = await Shop.getPropByNick(db, prop_nick)
				if (prop.type == 'number') {  //Сортировка латиницы отличается от русского v-в разные места
					item[prop_nick].sort((a, b) => a - b)
					
				}
				//item[prop_nick].sort()
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
			if (prop.type == 'number') { //Сортировка латиницы отличается от русского v-в разные места
				model.recap[prop_nick].sort((a, b) => a - b)
			}
			//model.recap[prop_nick].sort()
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

	// for (const model of list) {
	// 	// if (model.group_ids) {
	// 	// 	//const group_ids = model.group_ids.split(',')
	// 	// 	//model.group_nicks = model.group_nicks.split(',')
	// 	// } else {
	// 	// 	const keys = []
	// 	// 	for (const key_nick of model.recap.brendart) {
	// 	// 		const value = await Shop.getValueByNick(db, key_nick)
	// 	// 		keys.push(value.value_id)
	// 	// 	}
	// 	// 	const group_ids = await db.colAll(`SELECT distinct group_id from shop_itemgroups where key_id in (${keys.join(',')})`)
	// 	// 	const group_nicks = []
	// 	// 	for (const group_id of group_ids) {
	// 	// 		//if (!await Shop.isInRootById(db, group_id)) continue
	// 	// 		const group = await Shop.getGroupById(db, group_id)
	// 	// 		group_nicks.push(group.group_nick)
	// 	// 	}
	// 	// 	model.group_nicks = group_nicks
	// 	// }
	// 	//model.groups = model.group_nicks  //depricated
	// }
	

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
				if (String(item[prop_nick]) != String(model_props[prop_nick])) {
					delete model_props[prop_nick]
					const prop = await Shop.getPropByNick(db, prop_nick)
					//if (prop.known) continue
					item_props[prop_nick] = true //нашли item у которого свойство не указано
				}
			}
		}
		//Эти свойства хоть и различаются не должны выводиться в таблице
		model.iprops = Object.keys(item_props) //Различия позиций в модели
		//model.model_props = Object.keys(model_props)
		//console.log(model)
		
	}
	for (const model of list) {  //Для таблицы в карточке товара
		for (const item of model.items) {
			Object.defineProperty(item, 'toString', {
				value: () => item.brendart[0],
				enumerable: false, // ключевое свойство - не перечисляемое
				writable: true,
				configurable: true
			})
		}
		Object.defineProperty(model, 'toString', {
			value: () => model.recap.brendmodel[0],
			enumerable: false, // ключевое свойство - не перечисляемое
			writable: true,
			configurable: true
		})
	}
	return list
}

Shop.getBrendmodelByBrendart = Access.poke(async (db, brendart_nick) => {
	const bind = await Shop.getBind(db)
	const key = await Shop.getValueByNick(db, brendart_nick)
	if (!key) return false
	const key_id = key.value_id

	const brendmodel_nick = await db.col(`
		select mva.value_nick
		from 
			sources_wcells win, 
			sources_wvalues wva,
			sources_values mva
				
		WHERE win.entity_id = ${bind.brendart_prop_id}
		and mva.value_id = wva.value_id
		and wva.key_id = win.key_id and wva.entity_id = win.entity_id and wva.prop_id = win.prop_id
		and win.prop_id = ${bind.brendmodel_prop_id}
		and win.key_id = :key_id
	`, {key_id})

	return brendmodel_nick
})
Shop.getItemByBrendart = async (db, brendart_nick, partner) => {
	const model = await Shop.getModelByBrendart(db, brendart_nick, partner)
	if (!model) return false
	return model.items.find(item => item.brendart[0] == brendart_nick)
}
Shop.getModelByBrendart = async (db, brendart_nick, partner) => {
	const brendmodel_nick = await Shop.getBrendmodelByBrendart(db, brendart_nick)
	if (!brendmodel_nick) return false
	const model = await Shop.getModelByBrendmodel(db, brendmodel_nick, partner)
	return model
}
Shop.getModelByBrendmodel = async (db, brendmodel_nick, partner) => {
	const bind = await Shop.getBind(db)
	const value = await Shop.getValueByNick(db, brendmodel_nick)
	if (!value) return false

	const conf = await config('shop')
	const group_id = await Shop.getGroupIdByNick(db, conf.root_nick) //Проверка доступа
	//const group_ids = await Shop.getAllGroupIds(db)
	let moditem_ids = await db.all(`
		SELECT 
			wva.value_id, 
			GROUP_CONCAT(distinct wva.key_id separator ',') as key_ids,
			GROUP_CONCAT(distinct mig.group_id separator ',') as group_ids
		FROM shop_itemgroups mig, sources_wvalues wva, shop_allitemgroups ig
		WHERE mig.key_id = wva.key_id and wva.value_id = ${value.value_id} and wva.entity_id = ${bind.brendart_prop_id} and wva.prop_id = ${bind.brendmodel_prop_id}
		and ig.key_id = wva.key_id and ig.group_id = ${group_id}
		GROUP BY wva.value_id 
	`)	
	if (!moditem_ids.length) return false


	
	// const conf = await config('shop')
	// const root_id = await Shop.getGroupIdByNick(db, conf.root_nick) || null
	// for (const pos of moditem_ids) {
	// 	if (pos.nest) break
	// 	const group_ids = pos.group_ids.split(',')
	// 	for (const group_id of group_ids) {
	// 		if (await Shop.isNest(db, group_id, root_id)) {
	// 			pos.nest = true
	// 			break
	// 		}
	// 	}
	// }
	// moditem_ids = moditem_ids.filter(pos => pos.nest)


	// const {from, join, where, sort} = await Shop.getWhereBySamplesWinMod(db, [{brendmodel:{[brendmodel_nick]:1}}], [], partner)
	
	// const moditem_ids = await db.all(`
	// 	SELECT wva.value_id, GROUP_CONCAT(win.key_id separator ',') as key_ids 
	// 	FROM ${from.join(', ')} ${join.join(' ')}
	// 	WHERE ${where.join(' and ')}
	// 	GROUP BY wva.value_id 
	// `, bind)

	const list = await Shop.getModelsByItems(db, moditem_ids, partner)
	const model = list[0]

	return model
}
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

Shop.prepareFiles = (model) => {
	const names = ['images', 'texts', 'files', 'videos']
	for (const item of model.items) {
		for (const name of names) {
			if (!item[name]) continue
			item[name] = item[name].map(val => val.replaceAll('&#44;', ','))
		}
		
	}
}
Shop.prepareCost = (model, partner) => {
	if (partner.cost) {
		const change = model => {
			if (!model[partner.cost_nick] || partner.cost_nick == 'cena') {
				return //нет подмены
			}
			
			model['staraya-cena'] ??= model['cena']
			
			model['cena'] = model[partner.cost_nick]

			//Скидка зависит от источника, бренда и хз, где всязть скидки? partner глобальный.
			//delete model[partner.cost]
		}
		change(model)
		if (model.items) for (const item of model.items) {
			change(item)
		}
	}
	// if (partner.discount) { //Может быть и свойство и скидка от свойства, типа от "Оптовой цены" партнёру ещё и скидка к ней
	// 	for (const item of model.items) {
	// 		item['staraya-cena'] ??= item['cena']
	// 		item['cena'] = item['cena'].map(number => Math.round(number * (100 - partner.discount) / 100))
	// 	}
	// }	
	for (const item of model.items) {
		if (!item['cena'] || item['staraya-cena']?.[0] == item['cena'][0]) delete item['staraya-cena']
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
// Shop.indexGroups = Access.wait(async (db) => {
// 	const topids = await db.colAll(`SELECT group_id from shop_groups where parent_id is null`)
// 	await db.affectedRows(`TRUNCATE shop_itemgroups`)
	
// 	const shop_itemgroups = new BulkInserter(db.pool, 'shop_itemgroups', ['group_id', 'key_id'], 100);
// 	//let count = 0
// 	for (const top_id of topids) {
// 		await Shop.runGroupDown(db, top_id, async ({group_id}) => {
// 			const { list } = await Shop.getFreeKeyIds(db, group_id)
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

// 	//console.log('Сохранены группы позиций indexGroups', count)
// 	//return count
// })
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

Shop.getPlopsWithPropsNoMultiByMd = async (db, group_id, samples = [{}], hashs = [], partner = false, {
		rand = false, 
		add_group_nicks = false, 
		add_group_titles = false, 
		add_group_ids = false, 
		limit = false, nicks = [], titles = []
	}) => {
	// const marked_samples = await Shop.getSamplesUpByGroupId(db, group_id, [md.mget])
	// const {from, join, where, sort} = await Shop.getWhereBySamplesWinMod(db, marked_samples, md.hashs, partner, group_id ? false : true)

	//[md.mget] md.hashs
	titles.push('staraya-cena') //Нужна старая цена зачем?
	if (partner.cost_nick) titles.push(partner.cost_nick)
	titles = unique(titles)

	const {from, join, where, sort} = await Shop.getWhereByGroupIndexWinMod(db, group_id, samples, hashs, partner)	
	
	const bind = await Shop.getBind(db)
	
	//const propids = {}
	
	const cols2 = []
	const join2 = []
	let i = 0

	const addJoin2 = (prop) => {
		i++
		//propids[prop.prop_id] = prop.prop_id
		const prop_id = prop.prop_id /// == 'cena' ? propc.prop_id : prop.prop_id //Подмена цены если есть купон. ЦЕНА пропадёт если нет Цены



		if (prop.type == 'text') {
			join2.push(`
				LEFT JOIN sources_wtexts opa${i} on (
					opa${i}.key_id = win.key_id 
					and opa${i}.entity_id = win.entity_id 
					and opa${i}.prop_id = ${prop_id}
					and opa${i}.multi_index = 0
				)
			`)
		} else if (prop.type == 'number') {
			join2.push(`
				LEFT JOIN sources_wnumbers opa${i} on (
					opa${i}.key_id = win.key_id 
					and opa${i}.entity_id = win.entity_id 
					and opa${i}.prop_id = ${prop_id}
					and opa${i}.multi_index = 0
				)
			`)
		} else if (prop.type == 'value') {
			join2.push(`
				LEFT JOIN sources_wvalues opa${i} on (
					opa${i}.key_id = win.key_id 
					and opa${i}.entity_id = win.entity_id 
					and opa${i}.prop_id = ${prop_id} 
					and opa${i}.multi_index = 0
				)
				LEFT JOIN sources_values valopa${i} on (valopa${i}.value_id = opa${i}.value_id)
			`)
		} else if (prop.type == 'date') {
			join2.push(`
				LEFT JOIN sources_wdates opa${i} on (
					opa${i}.key_id = win.key_id 
					and opa${i}.entity_id = win.entity_id 
					and opa${i}.prop_id = ${prop_id}
					and opa${i}.multi_index = 0
				)
			`)
		}
	}
	const propc = await Shop.getPropByNick(db, partner.cost_nick || 'cena')

	for (const prop_nick of nicks) {
		const prop = await Shop.getPropByNick(db, prop_nick)
		if (!prop) continue
		//if (prop.multi) continue
		if (prop.type == 'text') continue
		addJoin2(prop)
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
		addJoin2(prop)
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
	
	let list
	if (add_group_nicks || add_group_nicks || add_group_ids) {
		list = await db.all(`
			SELECT 
				-- win.key_id,
				vakey.value_nick as brendart_nick, 
				vamod.value_nick as brendmodel_nick, 
				GROUP_CONCAT(distinct mig.group_id separator ',') as group_ids,
				${cols2.join(',')}
			FROM shop_allitemgroups mig, (${from.join(', ')} ${join.join(' ')})
				LEFT JOIN sources_values vakey on (vakey.value_id = win.key_id)
				LEFT JOIN sources_values vamod on (vamod.value_id = win.value_id)
				${join2.join(' ')}
			WHERE ${where.join(' and ')}		
			and mig.key_id = win.key_id
			GROUP BY win.key_id
			${rand ? 'ORDER BY RAND()' : ''}
			${limit ? 'LIMIT ' + limit : ''}
		`, {group_id, ...bind})		
		for (const row of list) {
			const group_ids = row.group_ids.split(',')
			
			if (add_group_nicks) {
				row.group_nicks = []
				for (const group_id of group_ids) {
					const group = await Shop.getGroupById(db, group_id)
					row.group_nicks.push(group.group_nick)
				}
			}
			if (add_group_titles) {
				row.group_titles = []
				for (const group_id of group_ids) {
					const group = await Shop.getGroupById(db, group_id)
					row.group_titles.push(group.group_title)
				}
			}
			if (add_group_ids) {
				row.group_ids = group_ids
			} else {
				delete row.group_ids
			}
		}
		
	} else {
		list = await db.all(`
			SELECT 
				win.key_id,
				vakey.value_nick as brendart_nick, 
				vamod.value_nick as brendmodel_nick, 
				${cols2.join(',')}
			FROM (${from.join(', ')} ${join.join(' ')})
				LEFT JOIN sources_values vakey on (vakey.value_id = win.key_id)
				LEFT JOIN sources_values vamod on (vamod.value_id = win.value_id)
				${join2.join(' ')}
			WHERE ${where.join(' and ')}		
			${rand ? 'ORDER BY RAND()' : ''}
			${limit ? 'LIMIT ' + limit : ''}
		`, {group_id, ...bind})
	}
	const count = limit ? await db.col(`
		SELECT count(distinct win.value_id)
		FROM (${from.join(', ')} ${join.join(' ')})
		WHERE ${where.join(' and ')}
	`, {group_id, ...bind}) : list.length
	
	for (const prop_nick of titles) {
		const prop = await Shop.getPropByNick(db, prop_nick)
		if (prop.type == 'number' && prop.scale) {
			for (const item of list) {
				const number = item[prop_nick + '_title']
				if (!number) continue
				item[prop_nick + '_title'] = number / 10 ** prop.scale
			}
		}
	}
	if (partner.cost_nick) {
		for (const item of list) {
			if (!item['staraya-cena_title']) item['staraya-cena_title'] = item['cena_title']
			item['cena_title'] = item[partner.cost_nick + '_title']
		}
	}
	return {list, count}
}
// Shop.getGroupIdsBymd = async (db, group_id, md, partner) => {
// 	const bind = await Shop.getBind(db)

// 	const samples = await Shop.getSamplesUpByGroupId(db, group_id)
// 	const marked_samples = Shop.addSamples(samples, [md.mget])
// 	const {from, join, where} = await Shop.getWhereBySamplesWinMod(db, marked_samples, md.hashs, partner)
	
	
// 	const res_ids = await db.colAll(`
// 		SELECT distinct g.group_id 
// 		FROM 
// 			(${from.join(', ')}, shop_itemgroups gi, shop_groups g)
// 			${join.join(' ')}		
// 		WHERE ${where.join(' and ')}
// 		and win.key_id = gi.key_id
// 		and g.group_id = gi.group_id
// 		ORDER BY g.ordain
// 	`, bind)

// 	//Позиция может быть в закрытой группе, тоже и всплывёт закрытая группа
// 	const list = []
// 	for (const group_id of res_ids) {
// 		if (await Shop.isInRootById(db, group_id)) list.push(group_id)
// 	}
// 	return list
// }


Shop.runGroupDown = async (db, group_id, func) => {
	const group = await Shop.getGroupById(db, group_id)
	const r = await func(group)
	if (r != null) return r
	for (const child_nick of group.childs) {
		const child_id = await Shop.getGroupIdByNick(db, child_nick)
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



















Shop.getGroupFilterChilds = async (db, group_id = null) => {
	const conf = await config('shop')
	const childs = await Shop.runGroupUp(db, group_id, group => {
		if (group.group_nick == conf.root_nick) return [...group.child_nicks] //Выше подниматься нельзя
		if (group.child_nicks.length) return [...group.child_nicks]
	})
	// for (const i in childs) {
	// 	childs[i] = await Shop.getGroupById(db, childs[i])
	// }
	return childs
}
// Shop.getModcount = async (db, samples, hashs, group_nick = null, partner) => { 
// 	const bind = await Shop.getBind(db)
// 	const group_id = await Shop.getGroupIdByNick(db, group_nick)
	
// 	const {from, join, where, sort} = await Shop.getWhereByGroupIndexWinMod(db, group_id, samples, hashs, partner)
	
// 	const modcount = await db.col(`
// 		SELECT count(distinct win.value_id)
// 		FROM ${from.join(', ')} ${join.join(' ')}
// 		WHERE ${where.join(' and ')}
// 	`, bind)
// 	return modcount
// }

Shop.getmd = async (db, origm, query = '', hashs = []) => {
	

	const mgetorig = Shop.makemd(origm)
	
	const mget = await Shop.mdfilter(db, mgetorig) //Удалить фильтры свойства и значения, которых не существуют

	const m = Shop.makemark(mget).join(':')
	
	const md = {m, mget, query, hashs}
	//md.toString = () => [md.m, md.query].join(':')
	return md
}

Shop.getFilterConf = async (db, prop_nick, group, md, partner) => {

	const prop = await Shop.getPropByNick(db, prop_nick)
	const bind = await Shop.getBind(db)
	const prop_id = prop.prop_id
	const group_id = group.group_id
	if (!~['value','number'].indexOf(prop.type)) return false
	if (!~['more','column'].indexOf(prop.known)) return false
	

	const limit = 12
	const mget = {...md.mget}
	delete mget[prop_nick]
	const nmd = {m: Shop.makemark(mget).join(':'), mget, query: md.query, hashs: md.hashs}
	
	const wnumbers_where = await Shop.getWhereByGroupIndexWin(db, group_id, [mget], md.hashs, partner, 'sources_wnumbers')
	const wvalues_where = await Shop.getWhereByGroupIndexWin(db, group_id, [mget], md.hashs, partner, 'sources_wvalues')

	const filter = {
		singlechoice: prop.singlechoice,
		prop_nick, 
		tpl: prop.filter_tpl || 'default', 
		scale: prop.scale,
		descr: ''
	}
	

	if (filter.tpl == 'slider') {
		if (prop.type != 'number') return false
		const row = await db.fetch(`
			SELECT min(win.number) as min, max(win.number) as max
			FROM 
				${wnumbers_where.from.join(', ')}
				${wnumbers_where.join.join(' ')}
			WHERE 
				${wnumbers_where.where.join(' and ')}
				and win.prop_id = ${prop_id}
			ORDER BY win.number
		`)
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
				sources_values va,
				${wvalues_where.from.join(', ')} 
				${wvalues_where.join.join(' ')}
			WHERE 
				${wvalues_where.where.join(' and ')}				
				and win.prop_id = ${prop_id}
				and va.value_id = win.value_id
			ORDER BY va.value_title
			LIMIT ${limit}
		`)

	} else if (prop.type == 'number') {
		filter.values = await db.colAll(`
			SELECT distinct win.number
			FROM 
				${wnumbers_where.from.join(', ')} 
				${wnumbers_where.join.join(' ')}
			WHERE 
				${wnumbers_where.where.join(' and ')}
				and win.prop_id = ${prop_id}
			ORDER BY win.number
			LIMIT ${limit}
		`)
	}
	filter.havemore = filter.values.length >= limit
	
	const selected = typeof(md.mget[prop_nick]) == 'object' ? md.mget[prop_nick] : false
	const values_nicks = Object.keys(selected || {})	
	for (const value_nick of values_nicks) {
		if (filter.values.some(v => v == value_nick)) continue
		filter.values.push(value_nick)
	}
	if (!selected && filter.values.length < 1) return false
	//if (!selected && filter.havemore) return false
	return filter
}







// Shop.getWhereByGroupIndex = async (db, group_id, partner, samples = [], hashs = []) => {
// 	//win.key_id - позиция, wva.value_id - модель
// 	const from = ['sources_wvalues wva, sources_wcells win']
// 	const join = []
// 	const where = [`
// 		win.entity_id = :brendart_prop_id and win.prop_id = :brendmodel_prop_id 
// 		and wva.entity_id = win.entity_id and wva.prop_id = win.prop_id and wva.key_id = win.key_id
// 	`]
// 	if (hashs.length) {
// 		from.unshift('sources_witems wit')
// 		where.push('wit.entity_id = win.entity_id and wit.key_id = win.key_id')
// 		where.push('(' + hashs.map(hash => 'wit.search like "% ' + hash.join('%" and wit.search like "% ') + '%"').join(' or ')+')' || '1 = 1')
// 	}

// 	let sort = ['win.source_id, win.sheet_index, win.row_index, win.col_index, wva.multi_index']

// 	//Находим позиции группы
// 	const group_ids = []
// 	await Shop.runGroupDown(db, group_id, (child) => {
// 		group_ids.push(child.group_id)
// 	})
// 	if (group_ids.length) {
// 		from.push('shop_itemgroups ig')
// 		where.push('ig.key_id = win.key_id')	
// 		where.push(`ig.group_id in (${group_ids.join(',')})`)
// 	}


// 	const whereor = []
// 	let i = 0

// 	for (const sample of samples) { //OR

// 		const whereand = []
// 		for (const prop_nick in sample) {
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
// 			} else if (prop.type == 'number') {
// 				if (prop_nick == 'cena') {
// 					const {prop_id} = partner?.cost_nick ? await Shop.getPropByNick(db, partner?.cost_nick) : prop  //Подмена цены
// 					join.push(`
// 						LEFT JOIN sources_wnumbers da${i} ON (
// 							da${i}.entity_id = win.entity_id 
// 							and da${i}.key_id = win.key_id 
// 							and da${i}.prop_id = ${prop_id || 0}
// 						)
// 					`)
// 				} else {
// 					join.push(`
// 						LEFT JOIN sources_wnumbers da${i} ON (
// 							da${i}.entity_id = win.entity_id 
// 							and da${i}.key_id = win.key_id 
// 							and da${i}.prop_id = ${prop.prop_id || 0}
// 						)
// 					`)
// 				}
// 			} else if (prop.type == 'text') {
// 				join.push(`
// 					LEFT JOIN sources_wtexts da${i} ON (
// 						da${i}.entity_id = win.entity_id 
// 						and da${i}.key_id = win.key_id 
// 						and da${i}.prop_id = ${prop.prop_id || 0}
// 					)
// 				`)
// 			} else {
				
// 			}
// 			if (typeof(sample[prop_nick]) == 'object') { //Значение не объект
// 				if (prop.type == 'value') {
					
// 					const value_ids = []
// 					for (const value_nick in sample[prop_nick]) {
// 						const value = await Shop.getValueByNick(db, value_nick)
// 						value_ids.push(value?.value_id || 0)
// 					}
// 					if (value_ids.length) { //У позиции с мульти значениями может совпать два значения и будет дубль
// 						whereand.push(`
// 							da${i}.value_id in (${value_ids.join(', ')})
// 						`)
// 					} else {
// 						whereand.push(`1=0`)
// 					}
// 				} else if (prop.type == 'number') {

// 					const isdiscost = partner?.discount && prop_nick == 'cena'
// 					const disCost = isdiscost ? number => Math.round(number * (100 + partner.discount) / 100) : number => number
						
// 					if (sample[prop_nick]['upto'] || sample[prop_nick]['from']) {
// 						sort = []
// 						if (sample[prop_nick]['upto']) {
// 							const number = disCost(sample[prop_nick]['upto'])
// 							whereand.push(`da${i}.number <= ${number}`)
// 							sort.push(`da${i}.number DESC`)
// 						}
// 						if (sample[prop_nick]['from']) {
// 							const number = disCost(sample[prop_nick]['from'])
// 							whereand.push(`da${i}.number >= ${number}`)
// 							sort.push(`da${i}.number ASC`)
// 						}
// 					} else {
// 						const numbers = Object.keys(sample[prop_nick]).map(number => disCost(number))
// 						if (numbers.length) {
// 							whereand.push(`
// 								da${i}.number in (${numbers.join(', ')})
// 							`)
// 						} else {
// 							whereand.push(`1=0`)
// 						}
// 					}	
// 				} else { //Неизвестный prop.type
// 					where.push(`1=0`) //что делать если в sample не существующее свойство, должно быть найдено 0
// 				}
// 			} else { //Значение не объект
// 				if (prop.type == 'value') {
					
// 					if (sample[prop_nick] == 'any') {
// 						// whereand.push(`
// 						// 	da${i}.value_id is not null
// 						// `)
// 						whereand.push(`
// 							da${i}.multi_index = 0
// 						`)
// 					} else if (sample[prop_nick] == 'empty') {

// 						whereand.push(`
// 							da${i}.value_id is null
// 						`)
// 					}
// 				} else if (prop.type == 'number') {

// 					if (sample[prop_nick] == 'any') {
// 						// whereand.push(`
// 						// 	da${i}.number is not null
// 						// `)
// 						whereand.push(`
// 							da${i}.multi_index = 0
// 						`)
// 					} else if (sample[prop_nick] == 'empty') {
// 						whereand.push(`
// 							da${i}.number is null
// 						`)
// 					} else {
// 						where.push(`1=0`)
// 					}
// 				} else if (prop.type == 'text') {

// 					if (sample[prop_nick] == 'any') {
// 						// whereand.push(`
// 						// 	da${i}.text is not null
// 						// `)
// 						whereand.push(`
// 							da${i}.multi_index = 0
// 						`)
// 					} else if (sample[prop_nick] == 'empty') {
// 						whereand.push(`
// 							da${i}.text is null
// 						`)
// 					} else {
// 						where.push(`1=0`)
// 					}
// 				} else {
// 					where.push(`1=0`)
// 				}
// 			}
// 		}
// 		if (whereand.length) whereor.push(whereand.join(` and `))
// 	}
// 	if (whereor.length)	where.push(`((${whereor.join(') or (')}))`)
	
// 	return {from, join, where, sort}
// }
Shop.addWhereSamples = async (db, from, join, where, samples, hashs, partner, emptydef = false) => {
	if (hashs.length) {
		from.unshift('sources_witems wit')
		where.push('wit.entity_id = win.entity_id and wit.key_id = win.key_id')
		where.push('(' + hashs.map(hash => 'wit.search like "% ' + hash.join('%" and wit.search like "% ') + '%"').join(' or ')+')' || '1 = 1')
	}
	let sort = []
	const whereor = []
	let i = 0

	for (const sample of samples) { //OR
		
		const whereand = []
		for (const prop_nick in sample) {
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
			if (typeof(sample[prop_nick]) == 'object') {
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

					// const isdiscost = partner?.discount && prop_nick == 'cena'
					// const disCost = isdiscost ? number => Math.round(number * (100 + partner.discount) / 100) : number => number
					const disCost = number => number
						
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
	else if (emptydef) where.push(`1=0`)

	return sort
}
// Shop.getWhereBySamplesWin = async (db, samples, hashs = [], partner = '', wintable) => {
// 	//win.key_id - позиция
// 	//const from = ['sources_wvalues win']
// 	const from = [wintable + ' win']
// 	const join = []
// 	const where = [`win.entity_id = :brendart_prop_id`]
// 	if (hashs.length) {
// 		from.unshift('sources_witems wit')
// 		where.push('wit.entity_id = win.entity_id and wit.key_id = win.key_id')
// 		where.push('(' + hashs.map(hash => 'wit.search like "% ' + hash.join('%" and wit.search like "% ') + '%"').join(' or ')+')' || '1 = 1')
// 	}

// 	let sort = []

// 	await Shop.addWhereSamples(db, from, join, where, sort, samples, hashs, partner)
	
// 	return {from, join, where, sort}
// }

Shop.getWhereByGroupIndexWin = async (db, group_id, samples = [], hashs = [], partner, wintable) => {
	//win.key_id - позиция, wva.value_id - модель
	const bind = await Shop.getBind(db)
	const from = [`shop_allitemgroups ig, ${wintable} win`]
	
	const join = []
	const where = [`win.entity_id = ${bind.brendart_prop_id}`]
	


	//Находим позиции группы
	where.push('ig.key_id = win.key_id')	

	// const group_ids = await Shop.getAllGroupIds(db, group_id)
	// where.push(`ig.group_id in (${group_ids.join(',')})`)
	where.push(`ig.group_id = ${group_id}`)

	const sort = await Shop.addWhereSamples(db, from, join, where, samples, hashs, partner)
	
	return {from, join, where, sort}
}


Shop.getWhereByGroupIndexWinMod = async (db, group_id, samples = [], hashs = [], partner) => {
	//win.key_id - позиция, win.value_id - модель
	const bind = await Shop.getBind(db)
	const from = ['shop_allitemgroups ig, sources_wvalues win']
	//const from = ['shop_itemgroups ig, sources_wvalues win']
	const join = []
	const where = [`win.entity_id = ${bind.brendart_prop_id} and win.prop_id = ${bind.brendmodel_prop_id}`]
	


	//Находим позиции группы
	where.push('ig.key_id = win.key_id')	
	
	//const group_ids = await Shop.getAllGroupIds(db, group_id)
	//where.push(`ig.group_id in (${group_ids.join(',')})`)

	where.push(`ig.group_id = ${group_id}`)
	
	
	const sort = await Shop.addWhereSamples(db, from, join, where, samples, hashs, partner)

	return {from, join, where, sort}
}
Shop.getWhereByGroupIndexSort = async (db, group_id, samples = [], hashs = [], partner) => {
	//win.key_id - позиция, wva.value_id - модель
	const from = ['sources_sources so, sources_wcells wce, shop_allitemgroups ig, sources_wvalues win']
	const bind = await Shop.getBind(db)
	const cena = await Shop.getPropByNick(db, 'cena')
	const image = await Shop.getPropByNick(db, 'images')
	const join = []
	join.push(`left join sources_wnumbers cena on (cena.entity_id = win.entity_id and cena.key_id = win.key_id and cena.prop_id = ${cena.prop_id}) and cena.multi_index = 0`)
	join.push(`left join sources_wtexts image on (image.entity_id = win.entity_id and image.key_id = win.key_id and image.prop_id = ${image.prop_id} and image.multi_index = 0)`)
	const where = [`
		wce.source_id = so.source_id
		
		and wce.entity_id = ${bind.brendart_prop_id} 
		and wce.prop_id = ${bind.brendmodel_prop_id}
		

		and win.entity_id = wce.entity_id 
		and win.key_id = wce.key_id
		and win.prop_id = wce.prop_id 

		and wce.key_id = ig.key_id
		and ig.group_id = ${group_id}
	`]
	

	//Сортируем по месту нахождения модели
	

	//Находим позиции группы
	
	
	
	// const group_ids = await Shop.getAllGroupIds(db, group_id)
	// where.push(`ig.group_id in (${group_ids.join(',')})`)
	//where.push(`ig.group_id = :group_id`)
	
	const sort = await Shop.addWhereSamples(db, from, join, where, samples, hashs, partner)
	let sortsel = []
	
	// if (!sort.length) {	
	// 	//sortsel.push('min(CONCAT((so.ordain + 99), (wce.sheet_index + 99), (wce.row_index + 999))) as sortkey')
	// 	//sort.push('sortkey')
	// }
	sort.push('SIGN(image.text) DESC, SIGN(cena.number) DESC, so.ordain, wce.sheet_index, wce.row_index')
	return {from, join, where, sort, sortsel}
}
// Shop.getWhereBySamplesSort = async (db, samples, hashs = [], partner = '') => {
// 	//fulldef false значит без выборки ничего не показываем, partner нужен чтобы выборка по цене была по нужному ключу
// 	//win.key_id - позиция, wva.value_id - модель
// 	const from = ['sources_wvalues wva, sources_sources so, sources_wcells win']
// 	const join = []
// 	const where = [`
// 		win.entity_id = :brendart_prop_id and win.prop_id = :brendmodel_prop_id 
// 		and win.source_id = so.source_id
// 		and wva.entity_id = win.entity_id and wva.prop_id = win.prop_id and wva.key_id = win.key_id
// 	`]
// 	let sort = ['so.ordain, win.sheet_index, win.row_index, win.col_index, wva.multi_index']
// 	await Shop.addWhereSamples(db, from, join, where, sort, samples, hashs, partner)
// 	return {from, join, where, sort}
// }
// Shop.getWhereBySamplesWinMod = async (db, samples, hashs = [], partner = '') => {
// 	//win.key_id - позиция, win.value_id - модель
// 	const from = ['sources_wvalues win']
// 	const join = []
// 	const where = [`
// 		win.entity_id = :brendart_prop_id and win.prop_id = :brendmodel_prop_id and win.multi_index = 0
// 	`]

// 	let sort = [] //'win.source_id, win.sheet_index, win.row_index, win.col_index'

// 	await Shop.addWhereSamples(db, from, join, where, sort, samples, hashs, partner)
// 	return {from, join, where, sort}
// }

// Shop.getWhereItemsBySamples = async (db, samples, hashs = [], partner = '', fulldef = false) => { //fulldef false значит без выборки ничего не показываем, partner нужен чтобы выборка по цене была по нужному ключу
// 	//win.key_id - позиция, wva.value_id - модель
// 	const from = ['sources_wcells win']
// 	const join = []
// 	const where = [`
// 		win.entity_id = :brendart_prop_id
// 	`]
// 	if (hashs.length) {
// 		from.unshift('sources_witems wit')
// 		where.push('wit.entity_id = win.entity_id and wit.key_id = win.key_id')
// 		where.push('(' + hashs.map(hash => 'wit.search like "% ' + hash.join('%" and wit.search like "% ') + '%"').join(' or ')+')' || '1 = 1')
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
// Shop.getWhereByGroupId = async (db, group_id = false, hashs = [], partner = false, fulldef = false) => { //depricated
// 	const bind = await Shop.getBind(db)
// 	const samples = await Shop.getSamplesUpByGroupId(db, group_id)

// 	const {from, join, where, sort} = await Shop.getWhereBySamplesWinMod(db, samples, hashs, partner, fulldef)
// 	return {from, join, where, sort, bind}
// }


Shop.getFreeGroupNicksByBrendartNick = async (db, brendart_nick) => {
	const value = await Shop.getValueByNick(db, brendart_nick)
	if (!value) return []
	//Позиции могли попасть в неразмещённые группы
	const list = await db.all(`
		select gr.group_id, gr.group_nick from shop_itemgroups ig, shop_groups gr
		where gr.group_id = ig.group_id and ig.key_id = ${value.value_id}
	`)
	const group_nicks = []
	for (const {group_nick, group_id} of list) {
		if (!await Shop.isInRootById(db, group_id)) continue
		group_nicks.push(group_nick)
	}
	return group_nicks
}

