import { Meta } from "/-controller/Meta.js"
import { Access } from "/-controller/Access.js"
import { Db } from "/-db/Db.js"
import { restset } from './restset.js'
import { restget } from './restget.js'
import { Upload } from "/-showcase/Upload.js"
import { nicked } from '/-nicked/nicked.js'

export const meta = new Meta()

meta.addHandler('admin', async (view) => {
	const { cookie } = await view.gets(['cookie'])
	if (!await Access.isAdmin(cookie)) {
		view.ans.status = 403
		view.ans.nostore = true
		return view.err('Access denied')
	}
})

meta.addVariable('options', async view => {
	const { config: {options: src} } = await view.gets(['admin','config'])
	const { options } = await import(src)
	options.numbers ??= []
	options.texts ??= []
	options.tables ??= {}
	options.prices ??= {}
	//if (!~options.numbers.indexOf('Цена')) options.numbers.push('Цена')
	options.number_nicks = options.numbers.map(prop => nicked(prop))
	options.text_nicks = options.texts.map(prop => nicked(prop))
	return options
})
meta.addVariable('config', async view => {
	const {default: config} = await import('/showcase.json', {assert:{type:"json"}})
	return config
})
meta.addVariable('upload', async view => {
	const { db } = await view.gets(['db'])
	return new Upload(view, db)
})
meta.addVariable('db', async view => {
	const db = await new Db().connect()
	if (!db) {
		view.ans.status = 500
		return view.err('Нет соединения с базой данных')
	}
	return db
})
meta.addArgument('name')
meta.addArgument('cookie')

restget(meta)
restset(meta)

export const rest = async (query, get, client) => {
	const req = {...get, ...client}
	const ans = await meta.get(query, req)
	if (typeof(ans) == 'string') return { ans, status: 200, nostore:true, ext: 'html' }
	const { status = 200, nostore = true } = ans
	delete ans.status
	delete ans.nostore	
	return { ans, status, nostore, ext: 'json' }
}
