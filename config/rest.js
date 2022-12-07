import Rest from "/-rest"
import Access from "/-controller/Access.js"
import config from '/-config'

const rest = new Rest()

rest.addArgument('name')
rest.addArgument('visitor')

rest.addResponse('get-private', async view => {
	const { visitor, name } = await view.gets(['name','visitor'])
	if (!Access.isAdmin(visitor.client.cookie)) return view.err("Forbidden", 403);
	const conf = await config(name)
	view.ans.conf = conf
	return view.ret()
})
rest.addResponse('get', async view => {
	const { name } = await view.gets(['name'])
	const conf = await config(name, true)
	view.ans.conf = conf
	return view.ret()
})

export default rest