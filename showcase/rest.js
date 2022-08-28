import { Meta } from "/-controller/Meta.js"
import { Access } from "/-controller/Access.js"
import { Db } from "/-db/Db.js"
import { restset } from './restset.js'
import { restget } from './restget.js'
import { Upload } from "/-showcase/Upload.js"
import { nicked } from '/-nicked/nicked.js'

export const meta = new Meta()

meta.addHandler('admin', async (view) => {
	const { visitor } = await view.gets(['visitor'])
	if (!await Access.isAdmin(visitor.client.cookie)) {
		view.ans.status = 403
		view.ans.nostore = true
		return view.err('Access denied')
	}
})

meta.addVariable('options', async view => {
	const { config: {options: src} } = await view.gets(['config'])
	const { options } = await import('/'+src)
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
	const opt = await view.gets(['db','config','options', 'visitor'])
	return new Upload(opt)
})

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


meta.addArgument('name')
meta.addArgument('visitor')

meta.addFunction('int', (view, n) => Number(n))
meta.addArgument('before_id', ['int'])
meta.addArgument('after_id', ['int'])

meta.addVariable('start', async view => {
	const { db } = await view.gets(['db'])
	await db.start()
	view.after(async () => {
		if (view.ans.result) {
			await db.commit()
		}
	})
})

restget(meta)
restset(meta)

export const rest = async (query, get, visitor) => {
	const ans = await meta.get(query, {...get, visitor})
	if (typeof(ans) == 'string') return { ans, status: 200, nostore:true, ext: 'html' }
	if (~query.indexOf('set-')) Access.setAccessTime()
	const { status = 200, nostore = true } = ans
	delete ans.status
	delete ans.nostore	
	return { ans, status, nostore, ext: 'json' }
}
