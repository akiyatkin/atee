import { Meta } from "/-controller/Meta.js"
import { nicked } from "/-nicked/nicked.js"
import { unique } from "/-nicked/unique.js"
import { Access } from "/-controller/Access.js"
import { Catalog } from "/-catalog/Catalog.js"
import { Db } from "/-db/Db.js"
import common from "/-catalog/common.html.js"
import { rest_live } from './rest_live.js'
import { parse } from '/-controller/Spliter.js'

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
meta.addFunction('string', (view, n) => n!=null ? String(n) : '')

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
meta.addArgument('m', (view, m) => {
	if (m) view.ans.nostore = true
	return m
})
const prepareValue = async (value) => {
	const tree = await Catalog.getTree()
	const options = await Catalog.getOptions()
	const nick = nicked(value);
	let addm = ''
	if (nick) {
		if (nick == 'actions') {
			const vals = options.actions.map(v => nicked(v)).filter(v => v).sort()
			const p = await Catalog.getProp('Наличие')
			if (p) {
				vals.forEach(v => () => addm += `:more.${p.prop_nick}.${v}=1`)
			}
		} else {
			let group
			for (const group_id in tree) {
				if (tree[group_id].group_nick == nick) {
					group = tree[group_id]
					break
				}
			}
			if (group) {
				addm += `:group::.${nick}=1`;
			} else {
				const brands = await Catalog.getBrands()
				const brand = brands[nick]
				if (brand) {
					addm += `:brand::.${nick}=1`
				} else {
					addm += `:search=${value}`
				}
			}
		}
	}
	return addm
}
const makemd = (m) => {
	m = m.replaceAll(/:([^:]+)::\./ug, ":$1:$1.")
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

meta.addVariable('md', async (view) => {
	let { m, db, value, visitor } = await view.gets(['m','db','value','visitor'])
	const addm = await prepareValue(value)
	m += addm
	
	let md = makemd(m)
	if (md.search) {
		const addm = await prepareValue(md.search)
		m += ':search'+addm
		md = makemd(m)
	}
	if (md.value) { //value это то что было до поиска и можт содержать старый поиск, который применять не нужно
		const addm = await prepareValue(md.value)
		m += addm
		const search = md.search
		md = makemd(m)
		if (search) md.search = search
		else delete md.search
		delete md.value
	}
	if (md.group) {
		const groups = await Catalog.getGroups()
		for (const group_nick in md.group) {
			if (!groups[group_nick]) delete md.group[group_nick]
		}
		if (!Object.keys(md.group).length) delete md.group
	}
	if (md.brand) {
		const brands = await Catalog.getBrands()
		for (const brand_nick in md.brand) {
			if (!brands[brand_nick]) delete md.group[brand_nick]
		}
		if (!Object.keys(md.brand).length) delete md.brand
	}
	if (md.more) {
		for (const prop_nick in md.more) {
			const prop = await Catalog.getProp(prop_nick)
			if (!prop) delete md.more[prop_nick]
			if (prop.type == 'text') delete md.more[prop_nick]
		}
		if (!Object.keys(md.more).length) delete md.more
	}
	m = makemark(md).join(':')
	view.ans.m = m
	md.m = m
	view.ans.md = md
	return md
})
const makemark = (md, ar = [], path = []) => {
	for (const name in md) {
		const val = md[name]
		if (typeof(val) == 'object') {
			makemark(val, ar, [...path, name] )	
		} else {
			ar.push([...path, name+'='+val].join('.'))
		}
	}
	return ar
}
meta.addArgument('model_nick', (view, model_nick) => {
	return nicked(model_nick)
})
meta.addArgument('brand_nick', (view, model_nick) => {	
	return nicked(model_nick)
})

meta.addAction('get-model-head', async (view) => {
	const { db, brand_nick, model_nick, m, partner } = await view.gets(['db','brand_nick','model_nick','m','partner'])
	const model = await Catalog.getModel(db, brand_nick, model_nick, partner)	
	view.ans.mod = model
	view.ans.child = model_nick
	view.ans.title = `${model.brand_title} ${model.model_title} ${common.propval(model,'Наименование')}`
	return view.ret()		
})
meta.addAction('get-model', async (view) => {
	const { md, db, brand_nick, model_nick, m, partner } = await view.gets(['md', 'db','brand_nick','model_nick','partner'])
	const model = await Catalog.getModel(db, brand_nick, model_nick, partner)	
	view.ans.mod = model
	return view.ret()		
})
const isSome = (obj, p) => {
	for (p in obj) return true
	return false
};
meta.addAction('get-search-groups', async (view) => {
	const { db, value, md, partner, visitor} = await view.gets(['db','value','md','partner', 'visitor'])

	
	const options = await Catalog.getOptions()
	let type = ''
	
	if (md.search && md.group && md.brand) type = 'Поиск по группе бренда'
	if (!md.search && md.group && md.brand) type = 'Группа бренда'
	if (md.search && !md.group && md.brand) type = 'Поиск по бренду'
	if (md.search && md.group && !md.brand) type = 'Поиск в группе'
	if (!md.search && !md.group && md.brand) type = 'Бренд'
	if (md.search && !md.group && !md.brand) type = 'Поиск'
	if (!md.search && md.group && !md.brand) type = 'Группа'
	if (type && md.more) type += ' с фильтром'
	if (!type && md.more) type += 'Фильтр'
	let brand = false
	if (md.brand) {
		const brand_nicks = Object.keys(md.brand)
		if (brand_nicks.length == 1) {
			const brands = await Catalog.getBrands()
			brand = brands[brand_nicks[0]]
		}
	}
	const groupnicks = await Catalog.getGroups()
	const tree = await Catalog.getTree()
	const group = await Catalog.getMainGroup(md)
	const group_ids = await Catalog.searchGroups(db, visitor, md)
	let groups = await Catalog.getCommonChilds(group_ids)
	if (groups.length == 1 && group.group_id == groups[0].group_id) groups = []

	const res = {
		type, group, brand,
		parent: group.path.length ? tree[group.path.at(-1)] : groupnicks[options.root_nick],
		childs: groups,
		path: group.path.map(id => tree[id])
	}
	Object.assign(view.ans, res)
	return view.ret()
})
meta.addAction('get-search-list', async (view) => {
	const { db, value, md, partner, visitor} = await view.gets(['db','value','md','partner','visitor'])
	const group_ids = Catalog.searchGroups(db, visitor, md)
	const where = await Catalog.getmdwhere(db, visitor, md)
	const group = await Catalog.getMainGroup(md)
	const opt = await Catalog.getGroupOptions(group.group_id)
	let moditem_ids
	if (where.length) {
		moditem_ids = await db.all(`
			SELECT ip.model_id, GROUP_CONCAT(distinct ip.item_num separator ',') as item_nums
			FROM showcase_models m
			LEFT JOIN showcase_iprops ip on ip.model_id = m.model_id
			WHERE ${where.join(' and ')}
			GROUP BY m.model_id
			LIMIT ${opt.limit}
		`)
	} else {
		moditem_ids = await db.all(`
			SELECT ip.model_id, GROUP_CONCAT(distinct ip.item_num separator ',') as item_nums
			FROM showcase_models m
			LEFT JOIN showcase_iprops ip on ip.model_id = m.model_id
			GROUP BY m.model_id
			LIMIT ${opt.limit}
		`)
	}
	const list = await Catalog.getModelsByItems(moditem_ids, partner)

	const res = { list }
	Object.assign(view.ans, res)
	return view.ret()
})
meta.addAction('get-search-head', async (view) => {
	const { db, value } = await view.gets(['db','value'])
	const value_nick = nicked(value)
	view.ans.child = value
	const group = await Catalog.getGroupByNick(value_nick)
	if (group) {
		view.ans.title = group.group_title
	} else {
		const brand = await Catalog.getBrandByNick(value_nick)
		if (brand) {
			view.ans.title = brand.brand_title
		}
	}
	view.ans.title ??= 'Каталог'
	
	

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

meta.addArgument('visitor')
export const rest = async (query, get, visitor) => {
	const ans = await meta.get(query, {...get, visitor})
	return { ans, 
		ext: 'json', 
		status: ans.status ?? 200, 
		nostore: false 
	}
}
