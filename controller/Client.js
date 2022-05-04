import { pathparse } from './pathparse.js'
import { SEO } from './SEO.js'
export const Client = {
	sw: async () => {
		if (!navigator.serviceWorker) return
		//const { default: access_data } = await import('/-controller/access', {assert: { type: 'json' }})
		const access_data = await fetch('/-controller/access').then(res => res.json())
		navigator.serviceWorker.register('/-controller/sw?t', { scope:'/' });
		navigator.serviceWorker.addEventListener('message', event => {
			console.log('New version is ready. Reload please.', event.data)
		})
		if (navigator.serviceWorker.controller) { //В первый раз данные придут с кодом воркера
			await navigator.serviceWorker.ready
			navigator.serviceWorker.controller.postMessage(access_data)
		}
	},
	follow: async () => {
		Client.sw()
		window.addEventListener('click', e => {
			const a = e.target.closest('a')
			if (!a) return
			const search = a.getAttribute('href')
			if (!search) return
			if (/^\w+:/.test(search)) return
			if (~search.lastIndexOf('.')) return
			if (search[1] == '-') return
			e.preventDefault()
			Client.pushState(search)
		})
		window.addEventListener('popstate', event => { 
			Client.crossing(Client.getSearch())
		});
	},
	getSearch: () => decodeURI(location.pathname + location.search),
	attach: () => {

	},
	global: () => {

	},
	pushState: (search) => {
		const { secure, crumbs, path, ext, get } = pathparse(search)
		history.pushState(null, null, search)
		Client.crossing(search)
	},
	replaceState: () => {
		
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
			globals: '',
			update_time: 0,
			access_time: 0,
			prev: Client.search,
			next: search
		}		
		const json = await fetch('/-controller/layers', {
			method: "post",
			headers: {
		    	'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
			},
			body: new URLSearchParams(req)
		}).then(res => res.json())
		if (promise.rejected) return Client.applyCrossing()
		if (!json || !json.result || !json.layers) return location.href = search
		try {
			SEO.accept(json.seo)
			const promises = loadAll(json.layers)
			await Promise.all(promises)
			if (promise.rejected) return Client.applyCrossing()
			const {crumbs, path, get} = pathparse(search)
			const crumb = {
				crumbs, search, get, path,
				//root: route.root
			}
			for (const layer of json.layers) {
				layer.sys.template = document.createElement('template')
				layer.sys.div = document.getElementById(layer.div)
				addHtml(layer.sys.template, layer, crumb)
			}
			for (const layer of json.layers) {
				const elements = layer.sys.template.content
				layer.sys.div.replaceChildren(elements)
				evalScriptsInNode(layer.sys.div)
				delete layer.sys
			}
			Client.search = search
			Client.next = false
			promise.resolve(search)
		} catch (e) {
			return location.href = search
		}
	}
}
const addHtml = (template, layer, crumb) => {
	const html = layer.sys.objtpl[layer.sub](layer.sys.data, {layer, crumb, host:location.host, cookie:document.cookie})
	if (template.children.length) {
		const div = template.content.getElementById(layer.div)
		div.innerHTML = html
	} else {
		template.innerHTML = html
	}
	for (const l of layer.layers) {
		addHtml(template, l, crumb, content)
	}
}
const loadAll = (layers, promises = []) => {
	let promise
	for (const layer of layers) {
		layer.sys = {}

		promise = import(layer.tpl)
		promise.then(res => {
			layer.sys.objtpl = res
		})
		promises.push(promise)
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