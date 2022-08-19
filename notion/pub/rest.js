import { Meta } from "/-controller/Meta.js"
import { Notion } from "./../Notion.js"
import fs from 'fs/promises'
export const meta = new Meta()

meta.addArgument('nick')
meta.addAction('get-list', async (view) => {
	view.ans.list = structuredClone(Object.values(Notion.pages))
	view.ans.list.forEach(value => delete value.html)
	return view.ret()
})
meta.addAction('get-page-sitemap', async (view) => {
	const list = []
	for (const Nick in Notion.pages) {
		const page = Notion.pages[Nick]
		list.push({
			child: page.Nick,
			title: page.Name
		})
	}
	return list
})

meta.addAction('get-page', async (view) => {
	const { nick } = await view.gets(['nick'])
	const CONFIG = await Notion.getConfig()
	if (!Notion.pages[nick]) {
		view.ans.status = 404
		return view.err()
	}
	view.ans.page = Notion.pages[nick]
	return view.ret()
})

export const rest = async (query, get, visitor) => {
	const req = {...get, ...visitor.client}
	const ans = await meta.get(query, req)
	if (typeof(ans) == 'string') {
		if (!ans) return { ans, status: 404, nostore:false, ext: 'html' }
		return { ans, status: 200, nostore:false, ext: 'html' }
	}
	const { ext = 'json', status = 200, nostore = false} = ans
	delete ans.status
	delete ans.nostore
	delete ans.ext
	return { ans, status, nostore, ext: 'json' }
}