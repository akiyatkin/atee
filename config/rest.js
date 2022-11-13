import Meta from "/-controller/Meta.js"
export const meta = new Meta()
import Access from "/-controller/Access.js"
import config from '/-config'

meta.addArgument('name')
meta.addArgument('visitor')

meta.addAction('get-private', async view => {
	const { visitor, name } = await view.gets(['name','visitor'])
	if (!Access.isAdmin(visitor.client.cookie)) return view.fail({status:403, msg:"forbidden"});
	const conf = await config(name)
	view.ans.conf = conf
	return view.ret()
})
meta.addAction('get', async view => {
	const { name } = await view.gets(['name'])
	const conf = await config(name, true)
	view.ans.conf = conf
	return view.ret()
})

export const rest = async (query, get, visitor) => {
	const req = {...get, visitor}
	const ans = await meta.get(query, req)
	const res = { ans, ext: 'json', status: ans.status || 200, nostore: ans.nostore || false }
	delete ans.status
	delete ans.nostore
	return res
}