import Access from "/-controller/Access.js"
import Shop from "/-shop/Shop.js"
import config from '/-config'
import nicked from '/-nicked'

const ShopAdmin = {}
export default ShopAdmin


const calcPositions = async (db, group_id) => {
	const bind = await Shop.getBind(db)
	const samples = await Shop.getSamplesUpByGroupId(db, group_id)	
	const {from, join, where} = await Shop.getWhereBySamples(db, samples)
	const count = await db.col(`
		SELECT count(distinct win.key_id)
		FROM ${from.join(', ')} ${join.join(' ')}
		WHERE ${where.join(' and ')}
	`, bind)
	return count
}
const calcModels = async (db, group_id) => {
	const bind = await Shop.getBind(db)
	const samples = await Shop.getSamplesUpByGroupId(db, group_id)	
	const {from, join, where} = await Shop.getWhereBySamples(db, samples)
	const count = await db.col(`
		SELECT count(distinct wva.value_id)
		FROM ${from.join(', ')} ${join.join(' ')}
		WHERE ${where.join(' and ')}
	`, bind)
	return count
}
const calcBrands = async (db, group_id) => {
	const samples = await Shop.getSamplesUpByGroupId(db, group_id)
	const bind = await Shop.getBind(db)
	const {from, join, where} = await Shop.getWhereBySamples(db, samples)
	const prop = await Shop.getPropByNick(db, 'brend')
	if (!prop) return -1
	const count = await db.col(`
		SELECT count(distinct br.value_id)
		FROM ${from.join(', ')} ${join.join(' ')}
		left join sources_wvalues br on (br.entity_id = :brendart_prop_id and br.key_id = win.key_id and br.prop_id = :prop_id)
		WHERE ${where.join(' and ')}
	`, {...bind, ...prop})
	return count
}
const calcSources = async (db, group_id) => {
	const samples = await Shop.getSamplesUpByGroupId(db, group_id)
	const bind = await Shop.getBind(db)
	const {from, join, where} = await Shop.getWhereBySamples(db, samples)
	const prop = await Shop.getPropByNick(db, 'istochnik')
	if (!prop) return -1
	const count = await db.col(`
		SELECT count(distinct br.value_id)
		FROM ${from.join(', ')} ${join.join(' ')}
		left join sources_wvalues br on (br.entity_id = :brendart_prop_id and br.key_id = win.key_id and br.prop_id = :prop_id)
		WHERE ${where.join(' and ')}
	`, {...bind, ...prop})
	return count
}
const calcDateContent = async (db, group_id) => {
	const samples = await Shop.getSamplesUpByGroupId(db, group_id)
	const bind = await Shop.getBind(db)
	const {from, join, where} = await Shop.getWhereBySamples(db, samples)
	const date_content = await db.col(`
		SELECT UNIX_TIMESTAMP(min(so.date_content))
		FROM ${from.join(', ')} ${join.join(' ')}
		left join sources_sources so on (so.source_id = win.source_id)
		WHERE ${where.join(' and ')}
	`, bind)
	return date_content
}
const calcGroups = async (db, group_id) => {
	const group = await Shop.getGroupById(db, group_id)
	return group.childs.length
}
const calcSubgroups = async (db, group_id) => {
	const group = await Shop.getGroupById(db, group_id)
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

	const samples = await Shop.getSamplesUpByGroupId(db, group_id)
	const {from, join, where} = await Shop.getWhereBySamples(db, samples)

	let i = 0
	for (const prop_title of prop_titles) {
		i++
		const { prop_id } = await Shop.getPropByNick(db, nicked(prop_title))
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

	let groupids = []
	await Shop.runGroupDown(db, group_id, (child) => {
		groupids.push(child.group_id) //Список групп чьи фильтры надо удовлетворить
	})


	const samples = await Shop.getSamplesUpByGroupId(db, group_id)
	const {from, join, where} = await Shop.getWhereBySamples(db, samples)

	let i = 0
	for (const prop_title of prop_titles) {
		i++
		const { prop_id } = await Shop.getPropByNick(db, nicked(prop_title))
		join.push(`left join sources_wcells w${i} on (w${i}.entity_id = :brendart_prop_id and w${i}.key_id = win.key_id and w${i}.prop_id = ${prop_id})`)
		where.push(`w${i}.key_id is not null`)
	}


	const rows = (await db.all(`
		SELECT win.key_id, pr.prop_nick, nvl(wnum.number, val.value_nick) as nick
		FROM ${from.join(', ')} ${join.join(' ')}
			LEFT JOIN sources_wcells win2 on (win2.entity_id = win.entity_id and win2.key_id = win.key_id)
			LEFT JOIN sources_props pr on (pr.prop_id = win2.prop_id)
			LEFT JOIN sources_wnumbers wnum on (wnum.entity_id = win.entity_id and wnum.key_id = win.key_id and wnum.prop_id = win2.prop_id)
			LEFT JOIN sources_wvalues wval on (wval.entity_id = win.entity_id and wval.key_id = win.key_id and wval.prop_id = win2.prop_id)
			LEFT JOIN sources_values val on (val.value_id = wval.value_id)
		WHERE ${where.join(' and ')} and (wnum.number is not null or wval.value_id is not null)
	`, bind))


	const list = Object.groupBy(rows, ({ key_id }) => key_id)
	
	let count = 0
	for (const key_id in list) {
		list[key_id] = Object.groupBy(list[key_id], ({ prop_nick }) => prop_nick)
		for (const prop_nick in list[key_id]) {
			list[key_id][prop_nick] = list[key_id][prop_nick].map(row => row.nick)
		}
		const item = list[key_id] //Снимок позиции
		const ids = (await Shop.getGroupIdsByItem(db, item)).filter(id => ~groupids.indexOf(id))
		count++
		for (const group_id of ids) {
			const top_id = await Shop.runGroupUp(db, group_id, async group => {
				if (group.self_filters) return group.group_id
			})
			if (!top_id) continue
			//const group = await Shop.getGroupById(db, top_id)
			//if (!group.self_filters) continue
			const filters = await ShopAdmin.getFiltersByGroupId(db, top_id)
			if (filters.some(prop_nick => !item[prop_nick])) { //Какого-то фильтра, для какой-то группы нет
				count--
				break;
			}
		}
	}
	
	return count
}

// ShopAdmin.getStatRow = Access.wait(async (db) => {
	
// })
ShopAdmin.getGroupStat = Access.poke(async (db, group_id) => {
	const bind = await Shop.getBind(db)

	const row = {}	
	
	row.positions = await calcPositions(db, group_id)
	row.models = await calcModels(db, group_id)
	row.groups = await calcGroups(db, group_id)
	row.subgroups = await calcSubgroups(db, group_id) - row.groups

	row.brands = await calcBrands(db, group_id)
	row.filters = await calcFilters(db, group_id)	
	row.sources = await calcSources(db, group_id)

	row.date_content = await calcDateContent(db, group_id)

	row.withall = await calcWithFilters(db, group_id, ['Цена', 'images', 'Описание', 'Наименование'])	

	row.withfilters = await calcWithFilters(db, group_id)
	row.withcost = await calcWith(db, group_id, ['Цена'])
	row.withimage = await calcWith(db, group_id, ['images'])
	row.withdescription = await calcWith(db, group_id, ['Описание'])
	row.withname = await calcWith(db, group_id, ['Наименование'])

	return row
})
ShopAdmin.setGroupStats = async (db) => {
	const group_ids = await db.colAll(`
		SELECT group_id
		FROM shop_groups
		ORDER BY ordain
	`)
	//const ym = ShopAdmin.getNowYM()
	const pym = ShopAdmin.getPrevYM()
	const rows = await db.all(`
		select * from shop_stat where year = :year and month = :month
	`, pym)
	for (const group_id of group_ids) {	
		if (rows.some(row => row.group_id == group_id)) continue
		const row = await ShopAdmin.getGroupStat(db, group_id)
		const keys = Object.keys(row).filter(name => !~['date_content'].indexOf(name))
		await db.exec(`
			INSERT INTO shop_stat (group_id,date_content,${Object.keys(pym).join(',')},${keys.join(',')})
			VALUES (:group_id,FROM_UNIXTIME(:date_content), :${Object.keys(pym).join(',:')},:${keys.join(',:')})
		`, {group_id, ...pym, ...row})
		console.log(group_id, 'Статистика записана', pym)
	}
	
}
ShopAdmin.getGroupStats = async (db, group_id) => {
	const row = await ShopAdmin.getGroupStat(db, group_id)
	const rows = await db.all(`select *, UNIX_TIMESTAMP(date_content) as date_content from shop_stat WHERE group_id = :group_id order by year DESC, month DESC`, {group_id})
	const ym = ShopAdmin.getNowYM()
	rows.unshift({...ym, ...row})
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
ShopAdmin.getFiltersByGroupId = Access.poke(async (db, group_id) => {
	if (!group_id) return []
	const group = await Shop.getGroupById(db, group_id)
	if (!group.self_filters) return Shop.getFiltersByGroupId(db, group.parent_id)
	const filters = await db.colAll(`
		SELECT fi.prop_nick FROM shop_filters fi
		WHERE fi.group_id = :group_id
	`, {group_id})
	/*
		[prop_nick]
	*/
	return filters
})
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

ShopAdmin.getFreeTable = async (db, group_id = null, hashs = []) => {
	const ans = {poscount:0, modcount:0, head: [], rows:[]}

	// 


	// const samples = await Shop.getSamplesUpByGroupId(db, group_id)
	// const gw = await Shop.getWhereBySamples(db, samples, hashs, false, group_id ? false : true) //Если корень и нет samples то вязть всё, если группа и нет samples то пусто

	// const childs = group_id ? (await Shop.getGroupById(db, group_id)).childs : await db.colAll(`select group_id from shop_groups where parent_id <=> :group_id`, {group_id})
	
	// let childsamples = []
	// for (const child_id of childs) { //Исключаем позиции подгрупп
	// 	const child = await Shop.getGroupById(db, child_id)
	// 	const marks = []		
	// 	const samples = await Shop.getSamplesByGroupId(db, child_id)
	// 	//if (samples.length)	
	// 	childsamples.push(...samples)

	// }

	// /*
	// 	Выборка позиций samples (всё кроме указанного)
	// 	Надо из этой выборки исключить childsamples
	// */
	// const cw = await Shop.getWhereBySamples(db, childsamples, hashs, false, false)	
	
	const {list, poscount, modcount} = await Shop.getFreeKeyIds(db, group_id, hashs, 100)
	
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
ShopAdmin.getItems = async (db, itemids) => {
	if (!itemids.length) return []
	const bind = await Shop.getBind(db)
	const itemprops = await db.all(`
		SELECT 
			win.key_id,
			pr.prop_id,
			nvl(va.value_title, wn.number) as value_title
		FROM sources_props pr, sources_wcells win
			left join sources_wvalues wv on (wv.entity_id = win.entity_id and wv.key_id = win.key_id and wv.prop_id = win.prop_id)
			left join sources_values va on (va.value_id = wv.value_id) 
			left join sources_wnumbers wn on (wn.entity_id = win.entity_id and wn.key_id = win.key_id and wn.prop_id = win.prop_id)
			
		WHERE win.entity_id = :brendart_prop_id
			and pr.prop_id = win.prop_id
			and (wn.number is not null or wv.value_id is not null)
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
			sources_props pr
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