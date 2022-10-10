import { Meta } from "/-controller/Meta.js"

import fs from "fs/promises"
import { nicked } from '/-nicked/nicked.js'

import { unique } from "/-nicked/unique.js"
import { Access } from "/-controller/Access.js"
import { Catalog } from "/-catalog/Catalog.js"
import { Db } from "/-db/Db.js"
import common from "/-catalog/common.html.js"
import { rest_live } from './rest_live.js'
import { parse } from '/-controller/Spliter.js'
import { map } from '/-nicked/map.js'
import { UTM } from '/-form/UTM.js'
import { loadTEXT } from '/-controller/router.js'

const recdata = await import('/data/.recaptcha.json', {assert: {type:'json'}}).then(res => res.default).catch(e => Object())
const SECRET = recdata.secret
const SITEKEY = recdata.sitekey

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
meta.addFunction('int1', (view, n) => {
	return Number(n) || 1
})
meta.addFunction('string', (view, n) => n!=null ? String(n) : '')

meta.addFunction('array', (view, n) => n ? n.split(',') : [])
meta.addFunction('nicks', ['array'], (view, ns) => ns.map(v => nicked(v)).filter(v => v).sort())
meta.addArgument('value',['string'])
meta.addArgument('page',['int1'])

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
			else if (prop.type == 'text') delete md.more[prop_nick]
			if (!Object.keys(md.more[prop_nick]).length) delete md.more[prop_nick]
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
meta.addVariable('SITEKEY', (view) => {
	view.ans.SITEKEY = SITEKEY
})
meta.addArgument('model_nick', (view, model_nick) => {
	return nicked(model_nick)
})
meta.addArgument('brand_nick', (view, model_nick) => {	
	return nicked(model_nick)
})

