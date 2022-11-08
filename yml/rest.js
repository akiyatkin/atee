import Meta from "/-controller/Meta.js"
import tpl from "/-yml/yml.html.js"
import { Db } from "/-db/Db.js"
export const meta = new Meta()
import yml from '/-yml'
import config from '/-config'

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
meta.addArgument('visitor')
meta.addArgument('feed')

const tostr = str => {
	if (!str) return ''
	str = str.replaceAll(/\&/g, '&amp;')
	str = str.replaceAll(/</g, '&lt;')
	str = str.replaceAll(/>/g, '&gt;')
	str = str.replaceAll(/"/g, '&quot;')
	str = str.replaceAll(/'/g, '&apos;')
	return str
}
meta.addAction('get-feeds', async view => {
	const conf = await config('yml')
	view.ans.data = Object.keys(conf.feeds)
	return view.ret()
})
meta.addAction('get-yandex', async view => {
	const { feed, db, visitor } = await view.gets(['db', 'visitor', 'feed'])
	const poss = await yml.data(db, visitor, feed)
	view.ans.ext = 'xml'
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
	view.ans.data = tpl.ROOT(data, {host, email: mail.to, ...conf})
	return view.ret()
})

export const rest = async (query, get, visitor) => {
	const req = {...get, visitor}
	const ans = await meta.get(query, req)
	
	return { ans: ans.data, ext: ans.ext || 'json', status:200, nostore:false }
}