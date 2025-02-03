import nicked from '/-nicked'
import Bed from "/-bed/Bed.js"
import User from "/-user/User.js"
import config from "/-config"

import Rest from "/-rest"
const rest = new Rest()
export default rest

import rest_funcs from '/-rest/rest.funcs.js'
rest.extra(rest_funcs)

import rest_db from '/-db/rest.db.js'
rest.extra(rest_db)


rest.addArgument('page_nick', ['nicked'])
rest.addArgument('page', ['page_nick'], async (view, page_nick) => {
	if (page_nick == null) return null
	const db = await view.get('db')
	const page = await Bed.getPageByNick(db, page_nick)
	if (!page) return view.err('Страница не найдена', 404)
	page.parent = page.parent_id ? await Bed.getPageById(db, page.parent_id) : false
	return page
})
rest.addVariable('page#required', ['page', 'required'])


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
	const m = await view.get('m')
	const page = await view.get('page#required')
	
	const mget = Bed.makemd(m)

	const mpage = await Bed.getMpage(db, page.page_id)

	return {m: Bed.makemark(mget).join(':'), mget, mpage}
})