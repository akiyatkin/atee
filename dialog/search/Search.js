import nicked from "/-nicked"
import createPromise from "/-controller/createPromise.js"
import Dialog from "/-dialog/Dialog.js"

const link = document.createElement('link')
link.rel = 'stylesheet'
link.href = '/-dialog/search/search.css'
document.head.prepend(link)

const cls = (div, cls) => div.getElementsByClassName(cls)
const tag = (div, tag) => div.getElementsByTagName(tag)

export const Search = {
	open: async conf => {
		const popup = await Dialog.open({
			conf,
			tpl:"/-dialog/search/search.html.js",
			sub:"POPUP"
		})
		const form = popup.getElementsByTagName('form')[0]
		Search.init(form, (row, need) => conf.click(row, need))
	},
	ws: new WeakMap(),
	getState: form => {
		let state = Search.ws.get(form)
		if (state) return state
		state = {
			click: null,
			item: null,
			hash: null,
			select: false
		}
		Search.ws.set(form, state)
		return state
	},
	getMenu: async form => {
		let div = cls(form, 'searchmenu')[0]
		if (div) return div
		const tplobj = await import('/-dialog/search/search.html.js')
		const html = tplobj.MENU()
		form.classList.add('searchform')
		form.insertAdjacentHTML('beforeEnd', html)
		return cls(form, 'searchmenu')[0]
	},
	fetchpromises:{ },
	fetchpromise: null,
	time: null,


	//fetch_promises: {}, //кэш
	fetch_need: null, //Последний запрос на который надо ответить
	fetch_promise: null, //Действующий запро
	fetch: (form, need) => {
		if (Search.fetch_need?.hash === need.hash) {
			Search.fetch_need.query = need.query
			return
		}
		Search.fetch_need = need
		return Search.fetchNow(form)
	},
	fetchApply: (form, promise, need) => {
		promise.then(ans => {
			Search.ready(form, ans, need)
			Search.fetchNow(form)
		}).catch(e => null)
	},
	fetchNow: (form) => {
		if (Search.fetch_need === null) return
		if (Search.fetch_promise) return Search.fetch_promise.reject() //Этот облом отменит предыдущий
		const need = Search.fetch_need
		Search.fetch_need = null
		Search.fetch_promise = Search.fetchCreate(need, form.action)
		Search.fetchApply(form, Search.fetch_promise, need)
		Search.fetch_promise.catch(() => delete Search.fetch_promise[need.hash])
		Search.fetch_promise.finally(() => Search.wait(form, need)).catch(e => null)
	},
	timer: null,
	wait: (form, need) => {
		//Search.timer = setTimeout(() => { нужен тут драблинг или обламывать предыдущий запрос не очевидно
			if (Search.fetch_need && Search.fetch_need.hash !== need.hash) return Search.wait(form, Search.fetch_need)
			delete Search.fetch_promise
			Search.fetchNow(form)
		//}, 100)
	},
	fetchCreate: ({hash, partner}, action) => {
		const fetch_promise = createPromise('Search promise ' + hash)
		const controller = new AbortController()
		const signal = controller.signal
		const promise = fetch(action + (/\?/.test(action) ?  '&' : '?') + 'hash=' + hash, {signal}).then(res => res.json()).catch(e => null)

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
		const menu = await Search.getMenu(form)
	 	const title = cls(menu, 'searchtitle')[0]
	 	const body = cls(menu, 'searchbody')[0]
	 	body.classList.remove('mute')
	 	const state = Search.getState(form)
		const tplobj = await import('/-dialog/search/search.html.js')

		if (!ans.list.length) {
			title.innerHTML = tplobj.TITLEBODY({ ...need, ans })
		} else {
			title.innerHTML = ''
		}

		body.innerHTML = tplobj.BODY({ ...need, ans })
		
		let i = 0
		for (const btn of body.getElementsByTagName('button')) {
			const index = i++
			btn.addEventListener('click', async (e) => {
				if (!e.pointerType) {
					if (!need.hash) {
						return e.preventDefault() //Enter в input генерирует click по ближайшей кнопке
					}
					
				}
				e.preventDefault()
				const r = await state.click(ans.list[index], need)
				if (r === null || r) Dialog.hide()
			})
		}
	},
	getNeed: async input => {
		const getNeed = await import('/-nicked/getNeed.js').then(r => r.default)
		const need = getNeed(input)
		const Theme = await import('/-controller/Theme.js').then(r => r.default)
		const theme = Theme.get()
		need.partner = theme.partner || ''
		return need
	},
	init: (form, click) => {

		const state = Search.getState(form)
		state.click = click
		const input = form.elements.search
		if (!input) return false
		input.classList.add('searchinput')
		input.setAttribute('autocomplete','off')
		const searchfrominput = async () => {
			const menu = await Search.getMenu(form)
			menu.classList.add('show')
			const need = await Search.getNeed(input)
			if (state.hash != need.hash || state?.partner != need.partner) {
				const title = cls(menu, 'searchtitle')[0]
				const body = cls(menu, 'searchbody')[0]
				state.hash = need.hash
				state.partner = need.partner
				body.classList.add('mute')
				Search.fetch(form, need)
				const tplobj = await import('/-dialog/search/search.html.js')
				title.innerHTML = tplobj.TITLE(need)
				
			}
		}

		form.addEventListener('submit', async e => {
			e.preventDefault()
			//if (e.pointerType) return
			//Enter в input из-за проверки pointerType не кликает по кнопке

			// const ans = await Search.fetch_promise
			// const need = await Search.getNeed(input)
			// console.log('asdf', ans, need)
			// if (ans && need.hash) {
			// 	const r = await state.click(ans.list[0], need)
			// 	if (r === null || r) Dialog.hide()
			// } else {
			// 	//чтобы нажался Enter надо что-то напечатать
			// 	//const r = await state.click({}, need)
			// 	//if (r === null || r) Dialog.hide()
			// }
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
			const menu = await Search.getMenu(form)
			menu.classList.remove('show') //Скрываем меню
		})

		document.body.addEventListener('keyup', async e => {
			if (e.which != 9) return //TAB
			if (!form.closest('body')) return
			const path = getPath(document.activeElement)
			if (path.find(el => el == form)) return;
			const menu = await Search.getMenu(form)
			menu.classList.remove('show') //Скрываем меню
		})
		document.body.addEventListener('click', async e => {
			if (!form.closest('body')) return
			const menu = await Search.getMenu(form)
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
export default Search