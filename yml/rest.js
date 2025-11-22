import Rest from "@atee/rest"
import tpl from "/-yml/yml.html.js"
import yml from '@atee/yml'
import config from '@atee/config'
import unique from "/-nicked/unique.js"
import Shop from "/-shop/Shop.js"


import rest_vars from "/-db/rest.db.js"
import rest_funcs from "/-rest/rest.funcs.js"
import rest_catalog from '/-shop/rest.shop.js'
const rest = new Rest(rest_vars, rest_funcs, rest_catalog)

rest.addArgument('feed', ['nicked'], async (view, feed) => {
	const conf = await config('yml')
	return conf.feeds[feed]
})
rest.addVariable('feed#required', ['feed', 'required'])
rest.addVariable('feed#always', ['feed'], async (view, feed) => {
	if (feed) return feed
	const conf = await config('yml')
	if (!conf.feeds.main) return view.err('Не найден main feed')
	return conf.feeds.main
})


const escapeHTML = str => typeof(str) != 'string' ? str : str.replace(/[&<>'"]/g, tag => ({
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	"'": '&#39;',
	'"': '&quot;'
}[tag]));

rest.addResponse('get-feeds', async view => {
	const conf = await config('yml')
	view.ans.data = Object.keys(conf.feeds)
	return view.ret()
})

rest.addResponse('get-yandex', async view => {

	const feed = await view.get('feed#always')
	const db = await view.get('db')
	const partner = await view.get('partner')

	const host = view.visitor.client.host
	const bind = await Shop.getBind(db)
	const group = await Shop.getGroupByNick(db, feed.group_nick)
	if (!group) return view.err('Группа не найдена ' + feed.group_nick)
	const group_id = group.group_id
	
	const data = {}
	data.partner = partner
	
	console.time('get-yandex')	

	const {count, list} = await Shop.getPlopsWithPropsNoMultiByMd(db, group_id, feed.samples, feed.hashs, partner, {
		limit: false,
		rand: false,
		add_group_ids: true,
		add_group_nicks: true,
		nicks:['art'], //brendmodel_nick, brendart_nick есть всегда они берутся из стартовой таблицы и явно указывать их не надо
		titles:[
			'art',
			'brendart',
			'brendmodel',
			'brend',
			'model',
			'naimenovanie',
			'opisanie',
			'images',
			'nalichie',
			'staraya-cena',
			'cena'
		]
	})
	data.list = list

	
	data.group_ids = []
	for (const item of data.list) {
		data.group_ids.push(...item.group_ids)
	}
	data.group_ids = unique(data.group_ids)
	



	data.groups = {}
	data.group_nicks = []
	data.group_descriptions = {}
	data.group_icons = {}
	for (const group_id of data.group_ids) {
		const group = await Shop.getGroupById(db, group_id)
		const group_nick = group.group_nick
		data.group_nicks.push(group_nick)
		data.group_descriptions[group_nick] = await Shop.getGroupPage(group_nick, view.visitor)
		const icon = await Shop.getGroupIcon(group_nick, view.visitor)
		if (icon) {
			data.group_icons[group_nick] = 'https://' + host + '/' + encodeURI(icon)
		}
		//{group_id, parent_id, group_title, group_nick, icon, description}
		data.groups[group_nick] = group
	}

	const prepareSrc = src => /^http/.test(src) ? encodeURI(src) : 'https://' + host + '/' + encodeURI(src)
	for (const item of data.list) {
		if (item.images_title) item.images_title = prepareSrc(item.images_title)
		for (const name in item) { //['opisanie', 'naimenovanie', 'model']
		 	item[name] = escapeHTML(item[name])
		}
	}
	console.timeEnd('get-yandex')
	
	
	// groups.forEach(group => {
	// 	if (group.icon) group.icon = /^http/.test(group.icon) ? encodeURI(group.icon) : 'https://' + host + '/' + encodeURI(group.icon);
	// 	['description', 'group_title'].forEach(name => group[name] = escapeHTML(group[name]))
	// })

	const mail = await config('mail')
	const conf = await config('yml', true)
	const shop = await config('shop', true)
	const xml = tpl.ROOT(data, {conf, shop, host: view.visitor.client.host, email: mail.main || ''})
	view.ext = 'xml'
	return xml
})
export default rest