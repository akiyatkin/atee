import Rest from "/-rest"
import { Notion } from "./../Notion.js"
import fs from 'fs/promises'
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
	const ans = {headings:[]}
	ans.headings.push({
		title:'Блог',
		childs: list
	})
	return {ans}
})
rest.addResponse('get-page-head', async (view) => {
	const { nick } = await view.gets(['nick'])
	const page = Notion.pages[nick]
	return {ans: {title: page.Name }}
})

rest.addResponse('get-page', async (view) => {
	const { nick } = await view.gets(['nick'])
	const CONFIG = await Notion.getConfig()
	if (!Notion.pages[nick]) return view.err('', 404)
	view.ans.page = Notion.pages[nick]
	return view.ret()
})

export default rest