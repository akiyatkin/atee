import Rest from "/-rest"

import fs from "fs/promises"
import nicked from '/-nicked'

import unique from "/-nicked/unique.js"
import Access from "/-controller/Access.js"
import Catalog from "/-catalog/Catalog.js"
import Db from "/-db/Db.js"
import common from "/-catalog/common.html.js"
import live from '/-catalog/rest.live.js'
import funcs from '/-rest/funcs.js'
import { map } from '/-nicked/map.js'

import { loadTEXT } from '/-controller/router.js'

import mail from '/-mail'
import config from '/-config'
import vars_mail from '/-mail/vars.js'
import vars_db from '/-db/vars.js'

const rest = new Rest(live, funcs, vars_mail, vars_db)


rest.addFunction('nicks', ['array'], (view, ns) => ns.map(v => nicked(v)).filter(v => v).sort())

rest.addArgument('value', ['string'])
rest.addArgument('page', ['int'], (view, n) => n || 1)
rest.addArgument('count', ['int'])


rest.addVariable('lim', ['array'], async (view, lim) => {
	lim = lim.filter(v => v !== '')
	const option = await Catalog.getOptions()
	if (lim.length == 1) lim.unshift(0)
	if (lim.length == 0) {
		lim = [0, option.limit] //Дефолт
	} else {
		lim[0] = Number(lim[0])
		lim[1] = Number(lim[1])
	}
	if (lim[0] > lim[1]) return view.err('Неверный lim')
	if (lim[1] - lim[0] > 200) return view.err('Некорректный lim')
	return lim
})
rest.addArgument('vals', ['nicks'])
const getNalichie = Access.cache(async (partner) => {
	const options = await Catalog.getOptions()
	const lim = 100
	const vals = options.actions.map(v => nicked(v)).filter(v => v).sort()
	const p = await Catalog.getPropByTitle('Наличие')
	if (!p) return []
	const { prop_id } = p

	if (!prop_id) return
	const value_ids = []

	const db = await new Db().connect()
	for (const value_nick of vals) {
		const value_id = await db.col('SELECT value_id from showcase_values where value_nick = :value_nick', { value_nick })
		if (!value_id) continue
		value_ids.push(value_id)
	}
	if (!value_ids.length) {
		db.release()
		return []
	}
	
	const moditem_ids = await db.all(`
		SELECT distinct ip.model_id, GROUP_CONCAT(distinct ip.item_num separator ',') as item_nums
		FROM 
			showcase_iprops ip
		WHERE 
			ip.prop_id = :prop_id
			and ip.value_id in (${value_ids.join(',')})
		GROUP BY ip.model_id
		LIMIT 100
	`, { prop_id })
	const models = await Catalog.getModelsByItems(db, moditem_ids, partner)
	db.release()
	return models
})
rest.addArgument('m', (view, m) => {
	if (m) view.nostore = true //безчисленное количество комбинаций, браузеру не нужно запоминать
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
			const p = await Catalog.getPropByTitle('Наличие')
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

rest.addVariable('md', async (view) => {
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
			for (const prop_value in md.more[prop_nick]) {
				if (prop_value === '') delete md.more[prop_nick][prop_value]
			}
			const prop = await Catalog.getPropByNick(prop_nick)
			if (!prop) delete md.more[prop_nick]
			else if (prop.type == 'text') delete md.more[prop_nick]
			
			if (prop.type == 'value' && md.more[prop_nick]) {
				for (const value_nick in md.more[prop_nick]) {
					const value = await Catalog.getValueByNick(db, visitor, value_nick)
					if (!value || typeof(md.more[prop_nick][value_nick]) == 'object') {
						delete md.more[prop_nick][value_nick]
					}
				}
			}
			// if (prop.type == 'number') {	
			// 	const vals = {}
			// 	for (const value_nick in md.more[prop_nick]) {
			// 		const n = value_nick.replace('-','.')
			// 		vals[n] = md.more[prop_nick][value_nick]
			// 	}
			// 	md.more[prop_nick] = vals
			// }
			if (!Object.keys(md.more[prop_nick] || {}).length) delete md.more[prop_nick]
			//if (!md.more[prop_nick]) continue

			

			
		}
		if (!Object.keys(md.more).length) delete md.more
	}
	
	m = Catalog.makemark(md).join(':')
	view.ans.m = m
	md.m = m
	view.ans.md = md
	return md
})

