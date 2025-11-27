import Rest from "@atee/rest"
import Notion from "/-notion/Notion.js"
import fs from 'node:fs/promises'
const rest = new Rest()

rest.addArgument('nick')
rest.addResponse('get-list', async (view) => {
	view.ans.list = structuredClone(Object.values(Notion.pages))
	view.ans.list.forEach(value => delete value.html)
	return view.ret()
})
rest.addResponse('get-page-sitemap', async (view) => {
	const list = {}
	for (const Nick in Notion.pages) {
		const page = Notion.pages[Nick]
		list[Nick] = {
			name: page.Name
		}
	}
	const data = {headings:[]}
	data.headings.push({
		title:'Блог',
		childs: list
	})
	return data
})
rest.addResponse('get-page-head', async (view) => {
	const { nick } = await view.gets(['nick'])
	const page = Notion.pages[nick]
	return {title: page.Name }
})

rest.addResponse('get-page', async (view) => {
	const { nick } = await view.gets(['nick'])
	const CONFIG = await Notion.getConfig()
	if (!Notion.pages[nick]) return view.err('', 404)
	view.ans.page = Notion.pages[nick]
	return view.ret()
})

export default rest