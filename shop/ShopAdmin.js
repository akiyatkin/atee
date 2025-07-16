import Access from "/-controller/Access.js"
import Shop from "/-shop/api/Shop.js"
import config from '/-config'
import nicked from '/-nicked'

const ShopAdmin = {}
export default ShopAdmin


const calcInpositions = async (db) => {
	const bind = await Shop.getBind(db)
	const groupids = await db.colAll(`
		select group_id
		FROM shop_groups where parent_id is null
	`)
	const samples = []
	
	for (const group_id of groupids) {
		const groupsamples = await Shop.getSamples(db, group_id)
		// const {from, join, where} = await Shop.getWhereBySamples(db, groupsamples)
		// const count = await db.col(`
		// 	SELECT count(distinct win.key_id)
		// 	FROM ${from.join(', ')} ${join.join(' ')}
		// 	WHERE ${where.join(' and ')}
		// `, bind)
		// if (!count) continue
		
		samples.push(...groupsamples)
	}
	const {from, join, where} = await Shop.getWhereBySamples(db, samples)
	const count = await db.col(`
		SELECT count(distinct win.key_id)
		FROM ${from.join(', ')} ${join.join(' ')}
		WHERE ${where.join(' and ')}
	`, bind)
	return count
}
const calcBrands = async (db) => {
	const samples = await Shop.getSamplesByGroupId(db, false)
	const bind = await Shop.getBind(db)
	const {from, join, where} = await Shop.getWhereBySamples(db, samples)
	const count = await db.col(`
		SELECT count(distinct br.value_id)
		FROM ${from.join(', ')} ${join.join(' ')}
		left join sources_wvalues br on (br.entity_id = :pos_entity_id and br.key_id = win.key_id and br.prop_id = :brand_entity_id)
		WHERE ${where.join(' and ')}

	`, bind)


	return count
}
const calcGroups = async (db) => {
	const bind = await Shop.getBind(db)
	const groupids = await db.colAll(`
		select group_id
		FROM shop_groups
	`)
	const samples = []
	let groups = 0
	for (const group_id of groupids) {
		const groupsamples = await Shop.getSamples(db, group_id)
		const {from, join, where} = await Shop.getWhereBySamples(db, groupsamples)
		const count = await db.col(`
		 	SELECT count(distinct win.key_id)
		 	FROM ${from.join(', ')} ${join.join(' ')}
		 	WHERE ${where.join(' and ')}
		`, bind)
		if (!count) continue
		groups++
	}
	return groups
}
const calcFilters = async (db) => {
	

	const bind = await Shop.getBind(db)
	const groups = await db.all(`
		select group_id
		FROM shop_groups
	`)
	const samples = []

	for (const group of groups) {
		group.samples = await Shop.getSamples(db, group.group_id)
		const {from, join, where} = await Shop.getWhereBySamples(db, group.samples)
		group.count = await db.col(`
		 	SELECT count(distinct win.key_id)
		 	FROM ${from.join(', ')} ${join.join(' ')}
		 	WHERE ${where.join(' and ')}
		`, bind)
	}
	const groupids = groups.filter(group => group.count).map(group => group.group_id)
	const count = groupids.length ? await db.col(`
		select count(distinct fi.prop_nick) from shop_filters fi
		where fi.group_id in (${groupids.join(',')})
	`, bind) : 0
	
	return count
}
const calcWith = async (db, prop_titles) => {
	const samples = await Shop.getSamplesByGroupId(db, false)
	const bind = await Shop.getBind(db)
	const {from, join, where} = await Shop.getWhereBySamples(db, samples)
	let i = 0
	for (const prop_title of prop_titles) {
		i++
		const { prop_id } = await Shop.getPropByNick(db, nicked(prop_title))
		join.push(`left join sources_winners w${i} on (w${i}.entity_id = :pos_entity_id and w${i}.key_id = win.key_id and w${i}.prop_id = ${prop_id})`)
		where.push(`w${i}.key_id is not null`)
	}
	const count = await db.col(`
		SELECT count(distinct win.key_id)
		FROM ${from.join(', ')} ${join.join(' ')}
		WHERE ${where.join(' and ')}
	`, bind)


	return count
}
const calcWithFilters = async (db) => {
	const bind = await Shop.getBind(db)
	const groupids = await db.colAll(`
		select group_id
		FROM shop_groups where parent_id is null
	`)
	const samples = []
	
	for (const group_id of groupids) {
		const groupsamples = await Shop.getSamples(db, group_id)
		samples.push(...groupsamples)
	}
	const {from, join, where} = await Shop.getWhereBySamples(db, samples)
	
	const rows = (await db.all(`
		SELECT win.key_id, pr.prop_nick, wnum.number, val.value_nick
		FROM ${from.join(', ')} ${join.join(' ')}
			LEFT JOIN sources_winners win2 on (win2.entity_id = win.entity_id and win2.key_id = win.key_id)
			LEFT JOIN sources_props pr on (pr.prop_id = win2.prop_id)
			LEFT JOIN sources_wnumbers wnum on (wnum.entity_id = win.entity_id and wnum.key_id = win.key_id and wnum.prop_id = win2.prop_id)
			LEFT JOIN sources_wvalues wval on (wval.entity_id = win.entity_id and wval.key_id = win.key_id and wval.prop_id = win2.prop_id)
			LEFT JOIN sources_values val on (val.value_id = wval.value_id)
		WHERE ${where.join(' and ')}
	`, bind))
	const list = Object.groupBy(rows, ({ key_id }) => key_id)
	let count = 0
	for (const key_id in list) {
		list[key_id] = Object.groupBy(list[key_id], ({ prop_nick }) => prop_nick)
		for (const prop_nick in list[key_id]) {
			list[key_id][prop_nick].forEach(row => {
				delete row.key_id
				delete row.prop_nick
				if (row.number === null) delete row.number
				if (!row.value_id) delete row.value_id
			})
		}
		const snap = list[key_id]
		/*
			snap = {
				'cena':[{value_nick, number}]
			}
		*/
		const group_ids = await Shop.getGroupIdsBySnap(db, snap)
		
		count++
		for (const group_id of group_ids) {

			const group = await Shop.getGroupById(db, group_id)
			if (!group.self_filters) continue
			const filters = await ShopAdmin.getFiltersByGroupId(db, group_id)

			if (filters.some(prop_nick => !snap[prop_nick])) { //Какого-то фильтра, для какой-то группы нет
				count--
				break;
			}
		}
	}
	
	// const list = (await db.all(`
	// 	SELECT win.key_id, GROUP_CONCAT(win2.prop_id SEPARATOR ',') AS prop_ids
	// 	FROM ${from.join(', ')} ${join.join(' ')}
	// 		LEFT JOIN sources_winners win2 on win2.entity_id = win.entity_id and win2.key_id = win.key_id
	// 	WHERE ${where.join(' and ')}
	// 	GROUP BY win.key_id
	// `, bind)).map(row => row.prop_ids = row.prop_ids.split(',').map(v => Number(v)))
	//console.log(list[57])
	/*
		+1. У позиции и получаем список её групп
		2. У группы получаем список фильтров и проверяем указанны ли эти свойства. Если да, то +1
	*/
	return count
}
ShopAdmin.getStatRow = Access.wait(async (db) => {
	const bind = await Shop.getBind(db)

	const row = {}
	row.positions = await db.col(`select count(distinct win.key_id) from sources_winners win where win.entity_id = :pos_entity_id`, bind)
	row.groups = await calcGroups(db)
	row.inpositions = await calcInpositions(db)
	row.infilters = await calcFilters(db)	
	row.inbrands = await calcBrands(db)

	
	row.withfilters = await calcWithFilters(db)
	row.withcost = await calcWith(db, ['Цена'])
	row.withimage = await calcWith(db, ['images'])
	row.withdescription = await calcWith(db, ['Описание'])
	row.withname = await calcWith(db, ['Наименование'])
	row.withall = await calcWith(db, ['Цена', 'images', 'Описание', 'Наименование'])	

	

	return row
})
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

