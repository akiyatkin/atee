import nicked from '/-nicked'
import Bed from "/-bed/Bed.js"
import User from "/-user/User.js"
import config from "/-config"

import Rest from "/-rest"
import unique from "/-nicked/unique.js"

const rest = new Rest()
export default rest

import rest_funcs from '/-rest/rest.funcs.js'
rest.extra(rest_funcs)

import rest_db from '/-db/rest.db.js'
rest.extra(rest_db)

rest.addArgument('p', ['int'], (view, n) => n || 1)
rest.addArgument('count', ['int'])
rest.addArgument('page_nick', ['nicked'])
rest.addVariable('page', ['page_nick'], async (view, page_nick) => {
	if (page_nick == null) return null
	const db = await view.get('db')
	const page = await Bed.getPageByNick(db, page_nick)
	if (!page) return view.err('Страница не найдена', 404)
	page.parent = page.parent_id ? await Bed.getPageById(db, page.parent_id) : false
	return page
})
rest.addVariable('page#required', ['page', 'required'])



rest.addArgument('search', ['string']) //Строка поиска
rest.addVariable('hashs', ['search'], (view, hashs) => {
	hashs = hashs.split(',').map(hash => unique(nicked(hash).split('-')).filter(r => r).sort()).filter(r => r.length)
	return hashs
})



rest.addArgument('partner', async (view, partner_nick) => {
	const conf = await config('bed')
	const data = conf.partners[partner_nick]
	if (!data) return false
	data.key = partner_nick
	return data
})
rest.addArgument('m', (view, m) => {
	if (m) view.nostore = true //безчисленное количество комбинаций, браузеру не нужно запоминать	
	return m || ''
})

rest.addVariable('md', async (view) => {
	const conf = await config('bed')
	const db = await view.get('db')
	const origm = await view.get('m')
	const page = await view.get('page#required')

	const mgetorig = Bed.makemd(origm)
	page.mpage = await Bed.getMpage(db, page.page_id)
	

	const childs = await Bed.getChilds(db, page.group_id)
	const mdchilds = []
	for (const child of childs) {

		child.mpage = await Bed.getMpage(db, child.page_id)
		mdchilds.push(child.mpage)
	}
	const {props, values} = await Bed.getmdids(db, [mgetorig, page.mpage, ...mdchilds])

	page.mpage = Bed.mdfilter(page.mpage, props, values)

	for (const child of childs) {
		child.mpage = Bed.mdfilter(child.mpage, props, values)
	}

	const mget = Bed.mdfilter(mgetorig, props, values)
	
	const pos_entity_id = await db.col('SELECT prop_id FROM sources_props where prop_nick = :entity_nick', {entity_nick:nicked(conf.pos_entity_title)})
	const mod_entity_id = await db.col('SELECT prop_id FROM sources_props where prop_nick = :entity_nick', {entity_nick:nicked(conf.mod_entity_title)})
	
	const m = Bed.makemark(mget).join(':')
	return {m, page, mget, childs, props, values, pos_entity_id, mod_entity_id}

	
})