
const Theme = {}
export default Theme

const parse = (string, sep = '; ') => {
    const obj = string?.split(sep).reduce((res, item) => {
        if (!item) return res
        item = item.replace(/\+/g, '%20')
        const data = item.split('=')
        res[decodeURIComponent(data.shift())] = data.length ? decodeURIComponent(data.join('=')) : ''
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

Theme.harvest = (get, cookie) => {
	const name = get.theme != null ? get.theme : fromCookie(cookie)
	const theme = parse(name,':')
	for (const key in theme) {
		const val = theme[key]
		if (!val) {
			delete theme[key]
			continue
		}
	}
	return theme
}
