import { pathparse } from './pathparse.js'
import { SEO } from './SEO.js'
import access_data from '/-controller/access' assert { type: 'json' }
const SW = {
	register: async () => {
		if (!navigator.serviceWorker) return
		navigator.serviceWorker.register('/-controller/sw.js', { scope:'/' });
		navigator.serviceWorker.addEventListener('message', event => {
			console.log('New version is ready. Reload please.', event.data)
			access_data.UPDATE_TIME = event.data.UPDATE_TIME
			access_data.ACCESS_TIME = event.data.ACCESS_TIME
		})
	},
	postMessage: async (access_data) => {
		if (!navigator.serviceWorker) return
		await navigator.serviceWorker.ready
		navigator.serviceWorker.controller.postMessage(access_data)
	}
}
const requestNextAnimationFrame = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn))
export const Client = {
	search:'',
	animateA: (a, promise) => {
		if (!a.classList.replace('a-crossing-after', 'a-crossing-before')) a.classList.add('a-crossing-before')
		promise.finally(() => {
			requestNextAnimationFrame(() => a.classList.replace('a-crossing-before', 'a-crossing-after'))
		})
	},
	animateDiv: (div, promise) => {
		if (!div.classList.replace('div-crossing-after', 'div-crossing-before')) div.classList.add('div-crossing-before')
		promise.finally(() => {
			requestNextAnimationFrame(() => div.classList.replace('div-crossing-before', 'div-crossing-after'))
		})
	},
	
	follow: async () => {
		SW.register()
		SW.postMessage(access_data)
		window.addEventListener('click', e => {
			const a = e.target.closest('a')
			if (!a) return
			const search = a.getAttribute('href')
			if (!search) return
			if (/^\w+:/.test(search)) return
			if (~search.lastIndexOf('.')) return
			if (search[1] == '-') return
			e.preventDefault()
			const promise = search == Client.search ? Client.replaceState(search) : Client.pushState(search)
			Client.animateA(a, promise)
		})
		window.addEventListener('popstate', event => { 
			const promise = Client.crossing(Client.getSearch())
			promise.then(() => {
			 	window.scrollTo(...event.state.scroll)	
			}).catch(() => {})
		})
		window.addEventListener('load', event => {
			const link = document.createElement('link')
			link.rel = "stylesheet"
			link.href = "/-controller/style.css"
			document.head.append(link)
		})
	},
	getSearch: () => decodeURI(location.pathname + location.search),
	attach: () => {

	},
	global: () => {

	},
	pushState: search => {
		//history.state = {scroll: [window.scrollX, window.scrollY]}
		history.replaceState({scroll: [window.scrollX, window.scrollY]}, null, Client.search)
		history.pushState({scroll: [0,0]}, null, search)
		return Client.crossing(search)
	},
	replaceState: search => {
		//history.state = {scroll: [window.scrollX, window.scrollY]}
		history.replaceState({scroll: [window.scrollX, window.scrollY]}, null, search)
		return Client.crossing(search)	
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
		const {search, promise} = Client.next
		const req = {
			gs: '',
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
				access_data.UPDATE_TIME = json.ut
				access_data.ACCESS_TIME = json.st
				SW.postMessage(access_data)
			}
			if (promise.rejected) return Client.applyCrossing()
			if (!json || !json.result || !json.layers) return location.href = search
			
			const promises = loadAll(json.layers)
			for (const layer of json.layers) {
				layer.sys = {}
				const div = document.getElementById(layer.div)
				layer.sys.div = div
				Client.animateDiv(div, promise)
			}	
			const {crumbs, path, get} = pathparse(search)
			const crumb = {
				crumbs, search, get, path
			}
			await Promise.all(promises)
			if (promise.rejected) return Client.applyCrossing()
			SEO.accept(json.seo)
			for (const layer of json.layers) {
				layer.sys.template = document.createElement('template')
				addHtml(layer.sys.template, layer, crumb)
			}

			for (const layer of json.layers) {
				const elements = layer.sys.template.content
				layer.sys.div.replaceChildren(elements)
				evalScriptsInNode(layer.sys.div)
			}
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
	const html = layer.sys.objtpl ? layer.sys.objtpl[layer.sub](layer.sys.data, {...layer, crumb, host:location.host, cookie:document.cookie}) : ''
	if (template.children.length) {
		const div = template.content.getElementById(layer.div)
		div.innerHTML = html
	} else {
		template.innerHTML = html
	}
	if (layer.layers) for (const l of layer.layers) {
		addHtml(template, l, crumb, content)
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
	for (const old of div.getElementsByTagName("script")) {
		const fresh = document.createElement("script");
		fresh.type = old.type
		fresh.textContent = old.textContent
		old.replaceWith(fresh)
	}
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