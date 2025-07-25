import animate from '/-controller/animate.js'
import evalScripts from '/-controller/evalScripts.js'
import createPromise from '/-controller/createPromise.js'
import Bread from '/-controller/Bread.js'
import Theme from '/-controller/Theme.js'

export const Client = {
	search:'',
	access_promise: null,
	follow: (root, search) => {
		search = Client.makeabs(search)
		//Client.search = Client.makeabs(search || Client.getSearch())
		Client.search = search
		const get = Object.fromEntries(new URLSearchParams(location.search))
		Client.bread = new Bread(Client.getPath(), get, Client.search, root)
		Client.theme = Theme.harvest(get, document.cookie)

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
		window.addEventListener('click', event => {
			const a = event.target.closest('a')
			if (!a || !Client.isSuitable(a)) return
			if (event.defaultPrevented) return
			event.preventDefault()
			Client.click(a)
		})
		window.addEventListener('popstate', event => {
			Client.popstate(event)
		})
	},
	lastpop: Date.now(),	
	popstate: (event) => {

		const moment = Date.now()
		if (Client.lastpop + 1000 * 2 < moment) { //Прошлый переход должен закончиться как 2 секунды.
			//На практике назад может нажиматься несколько раз и сохранится прокрутка до восстановления прошлого значения, тоесть собьётся
			Client.history[Client.cursor] = {scroll: [window.scrollX, window.scrollY]}
		}
		Client.lastpop = moment
		const search = Client.makeabs(Client.getSearch())
		
		const promise = Client.crossing(search)
		if (event.state?.view == Client.view) { //Вперёд
			const { cursor } = event.state
			Client.cursor = cursor
		} else {
			Client.start--
			Client.cursor = Client.start
			history.replaceState({cursor:Client.cursor, view:Client.view}, null, search)//Нужно сделать replace чтобы появился event.state
		}
		promise.then(() => window.scrollTo(...Client.history[Client.cursor].scroll)).catch(() => null)
	},
	click: (a) => {
		let search = a.dataset.clientsearch ?? a.getAttribute('href')
		const scroll = a.dataset.scroll != 'none'
		const promise = Client.pushState(search, scroll)
		return animate('a', a, a.dataset.animate, promise)
	},
	// fixa: (a) => {
	// 	let search = a.dataset.clientsearch ?? a.getAttribute('href')
	// 	a.dataset.clientsearch = search
	// 	search = Client.makeabs(search)
	// 	a.href = search
	// },
	// mousedown: (a) => Client.fixa(a),
	// focus: (a) => Client.fixa(a),
	getPath: () => decodeURI(location.pathname.replace(/\/$/,'')) || '/',
	getSearch: () => Client.getPath() + decodeURI(location.search) + location.hash,
	reloaddivs:[],
	reloaddiv: (div) => {
		if (!Array.isArray(div)) div = [div]
		if (!div.length) return
		div.forEach(div => {
			if (~Client.reloaddivs.indexOf(div)) return
			Client.reloaddivs.push(div)	
		})
		return Client.refreshState()
	},
	reload: () => { //depricated?
		//'/' переход с главной
		//'' переход с ничего
		Client.search = ''
		return Client.refreshState()
	},
	reloadtss:[],
	reloadts: (ts) => {
		if (~Client.reloadtss.indexOf(ts)) return
		Client.reloadtss.push(ts)
		return Client.refreshState()
	},
	reloadgs:[],
	global: (g) => {
		if (~Client.reloadgs.indexOf(g)) return
		Client.reloadgs.push(g)
		return Client.refreshState()
	},
	view:Date.now(), //Метка сеанса в котором актуальна Client.history
	history:[],
	start:history.length,
	cursor:history.length - 1,
	
	refreshState: (scroll = false) => {
		return Client.replaceState(Client.next?.search ?  Client.next.search : Client.search + location.hash, scroll)
	},
	scroll: promise => {
		const go = () => {
			let div
			const hash = location.hash.slice(1)
			if (hash) div = document.getElementById(hash)
			if (div) div.scrollIntoView()
			else window.scrollTo(0,0)
			if (hash) {
				if (!promise.finalled) {
					promise.then(go).catch(() => null)
				} else {
					setTimeout(() => { //fix scroll
						let y = window.scrollY
						setTimeout(() => {
							requestAnimationFrame(() => {
								if (y != window.scrollY) return
								const hash = location.hash.slice(1)
								if (hash) div = document.getElementById(hash)
								if (div) {
									div.scrollIntoView()
								} else {
									window.scrollTo(0,1)
									window.scrollTo(0,0)
								}
							})
						}, 1)
					}, 500)
				}
			}
		}
		promise.started.then(go).catch(() => null)
	},
	go: (search, scroll) => Client.pushState(String(search), scroll),
	pushState: (search, scroll = true) => {
		search = Client.makeabs(search)
		Client.history[Client.cursor] = {scroll: [window.scrollX, window.scrollY]}
		if (~location.href.indexOf(search)) {
			const a = document.createElement('a')
			const oldahref = location.href
			a.href = search
			const newahref = a.href
			if (oldahref == newahref) {
				const promise = Client.crossing(search)
				if (scroll)	Client.scroll(promise)
				return promise
			}
		}
		Client.cursor++

		history.pushState({cursor:Client.cursor, view:Client.view}, null, search)
		search = Client.getSearch() //Так резолвятся точки, но не слеш в конце
		//history.replaceState({cursor:Client.cursor, view:Client.view}, null, search) //А так и слэш. Ну и фиг с ним, резолвим сами в makeabs

		const promise = Client.crossing(search)
		if (scroll)	Client.scroll(promise)
		return promise
	},
	replaceState: (search = '', scroll = true) => {
		search = Client.makeabs(search)
		Client.history[Client.cursor] = {scroll: [window.scrollX, window.scrollY]}

		history.replaceState({cursor:Client.cursor, view:Client.view}, null, search) //Так резолвятся точки, но не слеш в конце

		search = Client.getSearch()
		//history.replaceState({cursor:Client.cursor, view:Client.view}, null, search) //А так и слэш. Ну и фиг с ним, резолвим сами в makeabs

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
			oldpromise.started.reject(promise.started)
			oldpromise.reject(promise)
		}

		Client.next = { search, promise }
		requestAnimationFrame(() => {
			if (promise.rejected) return
			applyCrossing()
		})
		return promise
	},
	show_promise: null,
	show_layers: [],
	show: (layer) => {
		//Нужно собрать все вызовы и выполнить разом

		Client.show_layers.push(layer)
		if (Client.show_promise) return Client.show_promise
		Client.show_promise = new Promise(resolve => {
			setTimeout(async () => {

				if (Client.next) await Client.next.promise
					
				const json = {layers:Client.show_layers, theme: Client.theme}
				
				Client.show_layers = []
				delete Client.show_promise

				const promise = createPromise('loaded and ready')
				promise.started = createPromise('already started')

				await Client.commonshow(json, Client.bread, promise, Client.timings)
				
				resolve(promise)
				promise.resolve(Client.search)
			}, 1)
		})
		return Client.show_promise
	},
	commonshow: async (json, bread, promise, timings, debug) => {
		const layers = json.layers
		const promises = loadAll(layers)
		for (const layer of layers) {
			layer.sys = {}
			const div = document.getElementById(layer.div)
			if (!div) continue; //слой может быть в onlyclient и ещё не показался если какое-то обновление сразу после загрузки
			layer.sys.div = div
			layer.sys.execute = createPromise()
			if (promise) promise.started.finally(() => {
				layer.sys.execute.reject()
			}).catch(e => null)
			const hash = location.hash.slice(1)
			let anim = layer.animate //Скрол неточный 1. из-за анимации и 2. из-за изменений DOM в скриптах
			if (hash && anim != 'none') anim = 'opacity'
			animate('div', div, anim, layer.sys.execute)
		}

		
		await Promise.all(promises)

		if (promise) {
			if (promise.rejected) return
			promise.started.resolve(bread.href)
		}

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
		if (json.rg) {
			Client.reloadgs = Client.reloadgs.filter(ts => {
				return !~json.rg.indexOf(ts)
			})
		}
		for (const layer of json.layers) {
			layer.sys.template = document.createElement('template')
			await addHtml(layer.sys.template, layer, bread, timings, json.theme)
		}
		
		const scripts = []
		for (const layer of json.layers) {
			const elements = layer.sys.template.content
			if (!layer.sys.div) continue; //слой может быть в onlyclient и ещё не показался если какое-то обновление сразу после загрузки
			const old = layer.sys.div.style.minHeight
			layer.sys.div.style.minHeight = layer.sys.div.offsetHeight + 'px'
			layer.sys.div.replaceChildren(elements)
			layer.sys.div.style.minHeight = old

			window.waitClient.stack.push(evalScripts(layer.sys.div))
			const promise = Promise.all(window.waitClient.stack)
			window.waitClient.stack = []
			promise.then(() => layer.sys.execute.resolve()).catch(e => null) //Покажется когда выполнятся скрипты
			scripts.push(promise)
		}
		await Promise.all(scripts)

		return true
	}
}
Client.makeabs = search => {	
	//search = search.replaceAll(/\/+/g,'/')
	if (/\/\.(\.){0,1}$/.test(search) || /\.(\.){0,1}\//.test(search)) { //Слэш в конце не поддерживается
		const a = document.createElement('a')
		a.href = search
		const newahref = a.href.slice(8).split('/').slice(1).filter(r => r).join('/')
		search = '/' + newahref.replace(/\/+$/,'')
	} else {
		if (search[0] != '/') { //относительный путь
			const base = '/' + document.baseURI.slice(8).split('/').slice(1).filter(r => r).join('/').split('?')[0] //  /some/path или '/'
			if (search == '?' ) search = base
			else if (search == '?#' ) search = base
			else if (search == '#' ) search = base + location.search
			else if (search == '.') search = base
			else if (search == '') search = base
			else if (search[0] == '?') search = base + search
			else if (search[0] == '#') search = base + location.search + search
			else if (base == '/') search = base + search
			else search = base + '/' + search
		}
		if (search != '/') search = search.replace(/\/$/,'')
	}
 	return search
}
// Client.makeabs = search => {	
// 	search = search.replaceAll(/\/+/g,'/')
// 	if (search[0] != '/') { //относительный путь
// 		const pathname = Client.getPath() // 	/some/path или '/'
// 		if (search == '?' ) search = pathname
// 		else if (search == '?#' ) search = pathname
// 		else if (search == '#' ) search = pathname + location.search
// 		else if (search == '.') search = pathname
// 		//С помощью ссылки нельзя сослаться на текущий буквальный адрес, только со сбросом якоря '#' или полным дублем

