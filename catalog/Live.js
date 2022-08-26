import { nicked } from "/-nicked/nicked.js"
import { createPromise } from "/-controller/createPromise.js"


const link = document.createElement('link')
link.rel = 'stylesheet'
link.href = '/-catalog/live.css'
document.head.prepend(link)

const cls = (div, cls) => div.getElementsByClassName(cls)
const tag = (div, tag) => div.getElementsByTagName(tag)

export const Live = {
	ws: new WeakMap(),
	getState: form => {
		let state = Live.ws.get(form)
		if (state) return state
		state = {
			item: null,
			hash: null,
			select: false
		}
		Live.ws.set(form, state)
		return state
	},
	getMenu: async form => {
		let div = cls(form, 'livemenu')[0]
		if (div) return div
		const tplobj = await import('/-catalog/live.html.js')
		const html = tplobj.MENU()
		form.classList.add('liveform')
		form.insertAdjacentHTML('beforeEnd', html)
		return cls(form, 'livemenu')[0]
	},
	fetchpromises:{ },
	fetchpromise: null,
	time: null,


	//fetch_promises: {}, //кэш
	fetch_need: null, //Последний запрос на который надо ответить
	fetch_promise: null, //Действующий запро
	fetch: (form, need) => {
		if (Live.fetch_need?.hash === need.hash) {
			Live.fetch_need.query = need.query
			return
		}
		Live.fetch_need = need
		return Live.fetchNow(form)
	},
	fetchApply: (form, promise, need) => {
		promise.then(ans => {
			console.log(need)
			Live.ready(form, ans, need)
			Live.fetchNow(form)
		}).catch(e => null)
	},
	fetchNow: async (form) => {
		if (Live.fetch_need === null) return
		if (Live.fetch_promise) return Live.fetch_promise.reject() //Этот облом отменит предыдущий
		const need = Live.fetch_need
		const { hash } = need
		Live.fetch_need = null
		Live.fetch_promise = Live.fetchCreate(hash)
		Live.fetchApply(form, Live.fetch_promise, need)
		Live.fetch_promise.catch(() => delete Live.fetch_promise[hash])
		Live.fetch_promise.finally(() => Live.wait(form, need)).catch(e => null)
	},
	timer: null,
	wait: (form, need) => {
		Live.timer = setTimeout(() => {
			if (Live.fetch_need && Live.fetch_need.hash !== need.hash) return Live.wait(form, Live.fetch_need)
			delete Live.fetch_promise
			Live.fetchNow(form)
		}, 100)
	},
	fetchCreate: (hash = '') => {
		const fetch_promise = createPromise('live promise ' + hash)
		const controller = new AbortController()
		const signal = controller.signal
		const promise = fetch('/-catalog/get-livemodels?hash='+hash, {signal}).then(res => res.json()).catch(e => null)
		promise.then((ans) => {
			fetch_promise.resolve(ans)
		})
		promise.catch((ans) => {
			fetch_promise.reject()
		})
		fetch_promise.catch(e => {
			controller.abort()
		})
		return fetch_promise
	},
	
	ready: async (form, ans, need) => {
		const menu = await Live.getMenu(form)
	 	const title = cls(menu, 'livetitle')[0]
	 	const body = cls(menu, 'livebody')[0]
	 	body.classList.remove('mute')
	 	const state = Live.getState(form)
		const tplobj = await import('/-catalog/live.html.js')
		title.innerHTML = tplobj.TITLEBODY({ ...need, ans })
		body.innerHTML = tplobj.BODY({ ...need, ans })
	},
	getNeed: (input) => {
		let query = input.value
		query = query.toLowerCase()
		query = query.replace(/<\/?[^>]+(>|$)/g, "")
		query = query.replace(/[\s\-\"\']+/g, " ")
		const hash = nicked(query).split('-')
			//.filter(val => val.length > 1)
			.join('-')
		//const hash = nicked(query).split('-').filter(val => val.length > 1).join('-')
		return {query, hash}
	},
	init: form => {
		const state = Live.getState(form)
		const input = form.elements.search
		if (!input) return false
		input.classList.add('liveinput')
		input.setAttribute('autocomplete','off')
		const searchfrominput = async () => {
			const menu = await Live.getMenu(form)
			menu.classList.add('show')
			const need = Live.getNeed(input)
			if (state.hash != need.hash) {
				const title = cls(menu, 'livetitle')[0]
				const body = cls(menu, 'livebody')[0]
				state.hash = need.hash
				body.classList.add('mute')
				const tplobj = await import('/-catalog/live.html.js')
				title.innerHTML = tplobj.TITLE(need)
				Live.fetch(form, need)
			}
		}

		form.addEventListener('submit', async e => {
			e.preventDefault()
			const need = Live.getNeed(input)
			const Client = await window.getClient()
			Client.pushState(need.hash ? '/catalog?m=:search=' + need.hash : '/catalog')
		})

		if (document.activeElement == input) searchfrominput()
		input.addEventListener('focus', () => {
			//if (!input.value) return
			searchfrominput()
		})
		//input.addEventListener('click', searchfrominput)
		input.addEventListener('input', searchfrominput)
		const getPath = el => {
			const path = [el]
			while (el && el.parentElement) {
				path.push(el = el.parentElement)
			}
			return path
		}
		document.body.addEventListener('keydown', async e => {
			if (e.which != 27) return //ESC
			if (!form.closest('body')) return
			const menu = await Live.getMenu(form)
			menu.classList.remove('show') //Скрываем меню
		})
		document.body.addEventListener('keyup', async e => {
			if (e.which != 9) return //TAB
			if (!form.closest('body')) return
			const path = getPath(document.activeElement)
			if (path.find(el => el == form)) return;
			const menu = await Live.getMenu(form)
			menu.classList.remove('show') //Скрываем меню
		})
		document.body.addEventListener('click', async e => {
			if (!form.closest('body')) return
			const menu = await Live.getMenu(form)
			if (!menu.classList.contains('show')) return
			let el = e.target
			const path = getPath(el)
			if (!path.find(el => el.tagName == 'A')) {//Клик по ссылке всегда сворачивает меню
				if (path.find(el => el == input)) return; //Клик по форме не сворачивает
				if (path.find(el => el == menu)) return; //Клик по меню не сворачивает
			}
			//e.stopPropagation()
			//e.preventDefault()
			menu.classList.remove('show') //Скрываем меню
		}, true)
	}
}
window.Live = Live