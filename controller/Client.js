import { animate } from './animate.js'
import { pathparse } from './Spliter.js'
import { Head } from './Head.js'
import { evalScripts } from './evalScripts.js'
import { createPromise } from './createPromise.js'

export const Client = {
	search:'',
	access_promise: null,
	follow: () => {
		navigator.serviceWorker?.register('/-controller/sw.js', { scope:'/' })
		window.addEventListener('crossing', async ({detail: { timings }}) => {
			if (navigator.serviceWorker) {
				const sw = navigator.serviceWorker
				const swr = await sw.ready
				if (swr.pushManager && swr.pushManager.getSubscription) {
					const subscription = await swr.pushManager.getSubscription()
				}
				if (sw.controller) sw.controller.postMessage(timings)
			}
		})
		window.addEventListener('crossing', async ({detail: { head }}) => {
			Head.accept(head)
		})
		window.addEventListener('click', event => {
			const a = event.target.closest('a')
			if (!a || !Client.isSuitable(a)) return
			event.preventDefault()
			Client.click(a)
		})
		window.addEventListener('popstate', event => {
			Client.popstate(event)
		})
	},
	popstate: (event) => {
		Client.history[Client.cursor] = {scroll: [window.scrollX, window.scrollY]}
		const search = Client.getSearch()
		const promise = Client.crossing(search)
		if (event.state?.view == Client.view) { //Вперёд
			const { cursor } = event.state
			Client.cursor = cursor
			promise.then(() => window.scrollTo(...Client.history[Client.cursor].scroll)).catch(() => null)
		} else {
			Client.start--
			Client.cursor = Client.start
			history.replaceState({cursor:Client.cursor, view:Client.view}, null, search)
		}
	},
	click: (a) => {
		const search = a.getAttribute('href')
		const scroll = a.dataset.scroll != 'none'
		
		const promise = search == Client.search ? Client.replaceState(search, scroll) : Client.pushState(search, scroll)
		animate('a', a, promise, a.dataset.animate)
		return true
	},
	getSearch: () => decodeURI(location.pathname + location.search),
	attach: () => {

	},
	global: () => {

	},
	reloaddivs:[],
	reloaddiv: (div) => {
		if (~Client.reloaddivs.indexOf(div)) return
		Client.reloaddivs.push(div)
		return Client.replaceState(location.href, false)
	},
	reloadtss:[],
	reloadts: (ts) => {
		if (~Client.reloadtss.indexOf(ts)) return
		Client.reloadtss.push(ts)
		return Client.replaceState(location.href, false)
	},
	view:Date.now(), //Метка сеанса в котором актуальна Client.history
	history:[],
	start:history.length,
	cursor:history.length - 1,
	
	refreshState: () => { //depricated
		Client.replaceState(location.href)
	},
	scroll: promise => {
		const go = () => {
			let div
			const hash = location.hash.slice(1)
			if (hash) div = document.getElementById(hash)
			if (div) div.scrollIntoView()
			else window.scrollTo(0,0)
			if (hash && !promise.finalled) promise.then(go).catch(() => null)
		}
		promise.started.then(go).catch(() => null)
	},
	pushState: (search, scroll = true) => {
		search = fixsearch(search)
		if (~location.href.indexOf(search)) {
			const a = document.createElement('a')
			a.href = Client.search
			const oldahref = a.href
			a.href = search
			const newahref = a.href
			if (oldahref == newahref) return Client.replaceState(search, scroll)
		}
		Client.history[Client.cursor] = {scroll: [window.scrollX, window.scrollY]}
		Client.cursor++
		history.pushState({cursor:Client.cursor, view:Client.view}, null, search)
		search = Client.getSearch()
		const promise = Client.crossing(search)
		if (scroll)	Client.scroll(promise)
		return promise
	},
	replaceState: (search, scroll = true) => {
		search = fixsearch(search)
		Client.history[Client.cursor] = {scroll: [window.scrollX, window.scrollY]}
		history.replaceState({cursor:Client.cursor, view:Client.view}, null, search)
		search = Client.getSearch()
		const promise = Client.crossing(search)
		if (scroll)	Client.scroll(promise)
		return promise
	},
	next: false,
	crossing: (search, promise) => {
		if (Client.next && Client.next.search == search) return Client.next.promise
		if (!promise) {
			promise = createPromise('loaded and ready')
			promise.started = createPromise('already started')
		}

		if (Client.next) {
			if (Client.next.promise.started.finalled) {
				Client.next.promise.then(() => Client.crossing(search, promise)).catch(e => null)
				return promise
			}
			Client.next.search = search
			const oldpromise = Client.next.promise
			Client.next.promise = promise
			oldpromise.started.reject(promise)
			oldpromise.reject(promise)
		}

		Client.next = { search, promise }
		requestAnimationFrame(applyCrossing)
		return promise
	},
	htmltodiv: (html, div) => {
		div.innerHTML = html
		const promise = evalScripts(div)
		animate('div', div, promise, 'opacity')
		return promise
	}
}
const fixsearch = search => {
	if (search[0] != '/') {
		if (search == '?' ) search = location.pathname
		else if (search == '?#' ) search = location.pathname
		else if (search == '#' ) search = location.pathname + location.search
		else if (search[0] == '?') search = location.pathname + search
		else if (search[0] == '#') search = location.pathname + location.search + search
	}
	return search
}

