import Rest from "/-rest"
import funcs from '/-rest/funcs.js'
import vars_db from '/-db/vars.js'

const rest = new Rest(funcs, vars_db)

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


export default rest