// rest.addVariable('SITEKEY', (view) => {
// 	view.ans.SITEKEY = SITEKEY
// })
rest.addArgument('model_nick', ['nicked'])
rest.addArgument('brand_nick', ['nicked'])

rest.addResponse('get-model-head', async (view) => {
	const { db, brand_nick, model_nick, visitor, partner} = await view.gets(['db','visitor', 'brand_nick','model_nick','partner'])
	const model = await Catalog.getModelByNick(db, visitor, brand_nick, model_nick, partner)
	if (!model) {
		view.ans.brand = await Catalog.getBrandByNick(brand_nick)
		view.ans.title = `${view.ans.brand?.brand_title ?? brand_nick} ${model_nick}`
		return view.ret()
	}
	view.ans.mod = model
	view.ans.title = `${model.brand_title} ${model.model_title} ${common.propval(model,'Наименование')}`
	return view.ret()		
})


const getTpls = Access.cache(async () => {
	const conf = await config('showcase')
	if (!conf.tpls) return {}
	let files = await fs.readdir(conf.tpls).catch(() => [])
	files = files.map((file) => {
		const i = file.indexOf('.')
		const name = ~i ? file.slice(0, i) : file
		const ext = (~i ? file.slice(i + 1) : '').toLowerCase()
		const secure = file[0] == '.' || file[0] == '~'
		return {file, name, ext, secure}
	})
	files = files.filter(({secure, ext}) => !secure || ext != 'html.js')
	files.forEach(of => {
		delete of.secure
	})
	return files.reduce((ak, f) => {
		ak[f.name] = f.file
		return ak
	}, {})
})
rest.addResponse('get-model', async (view) => {
	const { md, db, brand_nick, model_nick, visitor, partner } = await view.gets(['md', 'db', 'visitor', 'brand_nick','model_nick','partner'])
	const model = await Catalog.getModelByNick(db, visitor, brand_nick, model_nick, partner)	
	view.ans.brand = await Catalog.getBrandByNick(brand_nick)
	if (!model) return view.err()
	if (model.texts) {
		model.texts = await map(model.texts, async src => {
			const {ans:data} = await loadTEXT('/'+src, visitor)
			return data || ''
		})
	}
	view.ans.mod = model


	const conf = await config('showcase')
	const tpls = await getTpls()
	const path = await Catalog.getPathNickByGroupId(model.group_id)
	path.reverse()
	
	let tpl = false
	if (!tpl) for (const group_nick of path) {
		tpl = tpls[`model-${model.brand_nick}-${group_nick}`]
		if (tpl) break
	}
	if (!tpl) tpl = tpls[`model-${model.brand_nick}.html`]
	if (!tpl) for (const group_nick of path) {
		tpl = tpls[`model-${group_nick}`]
		if (tpl) break
	}
	view.ans.tpl =  tpl ? '/' + conf.tpls + tpl : "/-catalog/model.html.js"
	

	return view.ret()		
})
const isSome = (obj, p) => {
	for (p in obj) return true
	return false
};
rest.addResponse('get-filters', async (view) => {
	const { db, md, partner, visitor} = await view.gets(['db','md','partner', 'visitor'])
	const group = await Catalog.getMainGroup(md)
	if (!group) return view.err('Нет данных')
	const res = {}
	const opt = await Catalog.getGroupOpt(group.group_id)
	const filters = []

	if (md.more) for (const prop_nick in md.more) {
		const prop = await Catalog.getPropByNick(prop_nick);
		if (~opt.filters.indexOf(prop.prop_title)) continue
		const filter = await Catalog.getFilterConf(db, visitor, prop, group.group_id, md, partner)
		if (!filter) continue
		filters.push(filter)
	}

	for (const prop_title of opt.filters) {
		const prop = await Catalog.getPropByTitle(prop_title)
		const filter = await Catalog.getFilterConf(db, visitor, prop, group.group_id, md, partner)
		if (!filter) continue
		filters.push(filter)
	}
	
	res.filters = filters
	Object.assign(view.ans, res)
	return view.ret()
})

