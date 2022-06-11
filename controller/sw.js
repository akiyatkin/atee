let ACCESS_TIME = 0
let UPDATE_TIME = 0
this.addEventListener('install', event => {
	console.log('SW install')
  	this.skipWaiting();
})

this.addEventListener('activate', event => {
	console.log('SW activate')
})

this.addEventListener('message', event => {
	if (ACCESS_TIME >= event.data.ACCESS_TIME && UPDATE_TIME >= event.data.UPDATE_TIME) return
	ACCESS_TIME = event.data.ACCESS_TIME
	UPDATE_TIME = event.data.UPDATE_TIME
	event.waitUntil(this.clients.matchAll().then(clientList => {
		clientList.forEach(client => {
			client.postMessage(event.data)
		})
	}))
})

this.addEventListener('fetch', event => {
	//Только с сервера, только GET, и без -
	if (event.request.method !== 'GET') return
	if (!ACCESS_TIME || !UPDATE_TIME) return

	let url = new URL(event.request.url)

	//??
	if (url.origin !== location.origin) return

	let dyn = false
	let ext = url.pathname.match(/\.(\w+$)/)
	if (~url.search.indexOf('sw=public')) {
		dyn = false
	} else if (!ext) {
		dyn = true
	}

	//?sw=public - делает из динамики кэш как у статики. Кэш мощнее. но обновится с update_time
	//?t - отключает обработку, если кэш есть он не сбросится никогда. Самый мощный кэш. не реагирует ни на update_time ни на access_time из расчёта что там nostore заголовок есть
	if (/[&\?]t[=&\?]/.test(url.search)) return
	if (/[&\?]t$/.test(url.search)) return


	const {
		credentials, headers, integrity,
		method, redirect, referrer, referrerPolicy
	} = event.request

	let cache = 'default'

	let options = {
		cache, credentials, headers, integrity,
		method, redirect, referrer, referrerPolicy
	}

	url = event.request.url
	url = url + (~url.indexOf('?') ? '&' : '?') + 't='

	if (dyn || event.request.mode == 'navigate') {
		url += ACCESS_TIME
	} else {
		url += UPDATE_TIME
	}

	if (event.request.mode == 'no-cors') {
		mode = 'no-cors'
	} else {
		mode = null
	}

	let request = new Request(url, options)

	//console.log(event.request.url, UPDATE_TIME)
	let response = fetch(request)
	response.headers.set('Cache-Control', 'no-store');
	event.respondWith(response)
});
