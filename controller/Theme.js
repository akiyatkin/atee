//const Theme = new EventTarget()
const Theme = {}
export default Theme

Theme.parse = (string, sep = '; ') => {
	// const obj = string?.split(sep).reduce((res, item) => {
	// 	if (!item) return res
	// 	item = item.replace(/\%/g, '%25')
	// 	item = item.replace(/\+/g, '%20')
	// 	const data = item.split('=')
	// 	try {
	// 		res[decodeURIComponent(data.shift())] = data.length ? decodeURIComponent(data.join('=')) : ''
	// 	} catch(e) {
	// 		//console.log('Ошибка в ' + item, 'Вся строка ' + string, e)
	// 		console.log('Пропущен аргумент в запросе decodeURIComponent error ' + item)
	// 	}
	// 	return res
	// }, {})
	// const obj = string?.split(sep).reduce((res, item) => {
	// 	if (!item) return res
	// 	item = item.replace(/\+/g, ' ')
	// 	const data = item.split('=')
	// 	try {
	// 		res[data.shift()] = data.length ? data.join('=') : ''
	// 	} catch(e) {
	// 		//console.log('Ошибка в ' + item, 'Вся строка ' + string, e)
	// 		console.log('Пропущен аргумент в запросе decodeURIComponent error ' + item)
	// 	}
	// 	return res
	// }, {})
	const obj = string?.split(sep).reduce((res, item) => {
		if (!item) return res
		item = item.replace(/\+/g, '%20')
		const data = item.split('=')
		try {
			res[decodeURIComponent(data.shift())] = data.length ? decodeURIComponent(data.join('=')) : ''
		} catch(e) {
			//console.log('Ошибка в ' + item, 'Вся строка ' + string, e)
			console.log('Пропущен аргумент в запросе decodeURIComponent error ' + item)
		}
		return res
	}, {})
	return obj || {}
}
const fromCookie = (cookie) => {
	let name = cookie.match('(^|;)?theme=([^;]*)(;|$)')
	if (!name) return ''
	if (name == 'deleted') return ''
	return decodeURIComponent(name[2])
}
Theme.get = () => Theme.harvest({theme:new URL(location).searchParams.get('theme')}, document.cookie) //only for browser
Theme.harvest = (get, cookie) => {
	const name = get.theme != null ? get.theme : fromCookie(cookie)
	const obj = Theme.parse(name, ':')
	for (const key in obj) {
		const val = obj[key]
		if (!val) {
			delete obj[key]
			continue
		}
	}
	return obj
}
Theme.set = (view, theme) => {
	const themevalue = Object.entries(theme).map(a => a.join("=")).join(":")
	if (themevalue) {
		view.headers['Set-Cookie'] = 'theme=' + encodeURIComponent(themevalue) + '; path=/; SameSite=Strict; expires=Fri, 31 Dec 9999 23:59:59 GMT'
	} else {
		view.headers['Set-Cookie'] = 'theme=; path=/; SameSite=Strict; Max-Age=-1;'
	}
}
Theme.torow = (theme) => {
	return Object.entries(theme).map(([key, val]) => {
		return encodeURIComponent(key) + '=' + encodeURIComponent(val)
	}).join(';')
}