ShopAdmin.getFreeItems = async (db, group_id = false, hashs) => {
	const ans = {poscount:0, modcount:0, head: [], rows:[]}

	const bind = await Shop.getBind(db)


	const samples = await Shop.getAllSamples(db, group_id)
	const gw = await Shop.getWhereBySamples(db, samples, hashs, false, group_id ? false : true) //Если корень и нет samples то вязть всё, если группа и нет samples то пусто
	
	const childs = await Shop.getChilds(db, group_id)
	let childsamples = []
	for (const child of childs) { //Исключаем позиции подгрупп
		const marks = []		
		const samples = await Shop.getSamples(db, child.group_id)
		//if (samples.length)	
		childsamples.push(...samples)
	}
	/*
		Выборка позиций samples (всё кроме указанного)
		Надо из этой выборки исключить childsamples
	*/
	const cw = await Shop.getWhereBySamples(db, childsamples, hashs, false, false)	
	
	const list = await db.colAll(`
		SELECT win.key_id
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
		LIMIT 500
	`, bind)


	ans.poscount = await db.col(`
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
	`, bind)

	if (!ans.poscount) return ans
	ans.modcount = await db.col(`
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
	
	
	const freeitems = await ShopAdmin.getItemsValues(db, list, bind)
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
ShopAdmin.getItemsValues = async (db, itemids, bind) => {
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