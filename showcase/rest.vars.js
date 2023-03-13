import nicked from '/-nicked'
import fs from "fs/promises"
import Rest from "/-rest"
import config from '/-config'
import Upload from "/-showcase/Upload.js"

import rest_db from '/-db/rest.db.js'
import rest_funcs from '/-rest/rest.funcs.js'



const rest = new Rest(rest_db, rest_funcs)
export default rest



rest.addVariable('base', async (view) => {
	const Base = await import('/-showcase/Base.js').then(r => r.default)
	let { db, visitor } = await view.gets(['db','visitor'])
	return new Base({db, visitor}, true)
})

rest.addVariable('config', async view => {
	return config('showcase')
})

rest.addVariable('options', async view => {
	let { base } = await view.gets(['base'])
	return base.getOptions('fs reloading') //Админка
})

rest.addVariable('upload', async view => {	
	const opt = await view.gets(['db','options', 'visitor', 'base'])
	opt.config = await config('showcase')
	return new Upload(opt)
})

rest.addArgument('name')
rest.addArgument('title')
rest.addArgument('before_id', ['int'])
rest.addArgument('after_id', ['int'])
rest.addArgument('id', ['int'])
rest.addArgument('go', (view, e) => e || false) //Ссылка куда перейти. Как есть попадает в заголовок Location 301