meta.addAction('get-model-head', async (view) => {
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
	const config = await Catalog.getConfig()
	if (!config.tpls) return {}
	let files = await fs.readdir(config.tpls).catch(() => [])
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
meta.addAction('get-model', async (view) => {
	view.gets(['SITEKEY'])
	const { md, db, brand_nick, model_nick, visitor, partner } = await view.gets(['md', 'db', 'visitor', 'brand_nick','model_nick','partner'])
	const model = await Catalog.getModelByNick(db, visitor, brand_nick, model_nick, partner)	
	view.ans.brand = await Catalog.getBrandByNick(brand_nick)
	if (!model) return view.err()
	if (model.texts) {
		model.texts = await map(model.texts, async src => {
			const {data} = await loadTEXT('/'+src, visitor)
			return data || ''
		})
	}
	view.ans.mod = model




	const config = await Catalog.getConfig()
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
	
	view.ans.tpl =  tpl ? '/' + config.tpls + tpl : "/-catalog/model.html.js"
	

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

	const brand = await Catalog.getMainBrand(md)
	const groupnicks = await Catalog.getGroups()
	const tree = await Catalog.getTree()
	const group = await Catalog.getMainGroup(md)
	if (!group) return view.err('Нет данных')
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
	let { page } = await view.gets(['page'])
	const { db, value, md, partner, visitor} = await view.gets(['db','value','md','partner','visitor'])
	const group_ids = Catalog.searchGroups(db, visitor, md)
	const where = await Catalog.getmdwhere(db, visitor, md)
	const group = await Catalog.getMainGroup(md)
	if (!group) {
		return view.err('Нет данных')
	}
	const opt = await Catalog.getGroupOptions(group.group_id)
	const countonpage = opt.limit
	const start = (page - 1) * countonpage
	let moditem_ids
	where.push('ip.item_num is not null')
	if (where.length) {
		moditem_ids = await db.all(`
			SELECT SQL_CALC_FOUND_ROWS ip.model_id, GROUP_CONCAT(distinct ip.item_num separator ',') as item_nums
			FROM showcase_models m
			LEFT JOIN showcase_iprops ip on ip.model_id = m.model_id
			WHERE ${where.join(' and ')}
			GROUP BY m.model_id
			LIMIT ${start},${opt.limit}
		`)
	} else {
		moditem_ids = await db.all(`
			SELECT SQL_CALC_FOUND_ROWS ip.model_id, GROUP_CONCAT(distinct ip.item_num separator ',') as item_nums
			FROM showcase_models m
			LEFT JOIN showcase_iprops ip on ip.model_id = m.model_id
			GROUP BY m.model_id
			LIMIT ${start},${opt.limit}
		`)
	}
	const count = await db.col('SELECT FOUND_ROWS()')
	const list = await Catalog.getModelsByItems(moditem_ids, partner)
	const brand = await Catalog.getMainBrand(md)
	
	
	let last = count <= countonpage ? 1 : Math.ceil(count / countonpage)
	
	if (last < page) page = last

	const pagination = {
		last: last,
		page: page
	}
	const res = { list, brand, pagination, count, countonpage }
	Object.assign(view.ans, res)
	return view.ret()
})
meta.addAction('get-search-sitemap', async (view) => {
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
meta.addAction('get-search-head', async (view) => {
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
	const { partner } = await view.gets(['partner'])
	view.ans.list = await getNalichie(partner)
	return view.ret()
})
meta.addArgument('partner', async (view, partner) => {
	const options = await Catalog.getOptions()
	const data = options.partners[partner]
	if (data) {
		data.key = partner
		view.ans.partner = partner
		view.ans.nostore = true
	}
	return data
})
meta.addAction('get-partner', async (view) => {
	const { partner } = await view.gets(['partner'])
	
	return partner ? view.ret() : view.err()
})

meta.addArgument('visitor')










meta.addArgument('g-recaptcha-response')
meta.addVariable('recaptcha', async (view) => {
	const gresponse = await view.get('g-recaptcha-response')
    const visitor = await view.get('visitor')
    const ip = visitor.client.ip
    const result = await fetch('https://www.google.com/recaptcha/api/siteverify', { 
        method: 'POST',
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            'secret': SECRET, 
            'response': gresponse,
            'remoteip': ip
        })
    }).then(res => res.json())
    //view.ans.recaptcha = result;
    if (!result || !result['success']) return view.err('Не пройдена защита от спама')
    return true
})
const emailreg = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
meta.addArgument('email', (view, email) => {
    if (!String(email).toLowerCase().match(emailreg)) return view.err('Уточните Ваш Email')
    return email
})
meta.addArgument('phone', (view, phone) => {
    phone = phone.replace(/\D/g,'')
    phone = phone.replace(/^8/,'7')
    if (phone[0] != 7) return view.err("Уточните ваш телефон, номер должен начинаться с 7, мы работаем в России")
    if (phone.length != 11) return view.err("Уточните ваш телефон для связи, должно быть 11 цифр ("+phone+")")
    return phone
})
meta.addArgument('host')
meta.addArgument('text')
meta.addFunction('checkbox', (view, n) => !!n)
meta.addArgument('terms',['checkbox'], (terms) => {
	if (!terms) return view.err('Требуется согласие на обработку персональных данных')
})
import { MAIL } from './order.mail.html.js'
meta.addArgument('utms', (view, utms) => UTM.parse(utms))
meta.addAction('set-order', async (view) => {
	await view.gets(['recaptcha','terms'])
	const { db, visitor } = await view.gets(['db','visitor'])
	
    const user = await view.gets(['text', 'email', 'phone', 'brand_nick','model_nick', 'utms', 'partner'])
    user.host = visitor.client.host
    user.ip = visitor.client.ip
    user.model = await Catalog.getModelByNick(db, visitor, user.brand_nick, user.model_nick, user.partner)
    const html = MAIL(user)
    
    const { Mail } = await import('/-mail/Mail.js')
    const r = await Mail.send(`Заявка ${user.host} ${user.email}`, html, user.email)
    if (!r) return view.err('Сообщение не отправлено из-за ошибки на сервере')


	return view.ret()
})







export const rest = async (query, get, visitor) => {
	const ans = await meta.get(query, {...get, visitor})
	return { ans, 
		ext: 'json', 
		status: ans.status ?? 200, 
		nostore: ans.nostore ?? false 
	}
}