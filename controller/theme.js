
const theme = {}
export default theme

theme.parse = (string, sep = '; ') => {
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
theme.get = () => theme.harvest({theme:new URL(location).searchParams.get('theme')}, document.cookie) //only for browser
theme.harvest = (get, cookie) => {
	const name = get.theme != null ? get.theme : fromCookie(cookie)
	const obj = theme.parse(name, ':')
	for (const key in obj) {
		const val = obj[key]
		if (!val) {
			delete obj[key]
			continue
		}
	}
	return obj
}
theme.torow = (theme) => {
	return Object.entries(theme).map(([key, val]) => {
		return encodeURIComponent(key) + '=' + encodeURIComponent(val)
	}).join(';')
}