// 		else if (search[0] == '?') search = pathname + search
// 		else if (search[0] == '#') search = pathname + location.search + search
		
// 		else if (search.slice(0,3) == '../') search = pathname + '/' + search
// 		else if (search.slice(0,2) == './') search = pathname + '/' + search
// 		else { //else if (search == '') search = base
// 			const base = '/' + document.baseURI.slice(8).split('/').slice(1).join('/') //  /some/path или '/'
// 			search = base + search
// 		}
// 	}
// 	if (search != '/') search = search.replace(/\/$/,'')

// 	if (/\/\.(\.){0,1}$/.test(search)) { //Слэш в конце не поддерживается
// 		const a = document.createElement('a')
// 		a.href = search
// 		const newahref = a.href.slice(8).split('/').slice(1).join('/')
// 		search = '/' + newahref.replace(/\/+$/,'')
// 	}

//  	return search
// }
const explode = (sep, str) => {
	if (!str) return []
	const i = str.indexOf(sep)
	return ~i ? [str.slice(0, i), str.slice(i + 1)] : [str]
}
const userpathparse = (search) => {
	//У request всегда есть ведущий /слэш

	search = search.slice(1)
	


	try { search = decodeURI(search) } catch { }
	let [path = '', params = ''] = explode('?', search)

	const get = Theme.parse(params, '&')
	const secure = !!~path.indexOf('/.') || path[0] == '.'
	return {secure, path, get}
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
		vt: timings.view_time,
		ut: timings.update_time,
		st: timings.access_time,
		pv: Client.search,
		nt: search
	}
	if (Client.reloaddivs.length) req.rd = Client.reloaddivs.join(',')
	if (Client.reloadtss.length) req.rt = Client.reloadtss.join(',')
	if (Client.reloadgs.length) req.rg = Client.reloadgs.join(',')
		
	try {
		const json = await fetch('/-controller/get-layers', {
			method: "post",
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
			},
			body: new URLSearchParams(req)
		}).then(res => res.json())
		if (promise.rejected) return
		if (json && json.redirect) {
			return Client.replaceState(json.redirect)
		}
		if (!json || !json.st || !json.ut || !json.result || !json.layers || json.root != Client.bread.root || json.status != 200) {
			//return setTimeout(() => location.reload(), 200) //Чуть чуть подождать чтобы прокрутка закончилась?
			return location.reload()
		}
		
		const timings = {
			view_time: json.vt,
			update_time: json.ut,
			access_time: json.st
		}
		

		let usersearch = json.root ? search.slice(json.root.length + 1) : search
		if (usersearch.at(0) == '?') usersearch = '/' + usersearch
		const {path, get} = userpathparse(usersearch) //Останется ведущий слэш
		const bread = new Bread(path, get, search, json.root) //root+path+get = search
		bread.status = json.status
		const r = await Client.commonshow(json, bread, promise, timings)
		if (!r) return

		const event = new CustomEvent('crossing', {detail: {timings, bread, theme: json.theme}})
		window.dispatchEvent(event)
		
		Client.timings = timings
		Client.theme = json.theme
		Client.bread = bread
		Client.search = search
		Client.next = false

		promise.resolve(search)

		if (req.ut && req.ut < timings.update_time) {
			location.reload()
		}
		
	} catch (e) {
		console.log(e)
		Client.next = false
		promise.started.reject()
		promise.reject()
	}

}
const errmsg = (layer, e) => {
	console.log(layer, e)
	return `<pre><code>${layer.ts}<br>${e.toString()}</code></pre>`
}
const interpolate = (val, data, env) => new Function('data', 'env', 'return `'+val+'`')(data, env)