rest.addResponse('get-search-groups', async (view) => {
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


	const brand = await Catalog.getMainBrand(md)
	const groupnicks = await Catalog.getGroups()
	const tree = await Catalog.getTree()
	const group = await Catalog.getMainGroup(md)
	if (!group) return view.err('Нет данных')

	const parent = group.parent_id ? tree[group.parent_id] : group
	const nmd = { ...md } //, title: {}
	nmd.group = { ...md.group }
	nmd.group[parent.group_nick] = 1
	nmd.m = Catalog.makemark(nmd).join(':')
	const group_ids = await Catalog.getGroupIds(db, visitor, nmd, partner)


	let rootpath = tree[group_ids[0]]?.path || group.path
	group_ids.forEach(group_id => {
		rootpath = rootpath.filter(id => ~tree[group_id].path.indexOf(id) || id == group_id)
	})

	
	const work = group.childs.length ? group : parent
	const level_group_ids = unique(group_ids.filter(group_id => {
		return tree[group_id].parent_id && tree[group_id].path?.length >= work.path?.length
	}).map(group_id => {
		return tree[group_id].path[work.path.length + 1] || group_id
	}))
	const groups = work.childs.map(id => {
		const group = {...tree[id]}
		group.mute = !~level_group_ids.indexOf(id)
		return group
	})
	

	const res = {
		type, title:group, brand,
		parent: group.path.length ? tree[group.path.at(-1)] : groupnicks[options.root_nick],
		childs: groups,
		path: group.path.map(id => tree[id])
	}
	
	const mdvalues = {}
	const mdprops = {}
	for (const prop_nick in md.more) {
		const prop = await Catalog.getPropByNick(prop_nick)
		mdprops[prop_nick] = prop
		for (const value_nick in md.more[prop_nick]) {
			if (prop.type == 'value') {
				mdvalues[value_nick] = await Catalog.getValueByNick(db, visitor, value_nick)
			} else {
				let unit = ''
				if (prop.opt.unit) unit = '&nbsp'+prop.opt.unit
				let value_title
				if (value_nick == 'upto') {
					value_title = 'до '+md.more[prop_nick][value_nick].replace('-','.')
				} else if (value_nick == 'from') {
					value_title = 'от '+md.more[prop_nick][value_nick].replace('-','.')
				} else {
					value_title = Number(value_nick.replace('-','.'))
				}
				value_title += unit
				
				mdvalues[value_nick] = {value_nick, value_title}
			}
		}
	}
	res.mdvalues = mdvalues
	res.mdprops = mdprops
	
	Object.assign(view.ans, res)
	return view.ret()
})
rest.addResponse('get-search-list', async (view) => {
	let { page, count } = await view.gets(['page', 'count'])

	const { db, value, md, partner, visitor} = await view.gets(['db','value','md','partner','visitor'])
	//const {title, group_ids} = Catalog.searchGroups(db, visitor, md)
	const {from, where, sort} = await Catalog.getmdwhere(db, visitor, md, partner)
	const group = await Catalog.getMainGroup(md)
	if (!group) return view.err('Нет данных')
	const option = await Catalog.getOptions()
	const opt = await Catalog.getGroupOpt(group.group_id)
	view.ans.limit = option.limit
	const countonpage = count || option.limit
	const start = (page - 1) * countonpage
	// let countonpage = opt.limit
	// let start = (page - 1) * countonpage
	// if (page > 1) {
	// 	start = (page - 2) * countonpage + opt.limit
	// 	countonpage = count || opt.limit
	// }

	const moditem_ids = await db.all(`
		SELECT m.model_id, GROUP_CONCAT(distinct i.item_num separator ',') as item_nums 
		FROM ${from.join(', ')}
		WHERE ${where.join(' and ')}
		GROUP BY m.model_id 
		${sort.length?`ORDER BY ${sort.join(',')}`:''}
		LIMIT ${start}, ${countonpage}
	`)
	const total = await db.col(`
		SELECT count(distinct m.model_id)
		FROM ${from.join(', ')}
		WHERE ${where.join(' and ')}
	`)

	const list = await Catalog.getModelsByItems(db, moditem_ids, partner)

	const brand = await Catalog.getMainBrand(md)
	
	let last = total <= countonpage ? 1 : Math.ceil(total / countonpage)
	if (last < page) page = last
	const pagination = {
		last: last,
		page: page
	}
	const res = { list, brand, pagination, count:total, countonpage }
	Object.assign(view.ans, res)
	return view.ret()
})
rest.addResponse('get-search-sitemap', async (view) => {
	const { db, value } = await view.gets(['db'])
	
	view.ans.title = 'Каталог'
	view.ans.headings = []

	const brands = await Catalog.getBrands()
	let childs = {}
	for (const brand_nick in brands) {
		const brand = brands[brand_nick]
		childs[brand_nick] = {
			name: brand.brand_title
		}
	}
	view.ans.headings.push({
		title:'Бренды',
		childs:childs
	})
	const groups = await Catalog.getGroups()
	childs = {}
	for (const group_nick in groups) {
		const group = groups[group_nick]
		if (!group.parent_id) continue
		childs[group_nick] = {
			name: group.group_title
		}
	}
	view.ans.headings.push({
		title:'Группы',
		childs:childs
	})

	
	const models = await db.all(`
		SELECT m.model_nick, m.model_title, b.brand_nick, b.brand_title
		FROM showcase_models m, showcase_brands b
		WHERE m.brand_id = b.brand_id
	`)
	childs = {}
	models.forEach(mod => {
		const key = mod.brand_nick+'/'+mod.model_nick
		childs[key] = {
			"name": mod.brand_title + ' '+mod.model_title
		}
	})
	view.ans.headings.push({
		title:'Модели',
		childs:childs
	})
	return view.ret()
})
rest.addResponse('get-search-head', async (view) => {
	const { db, md } = await view.gets(['db','md'])
	const group = await Catalog.getMainGroup(md)
	const brand = await Catalog.getMainBrand(md)
	if (group) {
		view.ans.title = group.group_title
	} else if (brand) {
		view.ans.title = brand.brand_title
	}
	view.ans.canonical = group?.parent_id ? group.group_nick : (brand ? brand.brand_nick : '') 
	if (view.ans.canonical) view.ans.canonical = '/' + view.ans.canonical
	view.ans.title ??= 'Каталог'
	return view.ret()
})
rest.addResponse('get-catalog', async (view) => {
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
rest.addResponse('get-nalichie', async (view) => {
	const { partner } = await view.gets(['partner'])
	view.ans.list = await getNalichie(partner)
	return view.ret()
})
rest.addArgument('partner', async (view, partner) => {
	const options = await Catalog.getOptions()
	const data = options.partners[partner]
	view.ans.partner = partner
	if (!data) return false
	data.key = partner
	return data
})
rest.addResponse('get-partner', async (view) => {
	const { partner } = await view.gets(['partner'])
	return partner ? view.ret() : view.nope()
})

import { MAIL } from './order.mail.html.js'
rest.addResponse('set-order', async (view) => {
	await view.gets(['recaptcha','terms'])
	const { db, visitor } = await view.gets(['db','visitor'])
	
    const user = await view.gets(['text', 'email', 'phone', 'brand_nick','model_nick', 'utms', 'partner'])
    user.host = visitor.client.host
    user.ip = visitor.client.ip
    user.model = await Catalog.getModelByNick(db, visitor, user.brand_nick, user.model_nick, user.partner)
    const html = MAIL(user)
    
    
    const r = await mail.toAdmin(`Заявка ${user.host} ${user.email}`, html, user.email)
    if (!r) return view.err('Сообщение не отправлено из-за ошибки на сервере')


	return view.ret()
})






rest.addResponse('get-maingroups', async (view) => {
	const { db } = await view.gets(['db'])
	const tree = await Catalog.getTree()
	const options = await Catalog.getOptions()
	const groupnicks = await Catalog.getGroups()
	let root = groupnicks[options.root_nick]
	if (!root) return view.err('Не найдена верняя группа')

	const imgprop = await Catalog.getPropByNick('images')
	if (!imgprop) return view.err('Нет картинок')

	if (root.childs.length == 1) root = tree[root.childs[0]] //fix для hugong когда есть одна общая группа верхнего уровня

	view.ans.childs = await map(root.childs, async group_id => {
		const group = tree[group_id]
		const where = []
		where.push(`m.group_id in (${group.groups.join(',')})`)
		where.push(`(ip.prop_id = ${imgprop.prop_id} and ip.text is not null and ip.ordain = 1)`)
		const sql = `
			SELECT distinct ip.text as image, m.model_nick, b.brand_nick, m.model_title, b.brand_title
			FROM 
				(showcase_models m
				left join showcase_brands b on b.brand_id = m.brand_id),
				showcase_iprops ip
			WHERE 
				ip.model_id = m.model_id
				and ${where.join(' and ')}
			LIMIT 12
		`
		const images = await db.all(sql)
		return {
			images,
			group_title: group.group_title,
			group_nick: group.group_nick
		}
	})
	view.ans.childs = view.ans.childs.filter(g => g.images.length)
	return view.ret()
})


export default rest