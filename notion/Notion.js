//import Client from "/node_modules/@notionhq/client/build/src/Client.js"
import { Client } from "@notionhq/client"
import fs from 'fs/promises'
import { whereisit } from '/-controller/whereisit.js'
import probe from 'probe-image-size';
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
		const connect = new Client({
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
		let files = await fs.readdir('./' + CONFIG.dir).catch(() => [])
		files = files.filter(file => {
			const i = file.lastIndexOf('.')
			if (!~i) return false
			const ext = file.slice(i + 1)
			if (ext != 'json') return false
			return true
		})
		for (let i = 0, l = files.length; i < l; i++) {
			files[i] = await fs.readFile('.' + CONFIG.dir + files[i], 'utf8').then(text => JSON.parse(text))
		}

		files.sort((a, b) => {
			if (a.Edited < b.Edited) return 1
			if (a.Edited > b.Edited) return -1
			return 0
		})
		Notion.pages = {}
		for (let i = 0, l = files.length; i < l; i++) {
			Notion.pages[files[i].Nick] = files[i]
		}
		
	},
	getPageData: (obj) => {
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
				console.log(4, prop, p)
			}
			if (!val) continue
			props[prop] = { type, val }
		}

		const Nick = obj.properties.Nick.rich_text[0].plain_text
		const id = obj.id
		const Name = obj.properties.Name.title[0].plain_text
		const data = { props, Nick, Name, id, Created, Edited }
		return data
	},
	getList: async () => {
		const CONFIG = await Notion.getConfig()
		if (!CONFIG) return []
		const pages = structuredClone(Notion.pages)
		
		const connect = await Notion.getConnect()
		const res = await connect.databases.query({
			database_id: CONFIG.database_id,
			//sorts: [{ "timestamp": "last_edited_time", "direction": "descending" }],
			filter: {
				and:[{
					property: "Public",
					checkbox: {
						"equals": true
					}
				},{
					property: "Nick",
					"rich_text": {
			            "is_not_empty": true
			        }
				}]
			}
		})
		for (let i = 0, l = res.results.length; i < l; i++) {
			const page = res.results[i]
			const data = Notion.getPageData(page)
			pages[data.Nick] = {...pages[data.Nick], ...data, finded: true}
		}

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
		await Notion.init()
		const CONFIG = await Notion.getConfig()
		for (const i in Notion.pages) {
			const page = Notion.pages[i]
			if (page.id != id) continue
			const Nick = page.Nick
			const stat = await fs.stat('./' + CONFIG.dir + '/' + Nick + '.json').catch(() => false)
			if (!stat) continue;
			const r = await fs.unlink('./' + CONFIG.dir + '/' + Nick + '.json').then(() => true).catch(() => false)
			if (!r) return false
		}
		Notion.prepare()
		return true
	},
	getData: async (id) => {
		const connect = await Notion.getConnect()
		const page = await connect.pages.retrieve({
			page_id: id,
		});
		const data = Notion.getPageData(page)
		const cover = page.cover?.external?.url
		const Name = page.properties.Name.title[0].plain_text
		const block = await connect.blocks.retrieve({
			block_id: id,
		});
		let html = await Notion.getBlockHtml(block)
		if (html) html = '<div class="notion">' + html + '</div>'
		const Nick = page.properties.Nick.rich_text[0].plain_text
		return { html: html, Nick, Name, cover, ...data }
	},
	
	getRichHtml: (rich) => {
		const strset  = {
			'bold': 'b',
			'italic': 'i',
			'code': 'code',
			'strikethrough': 'strike'
		}
		const html = rich.map((rich) => {
			let html = ''
			for (const i in rich.annotations) {
				const v = rich.annotations[i]
				if (!v) continue
				if (strset[i]) html += '<'+strset[i]+'>'
			}
			if (rich.href) {
				html +='<a target="about:blank" href="'+rich.href+'">'
			}
			if (rich.plain_text == '\n') {
				html += '<br>'
			} else {
				html += rich.plain_text.replace(/[<>]/g, tag => ({
				      '<': '&lt;',
				      '>': '&gt;'
			    }[tag]))
			}
			if (rich.href) {
				html += '</a>'
			}
			for (const i in rich.annotations) {
				const v = rich.annotations[i]
				if (!v) continue
				if (strset[i]) html += '</'+strset[i]+'>'
			}
			return html
		}).join('')
		return html
	},
	getPlainText: (rich) => {
		const text = rich.map((rich) => {
			let text = ''
			if (rich.plain_text == '\n') {
				text += ' '
			} else {
				text += rich.plain_text.replace(/[<>]/g, tag => ({
				      '<': '&lt;',
				      '>': '&gt;'
			    }[tag]))
			}
			return text
		}).join('')
		return text
	},
	getBlockHtml: async (block, ul = false) => {
		let html = ''
		const preset = {
			"heading_3":"h3",
			"heading_2":"h2",
			"heading_1":"h1",
			"quote":"blockquote",
			"numbered_list_item":"li",
			"bulleted_list_item":"li",
			"paragraph":"p",
			"callout":"blockquote"
		}

		const type = block.type
		if (preset[type]) {
			const hasicon = block[type].icon?.type == 'emoji'
			html += '<' + preset[type] + (hasicon ? ' class="hasicon"': '') +'>'
			if (hasicon) {
				html += `<div class="icon">${block[type].icon.emoji}</div>`
			}
			html += Notion.getRichHtml(block[type].rich_text)	
			
		} else if (type == 'code') {
			html += '<pre><code>'
			if (block[type].icon?.type == 'emoji') {
				html += `<div class="icon">${block[type].icon.emoji}</div>`
			}
			html += Notion.getRichHtml(block[type].rich_text)
		} else if (type == 'image' && block[type].file?.url) {

			const url = block[type].file.url
			const CONFIG = await Notion.getConfig()
			const img = await probe(url)
			const path = CONFIG.dir + '/' + block.id + '.' + img.type
			
			await fetch(url).then(response => response.blob()).then(async blob => {
				const arrayBuffer = await blob.arrayBuffer()
				const dataView = new DataView(arrayBuffer)
				
				
				return fs.writeFile('.' + path, dataView)
			});
			
			
			const caption = Notion.getPlainText(block[type].caption)
			html += `<p><img title="${caption}" alt="${caption}" width="${img.width}" height="${img.height}" loading="lazy" alt="" style="max-width: 100%; height:auto" src="${path}"></p>`
		} else {
			console.log(3, block.type)
		}
		
		if (block.has_children) {
			const connect = await Notion.getConnect()
			const res = await connect.blocks.children.list({
				block_id: block.id,
				page_size: 500,
			});
			let ul = false
			let ol = false
			for (let i = 0, l = res.results.length; i < l; i++) {
				const last = i == l - 1
				const block = res.results[i]
				const type = block.type
				if (type == 'bulleted_list_item') {
					if (!ul) {
						html += '<ul>'
						ul = true
					}
				}
				if (type == 'numbered_list_item') {
					if (!ol) {
						html += '<ol>'
						ol = true
					}
				}
				
				if (type != 'numbered_list_item') {
					if (ol) {
						ol = false
						html+='</ol>'
					}
				}
				if (type != 'bulleted_list_item') {
					if (ul) {
						ul = false
						html+='</ul>'
					}
				}
				const h = await Notion.getBlockHtml(block)
				html += h
				if (last) {
					if (ol) {
						ol = false
						html+='</ol>'
					}
				}
				if (last) {
					if (ul) {
						ul = false
						html+='</ul>'
					}
				}
				
				
			}
		}
		
		if (preset[type]) {
			html += '</'+preset[type]+'>'
		} else if (type == 'code') {
			html += '</code></pre>'
		}
		return html
		
	}
}
await Notion.init()

export default Notion