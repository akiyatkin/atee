import fs from "fs/promises"
import nicked from '/-nicked'
import docx from '/-docx'
import mail from '/-mail'
import config from '/-config'
import unique from "/-nicked/unique.js"
import Access from "/-controller/Access.js"
import Files from "/-showcase/Files.js"
import Catalog from "/-catalog/Catalog.js"
import Showcase from "/-showcase/Showcase.js"


import Rest from "/-rest"
const rest = new Rest() //rest_live, rest_funcs, rest_mail, rest_db, rest_catalog

import rest_live from '/-catalog/rest.live.js'
rest.extra(rest_live)
import rest_funcs from '/-rest/rest.funcs.js'
rest.extra(rest_funcs)
import rest_mail from '/-mail/rest.mail.js'
rest.extra(rest_mail)
import rest_db from '/-db/rest.db.js'
rest.extra(rest_db)
import rest_catalog from '/-catalog/rest.vars.js'
rest.extra(rest_catalog)

import rest_docx from '/-docx/rest.js'


const getv = (mod, prop_title) => mod ? mod[prop_title] ?? mod.more?.[prop_title] : ''
const prefixif = (prefix, val, postfix = '') => val ? prefix + val + postfix : ''
const getModItemPropValue = (item, mod, prop_title) => getv(mod, prop_title) || getv(item, prop_title) || ''


rest.addFunction('nicks', ['array'], (view, ns) => ns.map(v => nicked(v)).filter(v => v).sort())


rest.addArgument('page', ['int'], (view, n) => n || 1)
rest.addArgument('count', ['int'])


