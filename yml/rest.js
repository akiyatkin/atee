import Rest from "/-rest"
import tpl from "/-yml/yml.html.js"
import yml from '/-yml'
import config from '/-config'

import db_vars from "/-db/vars.js"
import rest_funcs from "/-rest/funcs.js"

const rest = new Rest(db_vars, rest_funcs)

rest.addArgument('feed')

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
	const { feed, db, visitor } = await view.gets(['db', 'visitor', 'feed'])
	const poss = await yml.data(db, visitor, feed)
	const conf = await config('yml')
	const mail = await config('mail')
	const host = visitor.client.host
	
	const data = {}
	data.groups = await yml.groups()
	poss.forEach(pos => {
		if (pos.images) pos.images = pos.images.map(src => 'https://' + host + '/' + encodeURI(src));
		['Описание', 'Наименование', 'model_title'].forEach(name => pos[name] = tostr(pos[name]))
		if (pos.more) for (const name in pos.more) pos.more[name] = tostr(pos.more[name])
	})
	data.poss = poss
	
	const xml = tpl.ROOT(data, {host, email: mail.to, ...conf})
	return {ext:'xml', ans:xml}
})
export default rest