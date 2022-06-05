import Client from "/node_modules/@notionhq/client/build/src/Client.js"
import fs from 'fs/promises'
import { whereisit } from '/-controller/whereisit.js'
const { FILE_MOD_ROOT, IMPORT_APP_ROOT } = whereisit(import.meta.url)

export const Notion = {
	getConfig: async () => {
		try {
			const { default: CONFIG } = await import('/data/.notion.json', {assert: {type: "json"}})
			return CONFIG
		} catch (e) {
			return false
		}
	},
	getConnect: async () => {
		const CONFIG = await Notion.getConfig()
		if (!CONFIG) return false
		const connect = new Client.default({
			auth: CONFIG.secret
		});
		Notion.getConnect = () => connect
		return connect
	},
	pages: {},
	init: async () => {
		const promise = Notion.prepare()
		Notion.init = () => promise
		return promise
	},
	prepare: async () => {
		const CONFIG = await Notion.getConfig()
		if (!CONFIG) return []
		Notion.pages = {}
		const files = await fs.readdir('./' + CONFIG.dir).catch(() => [])

		for (const file of files) {
			const i = file.lastIndexOf('.')
			if (!~i) return
			const ext = file.slice(i + 1)

			if (ext != 'json') continue
			const Nick = file.slice(0, i)
			const json = await fs.readFile('./' + CONFIG.dir + file, 'utf8').then(text => JSON.parse(text))
		    Notion.pages[Nick] = json
		}
	},
	getList: async () => {
		const CONFIG = await Notion.getConfig()
		if (!CONFIG) return []
		const pages = structuredClone(Notion.pages)
		
		const connect = await Notion.getConnect()
		const res = await connect.databases.query({
			database_id: CONFIG.database_id,
			filter: {
				property: "Public",
				checkbox: {
					"equals": true
				}
			}
		})

		

		for (let i = 0, l = res.results.length; i < l; i++) {
			const obj = res.results[i]
			
			const props = {}
			let Edited = 0;
			let Created = 0;
			for (const prop in obj.properties) {
				const p = obj.properties[prop]
				const type = p.type

				let val = ''
				if (~['Name','Public','Nick'].indexOf(prop)) {
					continue
				} else if (~['rich_text'].indexOf(type)) {
					val = p.rich_text.map(rt => rt.plain_text).join(', ')
				} else if (~['title'].indexOf(type)) {
					val = p[type].map(rt => rt.plain_text).join(', ')
				} else if (type == 'checkbox') {
					val = p[type]
				} else if (~['created_time','last_edited_time'].indexOf(type)) {
					val = new Date(p[type]).getTime()	
					if (type == 'last_edited_time') Edited = val
					if (type == 'created_time') Created = val
					continue
				} else if (~['created_by'].indexOf(type)) {
					continue
				} else if (~['multi_select'].indexOf(type)) {
					val = p[type].map(v => v.name).join(', ')
				} else {
					console.log(prop, p)
				}
				if (!val) continue
				props[prop] = { type, val }
			}
			const Nick = obj.properties.Nick.rich_text[0].plain_text
			const id = obj.id
			const Name = obj.properties.Name.title[0].plain_text
			pages[Nick] = { props, Nick, Name, id, Created, Edited, ...pages[Nick] }
		}
		console.log('123',pages)
		return Object.values(pages)
	},
	load: async (id) => {
		const data = await Notion.getData(id)
		data.Loaded = Date.now()
		const Nick = data.Nick
		const CONFIG = await Notion.getConfig()
		await fs.stat('./' + CONFIG.dir).catch(() => {
			return fs.mkdir('./' + CONFIG.dir)
		})
		const r = await fs.writeFile('./' + CONFIG.dir + '/' + Nick + '.json', JSON.stringify(data)).then(() => true).catch(() => false)
		Notion.prepare()
		return r
	},
	del: async (id) => {
		const {Nick, html} = await Notion.getData(id)
		const CONFIG = await Notion.getConfig()
		const stat = await fs.stat('./' + CONFIG.dir + '/' + Nick + '.json').catch(() => false)
		if (!stat) return true;
		const r = await fs.unlink('./' + CONFIG.dir + '/' + Nick + '.json').then(() => true).catch(() => false)
		Notion.prepare()
		return r
	},
	getHtml: async (id) => {
		const obj = await Notion.getData(id)
		return obj.html
	},
	getData: async (id) => {
		const connect = await Notion.getConnect()
		const page = await connect.pages.retrieve({
			page_id: id,
		});
		const Name = page.properties.Name.title[0].plain_text
		const block = await connect.blocks.retrieve({
			block_id: id,
		});
		const html = await Notion.getBlockHtml(block)
		const Nick = page.properties.Nick.rich_text[0].plain_text
		return { html:'<h1>'+ Name +'</h1>' + html, Nick, Name }
	},
	getBlockHtml: async (block, ul = false) => {
		let html = ''
		if (block.type == 'paragraph') {
			html += '<p>'+block.paragraph.rich_text[0].plain_text+'</p>'
		} else if (block.type == 'bulleted_list_item') {
			html += '<li>'+block.bulleted_list_item.rich_text[0].plain_text+'</li>'
			//console.log(block)
		} else {
			console.log(block.type)
		}
		
		if (block.has_children) {
			const connect = await Notion.getConnect()
			const res = await connect.blocks.children.list({
				block_id: block.id,
				page_size: 500,
			});
			let ul = false
			for (let i = 0, l = res.results.length; i < l; i++) {
				const block = res.results[i]
				if (block.type == 'bulleted_list_item') {
					if (!ul) {
						html += '<ul>'
						ul = true
					}
				}
				html += await Notion.getBlockHtml(block)
				if (block.type != 'bulleted_list_item') {
					if (ul) {
						ul = false
						html+='</ul>'
					}
				}
			}
		}
		return html
		
	}
}
await Notion.init()