const applyCrossing = async () => {
	if (!Client.next) return
	let {search, promise} = Client.next
	
	
	search = search.split('#')[0]
	const timings = Client.timings
	/*
	Допустим 0 это текущие тайминги загрузки и их нужно подменить следующими. 
	Исходим из того, что следующие обязательно не изменения
	Но со второго раза надо уже передать корректные данные
	*/
	const req = {
		gs: '',
		vt: timings.view_time,
		ut: timings.update_time,
		st: timings.access_time,
		pv: Client.search,
		nt: search
	}
	if (Client.reloaddivs.length) req.rd = Client.reloaddivs.join(',')
	if (Client.reloadtss.length) req.rt = Client.reloadtss.join(',')
		
	try {
		const json = await fetch('/-controller/get-layers', {
			method: "post",
			headers: {
		    	'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
			},
			body: new URLSearchParams(req)
		}).then(res => res.json())
		if (promise.rejected) return
		if (!json || !json.st || !json.ut || !json.result || !json.layers) {
			return location.reload()
		}
		const timings = {
			view_time: json.vt,
			update_time: json.ut,
			access_time: json.st
		}
		Client.timings = timings
		
		const promises = loadAll(json.layers)
		for (const layer of json.layers) {
			layer.sys = {}
			const div = document.getElementById(layer.div)
			layer.sys.div = div
			layer.sys.execute = createPromise()
			promise.started.finally(() => {
				layer.sys.execute.reject()
			}).catch(e => null)
			const hash = location.hash.slice(1)
			let anim = layer.animate //Скрол неточный 1. из-за анимации и 2. из-за изменений DOM в скриптах
			if (hash && anim != 'none') anim = 'opacity'
			animate('div', div, layer.sys.execute, anim)
		}
		
		const {crumbs, path, get} = pathparse(search)
		const crumb = { crumbs, search, get, path }
		

		await Promise.all(promises)

		if (promise.rejected) return
		promise.started.resolve(search)

		if (json.rd) {
			Client.reloaddivs = Client.reloaddivs.filter(div => {
				return !~json.rd.indexOf(div)
			})
		}
		if (json.rt) {
			Client.reloadtss = Client.reloadtss.filter(ts => {
				return !~json.rt.indexOf(ts)
			})
		}
		for (const layer of json.layers) {
			layer.sys.template = document.createElement('template')
			addHtml(layer.sys.template, layer, crumb, timings)
		}
		
		const scripts = []
		for (const layer of json.layers) {
			const elements = layer.sys.template.content
			layer.sys.div.replaceChildren(elements)
			const promise = evalScripts(layer.sys.div)
			promise.then(() => layer.sys.execute.resolve()).catch(e => null) //Покажется когда выполнятся скрипты
			scripts.push(promise)
		}
		await Promise.all(scripts)
		Client.search = search
		Client.next = false
		promise.resolve(search)

		const event = new CustomEvent('crossing', {detail: {timings, crumb, head: json.head}})
		window.dispatchEvent(event)
		if (req.ut && req.ut < timings.update_time) {
			location.reload()
		}
		
	} catch (e) {
		console.log(e)
		Client.next = false
		promise.started.reject()
		promise.reject()
		//return location.href = search
	}

}
const errmsg = (layer, e) => {
	console.log(layer, e)
	return `<pre><code>${layer.ts}<br>${e.toString()}</code></pre>`
}
const addHtml = (template, layer, crumb, timings) => {
	let html = ''
	if (layer.sys.html) {
		html = layer.sys.html
	} else if (layer.sys.objtpl) {
		const env = {
			...layer, 
			...crumb, 
			host:location.host, 
			...timings
		}
		//cookie:document.cookie, 
		const data = layer.sys.data
		try {
			html = layer.sys.objtpl[layer.sub](data, env)
		} catch (e) {
			html = errmsg(layer, e)
		}
	}
	if (template.content.children.length) {
		const div = template.content.getElementById(layer.div)
		div.innerHTML = html
	} else {
		template.innerHTML = html
	}
	if (layer.layers) for (const l of layer.layers) {
		addHtml(template, l, crumb, timings)
	}
}
const loadAll = (layers, promises = []) => {
	
	if (!layers) return promises
	for (const layer of layers) {
		if (!layer.sys) layer.sys = {}
		if (layer.tpl) {
			if (layer.ts) { //ts это например, index:ROOT означает что есть шаблон
				let promise = import(layer.tpl).then(res => {
					layer.sys.objtpl = res
				}).catch(() => {
					location.reload()
				})
				promises.push(promise)
			}
			if (layer.json) {
				let promise = fetch(layer.json).then(res => {
					if (res.status != 200) {
						location.reload()
						return new Promise(() => {})//reload сразу не происходит, надо зависнуть
					}
					const type = res.headers.get('Content-Type')
					if (~type.indexOf('text/html')) return res.text()
					return res.json()
				}).then(data => {
					layer.sys.data = data
				}).catch(e => {
					layer.sys.data = errmsg(layer, e)
				})
				promises.push(promise)
			}
		} else if (layer.html) {
			let promise = fetch(layer.html).then(res => {
				if (res.status != 200) {
					location.reload()
					return new Promise(() => {})//reload сразу не происходит, надо зависнуть
				}
				return res.text()
			}).then(html => {
				layer.sys.html = html
			}).catch(e => {
				layer.sys.html = errmsg(layer, e)
			})
			promises.push(promise)
		}
		loadAll(layer.layers, promises)
	}
	return promises
}