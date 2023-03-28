import Rest from "/-rest"
import rest_funcs from '/-rest/rest.funcs.js'
import rest_db from '/-db/rest.db.js'
import nicked from '/-nicked'
const rest = new Rest(rest_funcs, rest_db)


rest.addArgument('value', ['string'], (view, v) => v || '')

rest.addVariable('base', async (view) => {
	const { db, visitor } = await view.gets(['db','visitor'])
	const Base = await import('/-showcase/Base.js').then(r => r.default)
	
	return new Base({db, visitor})
})
rest.addVariable('options', async (view) => {
	const { base } = await view.gets(['base'])
	return base.getOptions()
})
rest.addVariable('catalog', async (view) => {
	const { base, db, visitor, options } = await view.gets(['base', 'db', 'visitor', 'options'])
	const Catalog = await import('/-catalog/Catalog.js').then(r => r.default)
	return new Catalog({base, options})
})


rest.addArgument('m', (view, m) => {
	if (m) view.nostore = true //безчисленное количество комбинаций, браузеру не нужно запоминать	
	return m
})
const prepareValue = async (catalog, options, value) => {
	const tree = await catalog.getTree()
	const nick = nicked(value);
	let addm = ''
	if (nick) {
		if (nick == 'actions') {
			const vals = options.actions.map(v => nicked(v)).filter(v => v).sort()
			const p = await catalog.base.getPropByTitle('Наличие')
			if (p) {
				vals.forEach(v => () => addm += `:more.${p.prop_nick}.${v}=1`)
			}
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
				const brands = await catalog.getBrands()
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
	let { base, m, db, value, visitor, catalog, options } = await view.gets(['base', 'm','db','value','visitor', 'catalog', 'options'])
	const addm = await prepareValue(catalog, options, value)
	m += addm
	let md = makemd(m)

	if (md.search) {
		const addm = await prepareValue(catalog, options, md.search)
		m += ':search'+addm
		md = makemd(m)
	}
	if (md.value) { //value это то что было до поиска и можт содержать старый поиск, который применять не нужно
		const addm = await prepareValue(catalog, options, md.value)
		m += addm
		const search = md.search
		md = makemd(m)
		if (search) md.search = search
		else delete md.search
		delete md.value
	}
	if (md.group) {
		const groups = await catalog.getGroups()
		for (const group_nick in md.group) {
			if (!groups[group_nick]) delete md.group[group_nick]
		}
		if (!Object.keys(md.group).length) delete md.group
	}
	if (md.brand) {
		const brands = await catalog.getBrands()
		for (const brand_nick in md.brand) {
			if (!brands[brand_nick]) delete md.brand[brand_nick]
		}
		if (!Object.keys(md.brand).length) delete md.brand
	}
	if (md.more) {
		for (const prop_nick in md.more) {
			const check_prop_nick = nicked(prop_nick)
			if (check_prop_nick != prop_nick) {
				delete md.more[prop_nick]
				continue
			}

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
					const value = await catalog.getValueByNick(value_nick)
					if (!value || typeof(md.more[prop_nick][value_nick]) == 'object') {
						delete md.more[prop_nick][value_nick]
					}
				}
			}
			if (!Object.keys(md.more[prop_nick] || {}).length) delete md.more[prop_nick]
		}
		if (!Object.keys(md.more).length) delete md.more
	}
	m = catalog.makemark(md).join(':')
	md.m = m
	return md
})

export default rest