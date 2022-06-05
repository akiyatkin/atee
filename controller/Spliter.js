export const explode = (sep, str) => {
    if (!str) return []
    const i = str.indexOf(sep)
    return ~i ? [str.slice(0, i), str.slice(i + 1)] : [str]
}
export const split = (sep, str) => {
    return str ? explode(sep, str) : ['']
}
const getExt = (str) => {
    const i = str.lastIndexOf('.')
    const ext = ~i ? str.slice(i + 1) : ''
    return ~i && !ext ? true : ext
}
const getName = (str) => {
    const i = str.lastIndexOf('.')
    const name = ~i ? str.slice(0, i) : file
    return name
}
export const pathparse = (request) => {
    //У request всегда есть ведущий /слэш
	request = request.slice(1);
    try { request = decodeURI(request) } catch { }
    let [path = '', params = ''] = explode('?', request)
    path = path.replace(/\/+/,'/').replace(/\/$/,'')//Дубли и слешей не ломают путь, но это плохо...
    
    const get = parse(params, '&');
    const ext = getExt(path)
    const secure = !!~path.indexOf('/.')
    const crumbs = path.split('/')
    return {secure, crumbs, path, ext, get}
}
export const parse = (string, sep = '; ') => {
    
    const cookie = string?.split(sep).reduce((res, item) => {
        if (!item) return res
        item = item.replace(/\+/g, '%20')
        const data = item.split('=')
        res[decodeURIComponent(data.shift())] = data.length ? decodeURIComponent(data.join('=')) : ''
        return res
    }, {})
    return cookie || {}
}