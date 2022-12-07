import Access from "/-controller/Access.js"
import nicked from '/-nicked'
import fs from "fs/promises"
import Rest from "/-rest"
import config from '/-config'
import Upload from "/-showcase/Upload.js"

import vars_db from '/-db/vars.js'
import funcs from '/-rest/funcs.js'

const readJSON = async src => JSON.parse(await fs.readFile(src))

const rest = new Rest(vars_db, funcs)
export default rest

rest.addHandler('admin', async (view) => {
	const { visitor } = await view.gets(['visitor'])
	if (await Access.isAdmin(visitor.client.cookie)) return
	return view.err('Access denied', 403)
})

rest.addVariable('config', async view => {
	return config('showcase')
})
rest.addVariable('options', async view => {
	const conf = await config('showcase')
	const options = await readJSON(conf.options)

	options.numbers ??= []
	options.texts ??= []

	options.tables ??= {}
	options.prices ??= {}
	
	options.number_nicks = options.numbers.map(prop => nicked(prop))
	options.text_nicks = options.texts.map(prop => nicked(prop))
	return options
})

rest.addVariable('upload', async view => {	
	const opt = await view.gets(['db','options', 'visitor'])
	opt.config = await config('showcase')
	return new Upload(opt)
})

rest.addArgument('name')
rest.addArgument('before_id', ['int'])
rest.addArgument('after_id', ['int'])
rest.addArgument('id', ['int'])
rest.addArgument('go', (view, e) => e || false) //Ссылка куда перейти. Как есть попадает в заголовок Location 301
rest.addVariable('start', async view => {
	const { db } = await view.gets(['db'])
	await db.start()
	view.after(async () => {
		if (view.ans.result) {
			await db.commit()
		}
	})
})