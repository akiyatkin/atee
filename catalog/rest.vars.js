import Rest from "/-rest"
import rest_funcs from '/-rest/rest.funcs.js'
import rest_db from '/-db/rest.db.js'
import nicked from '/-nicked'
const rest = new Rest(rest_funcs, rest_db)
import Catalog from "/-catalog/Catalog.js"
import User from "/-user/User.js"
import config from "/-config"

rest.addArgument('model_nick', ['nicked'])
rest.addArgument('brand_nick', ['nicked'])
rest.addArgument('item_num', ['int'], (view, n) => n || 1)
rest.addArgument('item_index', ['int'], (view, n) => n || 0)
rest.addVariable('item', async (view) => {
	const { brand_nick, model_nick, item_num, db, base } = await view.gets(['db', 'base', 'brand_nick', 'model_nick', 'item_num'])
	const item = await Catalog.getItemByNick(db, base, brand_nick, model_nick, item_num)
	return item
})
rest.addVariable('item#required', async (view) => {
	const { item } = await view.gets(['item'])
	if (!item) return view.err('Позиция не найдена')
	return item
})

rest.addVariable('model', async (view) => {
	const { brand_nick, model_nick, partner} = await view.gets(['brand_nick', 'model_nick', 'partner'])
	const model = await Catalog.getModelByNick(view, brand_nick, model_nick, partner)	
	return model
})
// rest.addVariable('partner', async (view) => {
// 	const { user_id } = await view.gets(['user_id'])
// 	const partner = user_id ? await Catalog.getPartner(view, user_id) : false
// 	//if (!partner) view.nostore = false //Тот у кого partner указан получит кэш и у него не будет редиректа
// 	return partner
// })
rest.addArgument('partner', async (view, partner_nick) => {
	const { options, db } = await view.gets(['options', 'db'])
	
	//const partner_nick = nicked(partner_title)
	const data = options.partners[partner_nick]
	if (!data) return false
	data.key = partner_nick

	// const user = await User.harvest(view)
	// if (user && user.partner_nick != partner_nick) {
	// 	//set нельзя тут делать
	// }
	
	
	return data
})
rest.addArgument('value', ['string'], (view, v) => v || '')

rest.addVariable('base', async (view) => { //depricated
	const { db } = await view.gets(['db'])
	const Base = await import('/-showcase/Base.js').then(r => r.default)
	return new Base({db, visitor: view.visitor})
})

rest.addResponse('get-options', async (view) => { //depricated
	const { base } = await view.gets(['base'])
	view.ans.options = await base.getOptions()
	return view.ret()
})

rest.addVariable('options', async (view) => { //depricated
	const { base } = await view.gets(['base'])
	return base.getOptions()
})

rest.addArgument('m', (view, m) => {
	if (m) view.nostore = true //безчисленное количество комбинаций, браузеру не нужно запоминать	
	return m
})

