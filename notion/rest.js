import { Meta } from "/-controller/Meta.js"
import CONFIG from '/data/.notion.json' assert {type: "json"}

export const meta = new Meta()



meta.addAction('get-state', (view) => {
	view.ans.auth = false
	return view.ret()
})

export const rest = async (query, get, client) => {
	const req = {...get, ...client}
	const ans = await meta.get(query, req)
	return { ans, status: ans.status || 200, nostore: false, ext: 'json' }
}