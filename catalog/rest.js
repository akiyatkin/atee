import { Meta } from "/-controller/Meta.js"
import { nicked } from "/-nicked/nicked.js"
import { unique } from "/-nicked/unique.js"
import { Access } from "/-controller/Access.js"
import { Catalog } from "/-catalog/Catalog.js"
import { Db } from "/-db/Db.js"

import { rest_live } from './rest_live.js'
export const meta = new Meta()
rest_live(meta)

//const wait = delay => new Promise(resolve => setTimeout(resolve, delay))


meta.addVariable('isdb', async view => {
	const db = await new Db().connect()
	if (!db) return false
	view.after(() => db.release())
	return db
})
meta.addVariable('db', async view => {
	const { isdb } = await view.gets(['isdb'])
	if (isdb) return isdb
	return view.err('Нет соединения с базой данных')
})

meta.addFunction('int', (view, n) => Number(n))
meta.addFunction('string', (view, n) => String(n))
meta.addFunction('array', (view, n) => n ? n.split(',') : [])
meta.addFunction('nicks', ['array'], (view, ns) => ns.map(v => nicked(v)).filter(v => v).sort())
meta.addArgument('value',['string'])

meta.addVariable('lim', ['array'], (view, lim) => {
	lim = lim.filter(v => v !== '')
	if (lim.length == 1) lim.unshift(0)
	if (lim.length == 0) {
		lim = [0,12] //Дефолт
	} else {
		lim[0] = Number(lim[0])
		lim[1] = Number(lim[1])
	}
	if (lim[0] > lim[1]) return view.err('Неверный lim')
	if (lim[1] - lim[0] > 200) return view.err('Некорректный lim')
	return lim
})
meta.addArgument('vals', ['nicks'])
const getNalichie = Access.cache(async (partner) => {
	const db = await new Db().connect()
	const options = await Catalog.getOptions()
	options.actions ??= ['Новинка','Распродажа']
	const lim = 100
	const vals = options.actions.map(v => nicked(v)).filter(v => v).sort()
	const p = await Catalog.getProp('Наличие')
	if (!p) return []
	const { prop_id } = p

	if (!prop_id) return
	const value_ids = []
	
	for (const value_nick of vals) {
		const value_id = await db.col('SELECT value_id from showcase_values where value_nick = :value_nick', { value_nick })
		if (!value_id) continue
		value_ids.push(value_id)
	}
	if (!value_ids.length) return []
	
	const moditem_ids = await db.all(`
		SELECT distinct ip.model_id, GROUP_CONCAT(distinct ip.item_num separator ',') as item_nums
		FROM 
			showcase_iprops ip
		WHERE 
			ip.prop_id = :prop_id
			and ip.value_id in (${value_ids.join(',')})
		GROUP BY ip.model_id
		LIMIT 120
	`, { prop_id })
	const models = await Catalog.getModelsByItems(moditem_ids, partner)
	
	return models
})

meta.addArgument('m',['string'])
meta.addArgument('model_nick', (view, model_nick) => {
	return nicked(model_nick)
})
meta.addArgument('brand_nick', (view, model_nick) => {	
	return nicked(model_nick)
})
meta.addAction('get-model', async (view) => {
	const { db, brand_nick, model_nick, m, partner } = await view.gets(['db','brand_nick','model_nick','m','partner'])
	const model = await Catalog.getModel(db, brand_nick, model_nick, partner)	
	view.ans.mod = model
	return view.ret()		
})
meta.addAction('get-search', async (view) => {
	const { db, value, m, partner} = await view.gets(['db','value','m','partner'])
	const tree = await Catalog.getTree()
	const groups = Object.values(tree)
	view.ans.groups=groups
	const value_nick = nicked(value)
	let type = 'Поиск'
	if (!value_nick) type = ''
	let group = value_nick ? groups.find(group => group.group_nick == value_nick) : false
	if (group) type = 'Группа'
	if (!group) group = groups.find(group => !group.parent_id)

	const res = {
		value, type, group,
		childs: group.childs.map(id => tree[id]),
		path: group.path.map(id => tree[id]),
		list: await Catalog.search(db, group, partner)
	}
	Object.assign(view.ans, res)
	return view.ret()
})
meta.addAction('get-search-head', async (view) => {
	const { db, value } = await view.gets(['db','value'])
	
	const tree = await Catalog.getTree()
	const groups = Object.values(tree)
	const value_nick = nicked(value)
	const group = groups.find(group => {
		return group.group_nick == value_nick
	})
	view.ans.child = value
	if (group) {
		view.ans.title = group.group_title
	} else {
		view.ans.title = 'Группа не найдена'
	}

	return view.ret()
})
meta.addAction('get-catalog', async (view) => {
	const { db } = await view.gets(['db','partner'])
	
	const tree = await Catalog.getTree()
	
	const groups = Object.values(tree)
	const root = groups.find(g => !g.parent_id)
	const childs = groups.filter(g => g.parent_id == root.group_id && g.icon)	
	
	for (const i in childs) {
		childs[i] = structuredClone(childs[i])
		const group = childs[i]
		group.childs = group.childs.map(group_id => {
			return {
				group_title: tree[group_id].group_title,
				group_nick: tree[group_id].group_nick
			}
		})
	}

	view.ans.childs = childs
	return view.ret()
})
meta.addAction('get-nalichie', async (view) => {
	const { db } = await view.gets(['db','partner'])
	view.ans.list = await getNalichie()
	return view.ret()
})
meta.addArgument('partner', ['string'], async (view, partner) => {
	const options = await Catalog.getOptions()
	return options.partners[partner]
})
// meta.addAction('get-partner', async (view) => {
// 	const { db, value } = await view.gets(['db','value'])
// 	const options = await Catalog.getOptions()
// 	const data =  options.partners[value]
// 	if (!data) {
// 		view.ans.data = {}
// 		view.ans.value = ''
// 		return view.err()
// 	}
// 	view.ans.value = value
// 	view.ans.data = data
// 	return view.ret()
// })

export const rest = async (query, get) => {
	const ans = await meta.get(query, get)
	return { ans, 
		ext: 'json', 
		status: ans.status ?? 200, 
		nostore: false 
	}
}