const addHtml = async (template, layer, bread, timings, theme) => {
	const crumb = bread.getCrumb(layer.depth || 0)
	let html = ''
	const look = { bread, timings, theme, host:location.host }
	const env = { layer, crumb, ...look }
	env.sid = 'sid-' + (layer.div || layer.name) + '-' + layer.sub + '-'
	env.scope = layer.div ? '#' + layer.div : 'html'
	if (layer.replacetpl) {
		const tpl = interpolate(layer.replacetpl, layer.sys.data, env)
		layer.sys.tplobj = await import(tpl).then(res => res.default || res).catch(e => {
			console.log('replacetpl', e, layer)
			if (!layer.onlyclient) location.reload()
		})
	}
	if (layer.tpltpl) {
		const tpl = interpolate(layer.tpltpl, layer.sys.data, env)
		layer.sys.tplobj = await import(tpl).then(res => res.default || res).catch(e => {
			console.log('tpltpl', e, layer)
			if (!layer.onlyclient) location.reload()
		})
	}

	if (layer.sys.html) {
		html = layer.sys.html
	} else if (layer.sys.tplobj) {
		//cookie:document.cookie, 
		const data = layer.sys.data
		try {
			html = layer.sys.tplobj[layer.sub](data, env)
		} catch (e) {
			html = errmsg(layer, e)
		}
	}

	if (template.content.children.length) {
		const div = template.content.getElementById(layer.div)
		if (!div) template.content.innerHTML += ' Не найден div ' + layer.div+ '. '
		if (div) div.innerHTML = html
		//if (!div) throw 'Не найден div '+layer.div
	} else {
		template.innerHTML = html
	}
	if (layer.layers) for (const l of layer.layers) {
		await addHtml(template, l, bread, timings, theme)
	}
}