const prepareValue = async (db, base, options, value) => {
	const tree = await Catalog.getTree(db, base.visitor)
	const nick = nicked(value);
	let addm = ''
	if (nick) {
		if (nick == 'actions') {
			const vals = options.actions.map(v => nicked(v)).filter(v => v).sort()
			const p = await base.getPropByTitle('Наличие')
			if (p) {
				vals.forEach(v => () => addm += `:more.${p.prop_nick}.${v}=1`)
			}
		} else if (options.pages[nick]) {
			addm += options.pages[nick]
		} else {
			let group
			for (const group_id in tree) {
				if (tree[group_id].group_nick == nick) {
					group = tree[group_id]
					break
				}
			}
			if (group) {
				addm += `:group::.${nick}=1`;
			} else {
				const brands = await Catalog.getBrands(db)
				const brand = brands[nick]
				if (brand) {
					addm += `:brand::.${nick}=1`
				} else {
					addm += `:search=${value}`
				}
			}
		}
	}
	return addm
}
rest.DEFAULTMD = {}
const makemd = (m) => {
	m = m.replaceAll(/([^:]+)::\./ug, ":$1:$1.")
	const mds = m.split(':').filter(s => s).map((item) => {
        item = item.replace(/\+/g, '%20')
        const r = item.split('=')
        const data = []
        data[0] = decodeURIComponent(r.shift())
        data[1] = data.length ? decodeURIComponent(r.join('=')) : ''
        return data
    })

	
	const newmd = {}

	mds.forEach(data => {
		const name = data[0]
		const val = data[1]
		const r = name.split('.')
		let root = newmd
		const last = r.pop()
		let v
		while (v = r.shift()) {
			if (typeof(root[v]) != 'object') root[v] = {}	
			root = root[v]
		}
		if (!val) delete root[last]
		else root[last] = val
	})

	for (const i in rest.DEFAULTMD) {
		adddef(newmd, rest.DEFAULTMD, i)
	}
	return newmd
}
const adddef = (md, def, i) => {
	if (!Object.hasOwn(md, i)) {
		md[i] = structuredClone(def[i])
		return
	}
	if (typeof(def[i]) != 'object') return
	
	for (const j in def[i]) {
		if (typeof(md[i]) == 'object' && typeof(def[i][j]) != 'object') return
		adddef(md[i], def[i], j)
	}
}
rest.addVariable('md', async (view) => {
	let { base, m, db, value, options } = await view.gets(['base', 'm','db','value','options'])
	const addm = await prepareValue(db, base, options, value)
	m += addm
	let md = makemd(m)

	if (md.search) {
		const addm = await prepareValue(db, base, options, md.search)
		m += ':search'+addm
		md = makemd(m)
	}
	if (md.value) { //value это то что было до поиска и можт содержать старый поиск, который применять не нужно
		const addm = await prepareValue(db, base, options, md.value)
		m += addm
		const search = md.search
		md = makemd(m)
		if (search) md.search = search
		else delete md.search
		delete md.value
	}
	if (typeof(md.group) != 'object') delete md.group
	if (md.group) {
		const groups = await Catalog.getGroups(view)
		for (const group_nick in md.group) {
			if (!groups[group_nick]) delete md.group[group_nick]
		}
		if (!Object.keys(md.group).length) delete md.group
	}

	if (typeof(md.brand) != 'object') delete md.brand
	if (md.brand) {
		const brands = await Catalog.getBrands(db)
		for (const brand_nick in md.brand) {
			if (!brands[brand_nick]) delete md.brand[brand_nick]
		}
		if (!Object.keys(md.brand).length) delete md.brand
	}

	if (typeof(md.more) != 'object') delete md.more
	if (md.more) {
		for (const prop_nick in md.more) {
			const check_prop_nick = nicked(prop_nick)
			if (check_prop_nick != prop_nick) {
				delete md.more[prop_nick]
				continue
			}
			if (md.more[prop_nick] == 'empty') {

			} else {
				for (const prop_value in md.more[prop_nick]) {
					if (prop_value === '') delete md.more[prop_nick][prop_value]
				}

				const prop = await base.getPropByNick(prop_nick)
				if (!prop) {
					delete md.more[prop_nick]
				} else if (prop && !~['value','brand','number'].indexOf(prop.type)) {
					delete md.more[prop_nick]
				} else if (prop && prop.type == 'value' && md.more[prop_nick]) {
					for (const value_nick in md.more[prop_nick]) {
						const check_value_nick = nicked(value_nick)
						if (check_value_nick != value_nick) {
							delete md.more[prop_nick][value_nick]
							continue
						}
						const value = await Catalog.getValueByNick(view, value_nick)
						if (!value || typeof(md.more[prop_nick][value_nick]) == 'object') {
							delete md.more[prop_nick][value_nick]
						}
					}
				}
				if (!Object.keys(md.more[prop_nick] || {}).length) delete md.more[prop_nick]
			}
		}
		if (!Object.keys(md.more).length) delete md.more
	}
	m = Catalog.makemark(md).join(':')
	md.m = m
	return md
})

export default rest