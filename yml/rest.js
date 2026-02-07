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

// rest.addArgument('feed', ['nicked'], async (view, feed) => {
// 	const conf = await config('shop')
// 	return conf.pages[feed]
// })
// rest.addVariable('feed#required', ['feed', 'required'])
// rest.addVariable('feed#always', ['feed'], async (view, feed) => {
// 	if (feed) return feed
// 	const conf = await config('shop')
// 	if (!conf.pages.main) return view.err('Не найден main feed')
// 	return conf.pages.main
// })


const escapeHTML = str => typeof(str) != 'string' ? str : str.replace(/[&<>'"]/g, tag => ({
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	"'": '&#39;',
	'"': '&quot;'
}[tag]));

rest.addResponse('get-feeds', async view => {
	const conf = await config('shop')
	view.ans.data = Object.keys(conf.pages)
	return view.ret()
})

rest.addResponse('get-yandex', async view => {

	const page = await view.get('page#always')
	const db = await view.get('db')
	const partner = await view.get('partner')

	const host = view.visitor.client.host
	const bind = await Shop.getBind(db)

	const group = await Shop.getGroupByNick(db, page.group_nick)

	if (!group) return view.err('Группа не найдена ' + page.group_nick)
	const group_id = group.group_id
	
	const data = {}
	data.partner = partner
	
	

	const {count, list} = await Shop.getPlopsWithPropsNoMultiByMd(db, group_id, [page.mget], page.hashs, partner, {
		limit: false,
		rand: false,
		add_group_ids: true,
		add_group_nicks: true,
		//nicks:['art'], //brendmodel_nick, brendart_nick есть всегда они берутся из стартового запроса и явно указывать их не надо
		titles:[
			'brendmodel',
			'brend',
			'model',
			'naimenovanie',
			'opisanie',
			'images',
			'staraya-cena',
			'cena'
		]
	})

	const models = Object.groupBy(list, row => row.brendmodel_nick)
	for (const brendmodel_nick in models) {
		const model = {}
		for (const item of models[brendmodel_nick]) {
			delete item.brendart_nick
			for (const prop_nick in item) {
				model[prop_nick] ??= []
				model[prop_nick].push(item[prop_nick])
			}
		}
		for (const prop_nick in model) {
			model[prop_nick] = unique(model[prop_nick]).sort()
		}
		
		models[brendmodel_nick] = model
		
		model['group_nicks'] = unique(model['group_nicks'].flat())
		model['group_ids'] = unique(model['group_ids'].flat())


		// model['group_nicks'].push(...model.group_nicks)
		// model['group_ids'] ??= []
		// model['group_ids'].push(...model.group_ids)
		//model['group_ids'] = model['group_ids']

		for (const single of ['images_title', 'brendmodel_nick','brendmodel_title','brend_title','model_title','naimenovanie_title','opisanie_title']) {
			if (!model[single]) continue
			model[single] = model[single][0]
		}
		for (const minify of ['cena_title','staraya-cena_title']) {
			model[minify] = Math.min(...model[minify])
		}
		if (model['cena'] < model['staraya-cena']) delete model['staraya-cena']	
	}	

	data.list = Object.values(models)	
	data.group_ids = []
	for (const item of data.list) {
		data.group_ids.push(...item.group_ids.flat())
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
	
	
	// groups.forEach(group => {
	// 	if (group.icon) group.icon = /^http/.test(group.icon) ? encodeURI(group.icon) : 'https://' + host + '/' + encodeURI(group.icon);
	// 	['description', 'group_title'].forEach(name => group[name] = escapeHTML(group[name]))
	// })

	const mail = await config('mail')
	const shop = await config('shop', true)
	const xml = tpl.ROOT(data, {shop, host: view.visitor.client.host, email: mail.main || ''})
	view.ext = 'xml'

	return xml
})
export default rest