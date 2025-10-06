import nicked from '/-nicked'
import Shop from "/-shop/Shop.js"
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

import rest_search from "/-dialog/search/rest.search.js" //аргументы hashs, hash, search 
rest.extra(rest_search)



rest.addVariable('root#required', async view => {
	const conf = await config('shop')
	const db = await view.get('db')
	const group_id = await Shop.getGroupIdByNick(db, conf.root_nick)
	const root = await Shop.getGroupById(db, group_id)
	if (!root) return view.err('Группа верхнего уровня не найдена', conf.root_nick)
	return root
})

rest.addArgument('image_src', ['string'])

rest.addArgument('p', ['sint','unsigned','1'])
rest.addArgument('count', ['sint','unsigned','0'])


rest.addArgument('group_id', ['mint'])
rest.addVariable('group_id#required', ['group_id','required'])



rest.addArgument('group_nick', ['nicked'], async (view, group_nick) => {
	if (!group_nick) return null
	const db = await view.get('db')
	const group_id = await Shop.getGroupIdByNick(db, group_nick)
	if (!group_id) return view.err('Группа не найдена', 404)
	
	if (!await Shop.isInRootById(db, group_id)) return view.err('Нет доступа к группе', 403)
	
	return group_nick

})
rest.addVariable('group', async (view) => { //by group_nick
	const conf = await config('shop')
	const group_nick = await view.get('group_nick') || conf.root_nick
	const db = await view.get('db')
	const group_id = await Shop.getGroupIdByNick(db, group_nick)
	const group = await Shop.getGroupById(db, group_id)	
	return group
})
rest.addVariable('group_nick#required', ['group_nick', 'required'])
rest.addVariable('group#required', ['group', 'required'])



rest.addArgument('prop_nick', ['nicked'], async (view, prop_nick) => {
	if (!prop_nick) return null
	const db = await view.get('db')
	const prop = await Shop.getPropByNick(db, prop_nick)
	if (!prop) return view.err('Свойство не найдено', 404)	
	return prop_nick

})
rest.addVariable('prop', async (view) => {
	const group_nick = await view.get('prop_nick#required')
	const db = await view.get('db')
	const prop = await Shop.getPropByNick(db, group_nick)
	return prop
})
rest.addVariable('prop_nick#required', ['prop_nick', 'required'])
rest.addVariable('prop#required', ['prop', 'required'])



/*
rest.addArgument('hru', ['string'])
rest.addVariable('hru#required', ['hru', 'required'])
Если нужна страница бренда, надо создать такую группу и она должна быть вложена в Каталог. 
У группы может быть статус коллекция, что будет означать что группа в иерархии не показана, но подгруппы будут показаны.
*/



// rest.addArgument('search', ['string']) //Строка поиска
// rest.addVariable('hashs', ['search'], (view, hashs) => {
// 	hashs = hashs.split(',').map(hash => unique(nicked(hash).split('-')).filter(r => r).sort()).filter(r => r.length)
// 	return hashs
// })

rest.addArgument('partner', async (view, key) => {
	if (!key) return false
	const partner = await Shop.getPartnerByKey(key)
	return partner
})


rest.addArgument('m', (view, m) => {
	if (m) view.nostore = true //безчисленное количество комбинаций, браузеру не нужно запоминать	
	return m || ''
})
rest.addVariable('md', async (view) => {
	const db = await view.get('db')
	const origm = await view.get('m')
	const query = await view.get('query')
	const hashs = await view.get('hashs')
	
	const md = await Shop.getmd(db, origm, query, hashs)
	return md
})



rest.addArgument('brendmodel', ['nicked'])
rest.addVariable('brendmodel#required', ['brendmodel', 'required'])
rest.addArgument('art', ['nicked'])
rest.addVariable('art#required', ['art', 'required'])

rest.addVariable('model#required', async view => {
	const db = await view.get('db')
	
	const brendmodel = await view.get('brendmodel#required')
	const partner = await view.get('partner')

	const model = await Shop.getModelByBrendmodel(db, brendmodel, partner)
	if (!model) return view.err('Модель не найдена', 404)
	return model
})