const loadAll = (layers, promises = [], proc = {}) => {
	if (!layers) return promises

	const jsons = {}
	for (const layer of layers) {
		if (!layer.json) continue
		let promise = proc[layer.json]
		if (!promise) promise = fetch(layer.json).then(res => {
			// if (res.status != 200 && res.status != 422) {
			// 	console.log(4, res, layer)
			// 	if (!layer.onlyclient) location.reload()
			// 	return new Promise(() => {})//reload сразу не происходит, надо зависнуть
			// }
			const type = res.headers.get('Content-Type')
			if (~type.indexOf('text/html')) return res.text()
			return res.json()
		})
		jsons[layer.json] = promise
		proc[layer.json] = promise
	}
	for (const layer of layers) {
		if (!layer.sys) layer.sys = {}
		if (layer.tpl) {
			if (layer.sub) { //ts это например, index:ROOT означает что есть шаблон
				let promise = import(layer.tpl).then(res => {
					layer.sys.tplobj = res.default || res
				}).catch(e => {
					if (!layer.onlyclient) location.reload()
					return {}
				})
				promises.push(promise)
			}
			if (layer.json) {
				jsons[layer.json].then(data => {
					layer.sys.data = data
				}).catch(e => {
					layer.sys.data = errmsg(layer, e)
				})
				promises.push(jsons[layer.json])
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
		loadAll(layer.layers, promises, proc)
	}
	return promises
}