rest.addVariable('lim', ['array'], async (view, lim) => {
	const { base } = await view.gets(['base'])
	lim = lim.filter(v => v !== '')
	const option = await base.getOptions()
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



// rest.addVariable('SITEKEY', (view) => {
// 	view.data.SITEKEY = SITEKEY
// })



rest.addResponse('get-model-head', async (view) => {
	
	const model = await view.get('model')
	const db = await view.get('db')
	const brand_nick = await view.get('brand_nick')
	const model_nick = await view.get('model_nick')
	const item_index = await view.get('item_index')
	const partner = await view.get('partner')
	const base = await view.get('base')


	if (!model) {
		view.data.brand = await Catalog.getBrandByNick(db, brand_nick)
		view.data.title = `${view.data.brand?.brand_title ?? brand_nick ?? ''} ${model_nick}`
		return view.ret()
	}

	const item = model.items[item_index]

	const ar = []
	ar.push(`${model.brand_title} ${model.model_title}`)
	ar.push(getModItemPropValue(item, model, 'Наименование'))
	const position = getModItemPropValue(item, model, 'Позиция') || getModItemPropValue(item, model, 'Арт') || ''
	if (position) ar.push(position)
	view.data.title = ar.filter(r => r).join(' ')
	

	view.data.canonical = `/catalog/${model.brand_nick}/${model.model_nick}`;
	if (item_index > 1)
	view.data.canonical += `/${item_index}`


	let text = getModItemPropValue(item, model, 'Описание')


	text = text.replace(/<style([\S\s]*?)>([\S\s]*?)<\/style>/ig, '').replace(/<h1[^>]*>.*<\/h1>/iu, "").replace(/<\/?[^>]+(>|$)/g, " ").replace(/\s+/," ").trim()
	const r = text.match(/.{200}[^\.!]*[\.!]/u)
	text = (r ? r[0] : text).replaceAll(' ,', ',')

	view.data.description = text + (position ? ' ' + position : '')


	if (model.images) {
		view.data.image_src = /^http/.test(model.images[0]) ? model.images[0] : '/' + model.images[0]
	}
	return view.ret()		
})


rest.addResponse('get-model', async (view) => {
	
	const model = await view.get('model')

	const base = await view.get('base')

	const md = await view.get('md')
	
	const db = await view.get('db')

	

	const { brand_nick, model_nick, partner } = await view.gets(['brand_nick','model_nick','partner'])


	view.data.m = md.m
	view.data.md = md

	
	view.data.partner = partner?.key || ''
	view.data.brand = await Catalog.getBrandByNick(db, brand_nick)
	if (!model) return view.err('Модель не найдена', 404)
	if (model.texts) {
		model.texts = await Promise.all(model.texts.map(src => {
			const ext = (i => ~i ? src.slice(i + 1) : '')(src.lastIndexOf('.'))
			if (ext == 'docx') return docx.read(Access, src)
			return fs.readFile(src, 'utf8')
		}))
	}

	if (model.files) {
		model.files = model.files.map(src => Files.srcInfo(src))
	}

	view.data.mod = model

	return view.ret()
})
// rest.addResponse('get-item', async (view) => {
// 	const { model, base, md, db, brand_nick, model_nick, partner } = await view.gets(['model', 'base', 'md', 'db', 'brand_nick','model_nick','partner'])
// 	view.data.m = md.m
// 	view.data.md = md
	
// 	view.data.partner = partner?.key || ''
// 	view.data.brand = await Catalog.getBrandByNick(db, brand_nick)
// 	if (!model) return view.err()
// 	if (model.texts) {
// 		model.texts = await Promise.all(model.texts.map(src => {
// 			const ext = (i => ~i ? src.slice(i + 1) : '')(src.lastIndexOf('.'))
// 			if (ext == 'docx') return docx.read(Access, src)
// 			return fs.readFile(src, 'utf8')
// 		}))
// 	}

// 	if (model.files) {
// 		model.files = model.files.map(src => Files.srcInfo(src))
// 	}

// 	view.data.mod = model

// 	return view.ret()
// })












const isSome = (obj, p) => {
	for (p in obj) return true
	return false
};
rest.addResponse('get-filters', async (view) => {
	const { db, md, partner, base, options} = await view.gets(['db','md','partner', 'base', 'options'])
	view.data.m = md.m
	view.data.md = md
	const group = await Catalog.getMainGroup(view, md)
	if (!group) return view.err('Нет данных')
	const res = {}
	const opt = await Catalog.getGroupOpt(db, view.visitor, group.group_id)
	const filters = []


	if (md.more) for (const prop_nick in md.more) {
		const prop = await base.getPropByNick(prop_nick);
		if (~opt.filters.indexOf(prop.prop_title)) continue
		const filter = await Catalog.getFilterConf(view, prop, group.group_id, md, partner)
		if (!filter) continue
		filters.push(filter)
	}

	for (const prop_title of opt.filters) {
		const prop = await base.getPropByTitle(prop_title)
		const filter = await Catalog.getFilterConf(view, prop, group.group_id, md, partner)
		if (!filter) continue
		filters.push(filter)
	}
	await Catalog.mdvalues(view, base, md, res)
	


	res.filters = filters
	Object.assign(view.data, res)
	return view.ret()
})

const getFirst = obj => { for (const i in (obj || {})) return i }
const getSearchPageSrc = async (db, options, md, value) => {
	let nick = nicked(value)
	if (!nick) nick = getFirst(md.group)
	if (!nick) nick = getFirst(md.brand)
	if (!nick) nick = nicked(md.search)
	if (!nick) nick =  options.root_nick
	const conf = await config('showcase')
	const src = conf.pages + nick
	return src
}
rest.addResponse('get-search-page', async (view) => {
	const db = await view.get('db')
	const value = await view.get('value')
	const md = await view.get('md')
	const options = await view.get('options')
	
	const src = await getSearchPageSrc(db, options, md, value)
	
	const reans = await rest_docx.get('get-html', { src }, view.visitor)

	if (reans.status == 404) {
		reans.data = `<script>console.log('Статья поиска ${src}')</script>`
	}
	view.data = reans.data
	view.ext = reans.ext
	view.nostore = false
	return reans.data
})
rest.addResponse('get-search-groups', async (view) => {
	
	const db = await view.get('db')
	const value = await view.get('value')
	const md = await view.get('md')
	const partner = await view.get('partner')
	const options = await view.get('options')
	
	view.data.m = md.m
	view.data.md = md

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

	view.data.root_title = options.root_title

	const brand = await Catalog.getMainBrand(db, md)
	const groupnicks = await Catalog.getGroups(view)
	const tree = await Catalog.getTree(db, view.visitor)
	const group = await Catalog.getMainGroup(view, md)
	if (!group) return view.err('Нет данных')

	const parent = group.parent_id ? tree[group.parent_id] : group
	const nmd = { ...md } //, title: {}
	nmd.group = { ...md.group }
	nmd.group[parent.group_nick] = 1
	nmd.m = Catalog.makemark(nmd).join(':')
	const group_ids = await Catalog.getGroupIds(view, nmd, partner)
	


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
	const groups = work.childs.map((id) => {
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
	const base = await view.get('base')
	await Catalog.mdvalues(view, base, md, res)
	// const mdvalues = {}
	// const mdprops = {}
	// for (const prop_nick in md.more) {
	// 	const prop = await base.getPropByNick(prop_nick)
	// 	mdprops[prop_nick] = prop
	// 	for (const value_nick in md.more[prop_nick]) {
	// 		if (prop.type == 'value') {
	// 			mdvalues[value_nick] = await Catalog.getValueByNick(view, value_nick)
	// 		} else {
	// 			let unit = ''
	// 			if (prop.opt.unit) unit = '&nbsp'+prop.opt.unit
	// 			let value_title
	// 			if (value_nick == 'upto') {
	// 				value_title = 'до ' + md.more[prop_nick][value_nick].replace('-','.')
	// 			} else if (value_nick == 'from') {
	// 				value_title = 'от ' + md.more[prop_nick][value_nick].replace('-','.')
	// 			} else {
	// 				value_title = Number(value_nick.replace('-','.'))
	// 			}
	// 			value_title += unit
				
	// 			mdvalues[value_nick] = {value_nick, value_title}
	// 		}
	// 	}
	// }
	// res.mdvalues = mdvalues
	// res.mdprops = mdprops
	
	Object.assign(view.data, res)
	return view.ret()
})


rest.addResponse('get-search-list', async (view) => {	
	const db = await view.get('db')
	const value = await view.get('value')
	const md = await view.get('md')
	const partner = await view.get('partner')
	const page = await view.get('page')
	const count = await view.get('count')
	const base = await view.get('base')
	const options = await view.get('options')
	
	view.data.m = md.m
	view.data.md = md
	const {from, where, sort} = await Catalog.getmdwhere(view, md, partner)


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
	view.data.type = type

	
	const group = await Catalog.getMainGroup(view, md)
	if (!group) return view.err('Нет данных')
	const opt = await Catalog.getGroupOpt(db, view.visitor, group.group_id)
	view.data.limit = options.limit
	const countonpage = count || options.limit
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
		${sort.length ? `ORDER BY ${sort.join(',')}` : ''}
		LIMIT ${start}, ${countonpage}
	`)
	const total = await db.col(`
		SELECT count(distinct m.model_id)
		FROM ${from.join(', ')}
		WHERE ${where.join(' and ')}
	`)

	const list = await Catalog.getModelsByItems(db, base, moditem_ids, partner)

	const brand = await Catalog.getMainBrand(db, md)
	
	let last = total <= countonpage ? 1 : Math.ceil(total / countonpage)
	const pagination = {
		last: last,
		page: last < page ? last + 1 : page
	}
	const res = { list, brand, pagination, count:total, countonpage }
	Object.assign(view.data, res)
	// if (md.search) {
	// 	if (!list.length) {
	// 		return view.ret('Позиций не найдено', 404)
	// 	}
	// }
	if (!list.length) view.status = 404
	return view.ret()
})
rest.addResponse('get-search-head', async (view) => {

	const db = await view.get('db')
	const value = await view.get('value')
	const md = await view.get('md')
	const options = await view.get('options')

	view.data.m = md.m
	view.data.md = md
	const group = await Catalog.getMainGroup(view, md)
	if (!group) return view.err('Нет данных')
	const brand = await Catalog.getMainBrand(db, md)

	if (brand && !group.parent_id) {
		view.data.title = brand.brand_title
		view.data.canonical = brand.brand_nick
	} else {
		view.data.title = group.group_title
		if (group.parent_id) {
			view.data.canonical = group.parent_id ? group.group_nick : ''
		} else {
			view.data.canonical = ''		
		}
	}
	if (value) view.data.thisischild = true
	if (view.data.canonical) view.data.canonical = '/' + view.data.canonical

	if (md.search) {
		view.data.title += ' ' + md.search
		view.data.description = 'Поиск в каталоге по запросу ' + md.search
	}

	const src = await getSearchPageSrc(db, options, md, value)
	
	const reans = await rest_docx.get('get-head', { src }, view.visitor)
	if (reans.data.description) {
		view.data.description = reans.data.description
	}
	if (reans.data.image_src) {
		view.data.image_src = reans.data.image_src
	}
	

	return view.ret()
})
rest.addResponse('get-search-sitemap', async (view) => {
	const options = await Showcase.getOptions(view.visitor)
	const db = await view.get('db')
	let rel = await view.get('rel')
	const drel = rel ? rel + '/' : ''
	
	const headings = view.data.headings = {}
	headings[''] = {title: '', items:{}}
	headings[''].items[rel] = {title: options.root_title}

	const brands = await Catalog.getBrands(db)
	let items = {}
	for (const brand_nick in brands) {
		const brand = brands[brand_nick]
		items[drel + brand_nick] = {
			title: brand.brand_title
		}
	}
	headings[nicked('Бренды')] = { title:'Бренды', items }


	const groups = await Catalog.getGroups(view)
	items = {}
	for (const group_nick in groups) {
		const group = groups[group_nick]
		if (!group.parent_id) continue
		items[drel + group_nick] = {
			title: group.group_title
		}
	}
	headings[nicked('Группы')] = { title:'Группы', items}

	
	const models = await db.all(`
		SELECT m.model_nick, m.model_title, b.brand_nick, b.brand_title
		FROM showcase_models m, showcase_brands b, showcase_items i
		WHERE m.brand_id = b.brand_id and i.item_num = 1 and i.model_id = m.model_id
	`)
	items = {}
	models.forEach(mod => {
		const key = mod.brand_nick + '/' + mod.model_nick
		items[drel + key] = {
			title: mod.brand_title + ' ' + mod.model_title
		}
	})
	view.data.headings[nicked('Модели')] = {title:'Модели', items}
	return view.ret()
})

rest.addResponse('get-catalog', async (view) => {
	const db = await view.get('db')
	
	const tree = await Catalog.getTree(db, view.visitor)
	
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

	view.data.childs = childs
	return view.ret()
})
rest.addResponse('get-nalichie', async (view) => {
	const { db, options, partner, base } = await view.gets(['db', 'partner', 'base','options'])
	view.data.list = await Access.relate(rest).once('get-nalichie', async () => {
		const lim = 100
		const vals = options.actions.map(v => nicked(v)).filter(v => v).sort()
		const p = await base.getPropByTitle('Наличие')
		if (!p) return []
		const { prop_id } = p

		if (!prop_id) return
		const value_ids = []

		const db = base.db
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
		const models = await Catalog.getModelsByItems(db, base, moditem_ids, partner)
		
		return models
	})
	return view.ret()
})

rest.addResponse('get-partner', async (view) => {
	const { partner } = await view.gets(['partner'])
	view.data.partner = partner?.title || partner?.key || ''
	if (partner) view.data.descr = partner.descr || ''
	return partner ? view.ret() : view.nope()
})
// import theme from '/-controller/Theme.js'
// rest.addResponse('set-partner', async (view) => {
// 	const { partner } = await view.gets(['partner'])
// 	if (!partner) return view.err('Ключ устарел или указан с ошибкой')
// 	//them.harvest(view.req, view.visitor.client.cookie)
// 	//them.torow()
// 	console.log(view.visitor)
// 	view.data.partner = partner.title || partner.key || ''
// 	view.data.descr = partner.descr || ''
// 	return view.ret()
// })

import { MAIL } from './order.mail.html.js'
rest.addResponse('set-order', async (view) => {
	await view.gets(['recaptcha','terms'])
	const { base, db } = await view.gets(['db', 'base'])
	
    const user = await view.gets(['text', 'email#required', 'phone#required', 'brand_nick','model_nick', 'utms', 'partner'])
    user.host = view.visitor.client.host
    user.ip = view.visitor.client.ip
    user.model = await Catalog.getModelByNick(view, user.brand_nick, user.model_nick, user.partner)
    const html = MAIL(user)
    
    
    const r = await mail.toAdmin(`Заявка ${user.host} ${user.email}`, html, user.email)
    if (!r) return view.err('Сообщение не отправлено из-за ошибки на сервере')


	return view.ret()
})






rest.addResponse('get-maingroups', async (view) => {	
	const { db, options, base, partner } = await view.gets(['db', 'options', 'base','partner'])
	const root_id = await base.getGroupIdByNick(options.root_nick)

	if (!root_id) return view.err('Не найдена верхняя группа')
	
	const imgprop = await base.getPropByNick('images')
	if (!imgprop) return view.err('Нет картинок')
	const costprop = await base.getPropByTitle('Цена')
	if (!costprop) return view.err('Нет цен')

	const cache = Access.relate(rest)
	const childs = await cache.konce('get-maingroups', partner.key, async () => {
		const tree = await Catalog.getTree(db, view.visitor)
		let root = tree[root_id]
		if (root.childs.length == 1) root = tree[root.childs[0]] //fix для hugong когда есть одна общая группа верхнего уровня
		const childs = await Promise.all(root.childs.map(async group_id => {
			const group = tree[group_id]
			const sql = `
				SELECT distinct f.src as image, m.model_nick, b.brand_nick, 
					m.model_title, 
					ip_cost.number as cost,
					GROUP_CONCAT(ip_cost.number separator ',') as arcost,
					b.brand_title
				FROM 
					showcase_models m,
					showcase_brands b,
					showcase_iprops ip_img,
					showcase_iprops ip_cost,
					showcase_files f
				WHERE 
					m.group_id in (${group.groups.join(',')})
					and ip_img.prop_id = ${imgprop.prop_id}
					and ip_cost.prop_id = ${costprop.prop_id}
				 	and b.brand_id = m.brand_id
					and ip_img.model_id = m.model_id
					and ip_cost.model_id = m.model_id
					and ip_img.item_num = ip_cost.item_num
					and f.file_id = ip_img.file_id
				GROUP BY m.model_id
				ORDER BY RAND()
				LIMIT 12
			`
			const images = await db.all(sql)
			images.forEach(row => {
				if (row.arcost) {
					const arcost = row.arcost.split(',')
					if (arcost.length > 1) {
						row.min = Math.min(arcost)
						row.max = Math.max(arcost)
					}
				}
				row.cost = Number(row.cost)
			})
			images.sort((a, b) => {
				return a.cost - b.cost
			})
			return {
				images,
				group_title: group.group_title,
				group_nick: group.group_nick
			}
		}))
		return childs
	})
	view.data.childs = childs.filter(g => g.images.length)
	return view.ret()
})


export default rest