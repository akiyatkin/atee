import { pathparse, parse } from './pathparse.js'

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
		Client.apply()
		return Client.next.promise
	},
	apply: async () => {
		if (!Client.next) return
		const {search, promise} = Client.next

		const req = {
			globals: '',
			update_time: 0,
			access_time: 0,
			prev: false,
			next: search
		}
		
		let data = new FormData()
  		data.append('globals', '')
  		data.append('update_time', 0)
  		data.append('access_time', 0)
  		data.append('prev', '')
  		data.append('next', search)

		const res = await fetch('/-controller/layers', {
			method: "post",
			body: data
		}).then(res => res.json())
		
		console.log(res)
		
		if (promise.rejected) return Client.apply()

		Client.next = false
		promise.resolve(search)
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