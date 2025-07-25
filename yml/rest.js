import Rest from "/-rest"
import tpl from "/-yml/yml.html.js"
import yml from '/-yml'
import config from '/-config'

import rest_vars from "/-db/rest.db.js"
import rest_funcs from "/-rest/rest.funcs.js"
import rest_catalog from '/-catalog/rest.vars.js'
const rest = new Rest(rest_vars, rest_funcs, rest_catalog)

rest.addArgument('feed', (view, r) => r || 'main')

const tostr = str => {
	if (!str) return ''
	str = str.replaceAll(/\&/g, '&amp;')
	str = str.replaceAll(/</g, '&lt;')
	str = str.replaceAll(/>/g, '&gt;')
	str = str.replaceAll(/"/g, '&quot;')
	str = str.replaceAll(/'/g, '&apos;')
	return str
}
rest.addResponse('get-feeds', async view => {
	const conf = await config('yml')
	view.ans.data = Object.keys(conf.feeds)
	return view.ret()
})

rest.addResponse('get-yandex', async view => {

	const feed = await view.get('feed')
	const db = await view.get('db')
	const partner = await view.get('partner')

	const poss = await yml.data(view, feed, partner)
	
	const conf = await config('yml')
	const mail = await config('mail')
	const host = view.visitor.client.host
	
	

	const data = {}
	const groups = await yml.groups(view)
	groups.forEach(group => {
		if (group.icon) group.icon = /^http/.test(group.icon) ? encodeURI(group.icon) : 'https://' + host + '/' + encodeURI(group.icon);
		['description', 'group_title'].forEach(name => group[name] = tostr(group[name]))
	})
	data.groups = groups

	poss.forEach(pos => {
		if (pos.images) pos.images = pos.images.map(src => /^http/.test(src) ? encodeURI(src) : 'https://' + host + '/' + encodeURI(src));
		['Описание', 'Наименование', 'model_title'].forEach(name => pos[name] = tostr(pos[name]))
		if (pos.more) for (const name in pos.more) pos.more[name] = tostr(pos.more[name])
	})
	data.partner = partner
	data.poss = poss
	
	const xml = tpl.ROOT(data, {host, email: mail.main || '', ...conf})
	view.ext = 'xml'
	return xml
})
export default rest