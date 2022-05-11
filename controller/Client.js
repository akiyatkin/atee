
import { ServiceWorker } from './ServiceWorker.js'

const requestNextAnimationFrame = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn))
export const Client = {
	search:'',
	animate: (tag, a, promise, animate = '') => {
		const reg = new RegExp(tag + '-animate-')
		if (animate) animate = '-' + animate
		const list = a.classList
		list.forEach(name => {
			if (reg.test(name)) list.remove(name)
		})
		list.add(tag + '-animate'+animate+'-before')	
		promise.finally(() => {
			requestNextAnimationFrame(() => list.replace(tag + '-animate'+animate+'-before', tag + '-animate'+animate+'-after'))
		})
	},
	access_promise:null,
	getAccessData: () => {
		if (Client.access_promise) return Client.access_promise
		Client.access_promise = fetch('/-controller/access').then(res => res.json())
		return Client.access_promise
	},
	setAccessData: (access_data) => {
		Client.access_promise = Promise.resolve(access_data)	
	},
	follow: () => {
		ServiceWorker.register(access_data => {
			Client.setAccessData(access_data)
		})
		//Обновить кэш - куда-нибудь кликнуть, потом обновить страницу
		// Client.getAccessData().then(access_data => {	
		// 	ServiceWorker.postMessage(access_data)
		// })
		window.addEventListener('click', e => {
			const a = e.target.closest('a')
			if (!a) return
			const search = a.getAttribute('href')
			if (!search) return
			if (/^\w+:/.test(search)) return
			if (~search.lastIndexOf('.')) return
			if (search[1] == '-') return
			const scroll = a.dataset.scroll == 'none' ? false : true
			e.preventDefault()
			const promise = search == Client.search ? Client.replaceState(search, scroll) : Client.pushState(search, scroll)
			Client.animate('a', a, promise, a.dataset.animate)
		})
		window.addEventListener('popstate', event => { 
			Client.history[Client.cursor] = {scroll: [window.scrollX, window.scrollY]}
			const search = Client.getSearch()
			const promise = Client.crossing(search)
			if (event.state?.view == Client.view) { //Вперёд
				const { cursor } = event.state
				Client.cursor = cursor
				promise.then(() => window.scrollTo(...Client.history[Client.cursor].scroll)).catch(() => {})
			} else { 
				Client.start--
				Client.cursor = Client.start
				history.replaceState({cursor:Client.cursor, view:Client.view}, null, search)
			}
		})
	},
	getSearch: () => decodeURI(location.pathname + location.search),
	attach: () => {

	},
	global: () => {

	},
	view:Math.round(Date.now() / 1000), //Метка сеанса в котором актуальна Client.history
	history:[],
	start:history.length,
	cursor:history.length - 1,
	fixsearch: search => {
		if (search[0] != '/') {
			if (search == '?' ) search = location.pathname
			else if (search == '?#' ) search = location.pathname
			else if (search == '#' ) search = location.pathname + location.search
			else if (search[0] == '?') search = location.pathname + search
			else if (search[0] == '#') search = location.pathname + location.search + search
			else {
				//const i = location.pathname.lastIndexOf('/')
				//if (~i) search = location.pathname.slice(0, i) + '/' + search
			}
			
		}
		return search
	},
	pushState: (search, scroll = true) => {
		search = Client.fixsearch(search)
		Client.history[++Client.cursor] = {scroll: [window.scrollX, window.scrollY]}
		history.pushState({cursor:Client.cursor, view:Client.view}, null, search)
		search = Client.getSearch()
		const promise = Client.crossing(search)
		if (scroll)	promise.then(() => {
			let div
			const hash = location.hash.slice(1)
			if (hash) div = document.getElementById(hash)
			if (div) div.scrollIntoView()
			else window.scrollTo(0,0)
		}).catch(() => {})
		return promise
	},
	replaceState: (search, scroll = true) => {
		search = Client.fixsearch(search)
		Client.history[Client.cursor] = {scroll: [window.scrollX, window.scrollY]}
		history.replaceState({cursor:Client.cursor, view:Client.view}, null, search)
		search = Client.getSearch()
		const promise = Client.crossing(search)
		if (scroll) promise.then(() => {
			let div
			const hash = location.hash.slice(1)
			if (hash) div = document.getElementById(hash)
			if (div) div.scrollIntoView()
			else window.scrollTo(0,0)
		}).catch(() => {})
		return promise
	},
	next: false,
	crossing: (search) => {
		if (Client.next) {
			if (Client.next.search == search) return Client.next.promise
			Client.next.search = search
			const promise = createPromise(search)
			Client.next.promise.reject(promise)
			Client.next.promise = promise
			return Client.next.promise
		}
		Client.next = { search, promise: createPromise(search) }
		Client.applyCrossing()
		return Client.next.promise
	},
	applyCrossing: async () => {
		if (!Client.next) return
		let {search, promise} = Client.next
		search = search.split('#')[0]
		const access_data = await Client.getAccessData()

		
		

		const req = {
			gs: '',
			vt: access_data.VIEW_TIME,
			ut: access_data.UPDATE_TIME,
			st: access_data.ACCESS_TIME,
			pv: Client.search,
			nt: search
		}
		try {
			const json = await fetch('/-controller/layers', {
				method: "post",
				headers: {
			    	'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
				},
				body: new URLSearchParams(req)
			}).then(res => res.json())
			if (json.ut && json.st) {
				const access_data = {
					VIEW_TIME: json.vt,
					UPDATE_TIME: json.ut,
					ACCESS_TIME: json.st
				}
				Client.setAccessData(access_data)
				ServiceWorker.postMessage(access_data)
			}
			if (promise.rejected) return Client.applyCrossing()
			if (!json || !json.result || !json.layers) return location.href = search
			
			const promises = loadAll(json.layers)
			for (const layer of json.layers) {
				layer.sys = {}
				const div = document.getElementById(layer.div)
				layer.sys.div = div
				layer.sys.execute = createPromise()
				Client.animate('div', div, layer.sys.execute, layer.animate)
			}
			const { pathparse } = await import('./Spliter.js')
			const {crumbs, path, get} = pathparse(search)
			const crumb = {
				crumbs, search, get, path
			}
			await Promise.all(promises)
			if (promise.rejected) return Client.applyCrossing()
			if (json.seo) {
				const { SEO } = await import('./SEO.js')
				SEO.accept(json.seo)
			}
			for (const layer of json.layers) {
				layer.sys.template = document.createElement('template')
				addHtml(layer.sys.template, layer, crumb)
			}
			//const scripts = []
			for (const layer of json.layers) {
				const elements = layer.sys.template.content
				layer.sys.div.replaceChildren(elements)
				const promise = evalScriptsInNode(layer.sys.div)
				promise.then(() => layer.sys.execute.resolve())
				//scripts.push(promise)
			}
			//await Promise.all(scripts)
			Client.search = search
			Client.next = false
			promise.resolve(search)
		} catch (e) {
			console.log(e)
			Client.next = false
			promise.reject()
			//return location.href = search
		}
	}
}
const addHtml = (template, layer, crumb) => {
	const html = layer.sys.objtpl ? layer.sys.objtpl[layer.sub](layer.sys.data, {...layer, ...crumb, host:location.host, cookie:document.cookie}) : ''
	if (template.content.children.length) {
		const div = template.content.getElementById(layer.div)
		div.innerHTML = html
	} else {
		template.innerHTML = html
	}
	if (layer.layers) for (const l of layer.layers) {
		addHtml(template, l, crumb)
	}
}
const loadAll = (layers, promises = []) => {
	let promise
	if (!layers) return promises
	for (const layer of layers) {
		if (!layer.sys) layer.sys = {}
		if (layer.ts) {
			promise = import(layer.tpl)
			promise.then(res => {
				layer.sys.objtpl = res
			})
			promises.push(promise)
		}
		if (layer.json) {
			promise = fetch(layer.json)
			promise.then(res => res.json()).then(res => {
				layer.sys.data = data
			})
			promises.push(promise)
		}
		loadAll(layer.layers, promises)
	}
	return promises
}
const evalScriptsInNode = div => {
	const scripts = []
	let i = 0
	for (const old of div.getElementsByTagName("script")) {
		scripts.push(new Promise((resolve, reject) => {
			const fresh = document.createElement("script");
			fresh.type = old.type
			fresh.addEventListener('ready', resolve)
			fresh.textContent = old.textContent + ';document.getElementById("'+div.id+'").getElementsByTagName("script")['+i+'].dispatchEvent(new Event("ready"))'
			old.replaceWith(fresh)
		}))
		i++
	}	
	return Promise.all(scripts)
}
const createPromise = (payload) => {
	let resolve, reject
	const promise = new Promise((r, j) => {
		resolve = r
		reject = j
	})
	promise.payload = payload
	promise.resolve = r => {
		promise.result = r
		promise.resolved = true
		resolve(r)
	}
	promise.reject = r => {
		promise.result = r
		promise.rejected = true
		reject(r)
	}
	promise.catch(e => {})
	return promise
}
Client.search = Client.getSearch()
window.Client = Client