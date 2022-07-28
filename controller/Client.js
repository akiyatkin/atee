import { animate } from './animate.js'
import { pathparse } from './Spliter.js'
import { Head } from './Head.js'

export const Client = {
	search:'',
	access_promise: null,
	timings: {
		view_time: 0,
		update_time: 0,
		access_time: 0
	},
	follow: (event) => {
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
			if (!a) return
			const search = a.getAttribute('href')
			if (!search) return
			if (/^\w+:/.test(search)) return
			if (~search.lastIndexOf('.')) return
			if (search[1] == '-') return
			event.preventDefault()
			Client.click(a)
		})
		window.addEventListener('popstate', event => {
			Client.popstate(event)
		})
		if (!event) return
		Client.follow = event => {
			const a = event.target.closest('a')
			Client.click(a)	
		}
		Client.follow(event)
	},
	popstate: (e) => {
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
			if (hash && !promise.finalled) promise.then(go).catch(() => {})
		}
		promise.started.then(go).catch(() => {})
	},
	pushState: (search, scroll = true) => {
		search = fixsearch(search)
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
	crossing: (search) => {
		if (Client.next && Client.next.search == search) return Client.next.promise
		
		const promise = createPromise(search)
		promise.started = createPromise()
		promise.catch(() => promise.started.reject())

		if (Client.next) {
			Client.next.search = search
			Client.next.promise.reject(promise)
			Client.next.promise = promise
			return Client.next.promise
		}

		Client.next = { search, promise }
		applyCrossing()
		return Client.next.promise
	}	
}
const fixsearch = search => {
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
	try {
		const json = await fetch('/-controller/get-layers', {
			method: "post",
			headers: {
		    	'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
			},
			body: new URLSearchParams(req)
		}).then(res => res.json())
		if (promise.rejected) return applyCrossing()
		if (!json || !json.st || !json.ut || !json.result || !json.layers) return location.href = search
		

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
			const hash = location.hash.slice(1)
			let anim = layer.animate //Скрол неточный 1. из-за анимации и 2. из-за изменений DOM в скриптах
			if (hash && anim != 'none') anim = 'opacity'
			animate('div', div, layer.sys.execute, anim)
		}
		
		const {crumbs, path, get} = pathparse(search)
		const crumb = { crumbs, search, get, path }
		

		await Promise.all(promises)
		if (promise.rejected) return applyCrossing()

		
		for (const layer of json.layers) {
			layer.sys.template = document.createElement('template')
			addHtml(layer.sys.template, layer, crumb, timings)
		}
		promise.started.resolve(search)
		const scripts = []
		for (const layer of json.layers) {
			const elements = layer.sys.template.content
			layer.sys.div.replaceChildren(elements)
			const promise = evalScriptsInNode(layer.sys.div)
			promise.then(() => layer.sys.execute.resolve()) //Покажется когда выполнятся скрипты
			scripts.push(promise)
		}
		await Promise.all(scripts)
		Client.search = search
		Client.next = false
		promise.resolve(search)

		const event = new CustomEvent('crossing', {detail: {timings, crumb, head: json.head}})
		window.dispatchEvent(event)
		
	} catch (e) {
		console.log(e)
		Client.next = false
		promise.reject()
		//return location.href = search
	}
}
const addHtml = (template, layer, crumb, timings) => {
	let html = ''
	if (layer.sys.objtpl) {
		const env = {...layer, ...crumb, host:location.host, cookie:document.cookie, ...timings}
		const data = layer.sys.data
		html = layer.sys.objtpl[layer.sub](data, env)
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
		if (layer.ts) { //ts это например, index:ROOT означает что есть шаблон
			let promise = import(layer.tpl).then(res => {
				layer.sys.objtpl = res
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
		promise.finalled = true
		resolve(r)
	}
	promise.reject = r => {
		promise.result = r
		promise.rejected = true
		promise.finalled = true
		reject(r)
	}
	promise.catch(e => {})
	return promise
}
Client.search = Client.getSearch()
window.Client = Client