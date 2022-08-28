import { Meta } from "/-controller/Meta.js"
import { nicked } from "/-nicked/nicked.js"
import { unique } from "/-nicked/unique.js"
import { Access } from "/-controller/Access.js"
import { Catalog } from "/-catalog/Catalog.js"
import { Db } from "/-db/Db.js"

import { rest_live } from './rest_live.js'
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
meta.addFunction('array', (view, n) => n ? n.split(',') : [])
meta.addFunction('nicks', ['array'], (view, ns) => ns.map(v => nicked(v)).filter(v => v))


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
const getNalichie = Access.cache(async (vals, lim) => {
	const db = await new Db().connect()
	const { prop_id } = await Catalog.getProp('Наличие')
	const options = await Catalog.getOptions()
	if (!prop_id) return
	const value_ids = []

	//Уточнинили критерий поиска
	for (const value_nick of vals) {
		const value_id = await db.col('SELECT value_id from showcase_values where value_nick = :value_nick', { value_nick })
		if (!value_id) continue
		value_ids.push(value_id)
	}

	if (!value_ids.length) return []
	
	//Нашли все модели
	const model_ids = await db.colAll(`
		SELECT distinct ip.model_id
		FROM 
			showcase_iprops ip
		WHERE 
			ip.prop_id = :prop_id
			and ip.value_id in (${value_ids.join(',')})
	`, { prop_id })

	if (!model_ids.length) return []

	//Заполнили основными данными
	const models = await db.all(`SELECT 
		m.model_id, m.model_nick, m.model_title, b.brand_title, b.brand_nick, g.group_nick, g.group_title, g.group_id
		FROM showcase_models m, showcase_brands b, showcase_groups g

		WHERE m.brand_id = b.brand_id and m.group_id = g.group_id
		and m.model_id in (${model_ids.join(',')})
	`)
	for (const model of models) {
		await Catalog.getValue(db, model, 'images', model.model_id)
		await Catalog.getValue(db, model, 'Цена', model.model_id)
		await Catalog.getValue(db, model, 'Наименование', model.model_id)
		await Catalog.getValue(db, model, 'Наличие', model.model_id)
		await Catalog.getValue(db, model, 'Старая цена')
	}

	//Заполнили данными для карточек
	for (const model of models) {
		const { props } = await Catalog.getGroupOptions(model.group_id)
		
		model.props = []
		for (const pr of props) {			
			if (model[pr.value_title]) {
				model.props.push(pr)
				continue //В props хранится порядок в том числе свойств имеющихся по умолчанию
			}
			const value = await Catalog.getValue(db, pr.prop_nick, model.model_id, 1)
			if (!value) continue
			model[pr.value_title] = value
			model.props.push(pr)	
		}
	}
	return models
})

meta.addAction('get-nalichie', async (view) => {
	const { db, vals, lim } = await view.gets(['db','vals','lim'])
	view.ans.list = await getNalichie(vals, lim)
	return view.ret()
})


export const rest = async (...args) => {
	const [query, get, { host, cookie, ip }] = args 
	const ans = await meta.get(query, { ...get, host, ip } )
	return { ans, 
		ext: 'json', 
		status: ans.status ?? 200, 
		nostore: false 
	}
}
