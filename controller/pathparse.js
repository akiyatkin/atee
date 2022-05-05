const explode = (sep, str) => {
    const i = str.indexOf(sep)
    return ~i ? [str.slice(0, i), str.slice(i + 1)] : [str]
}
const getExt = (str) => {
    const i = str.lastIndexOf('.')
    return ~i ? str.slice(i + 1) : ''
}
export const pathparse = (request) => {
	request = request.slice(1);
    try { request = decodeURI(request) } catch { }
    const [path, params] = explode('?', request)
    const get = parse(params || '', '&');
    const ext = getExt(path)
    const secure = !!~path.indexOf('/.')
    const crumbs = path.split('/')
    return {secure, crumbs, path, ext, get}
}
export const parse = (string, sep = '; ') => {
    const cookie = string?.split(sep).reduce((res, item) => {
        if (!item) return res
        const data = item.split('=')
        res[decodeURIComponent(data.shift())] = data.length ? decodeURIComponent(data.join('=')) : null
        return res
    }, {})
    return cookie || {}
}