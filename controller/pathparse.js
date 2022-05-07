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
export const pathparse = (request) => {
    //У request всегда есть ведущий /слэш

	request = request.slice(1);
    try { request = decodeURI(request) } catch { }
    let [path = '', params = ''] = explode('?', request)
    //path = path.replace(/\/+/,'/').replace(/\/$/,'')
    
    const get = parse(params, '&');
    const ext = getExt(path)
    const secure = !!~path.indexOf('/.')
    const crumbs = path.split('/')
    return {secure, crumbs, path, ext, get}
}
export const parse = (string, sep = '; ') => {
    const cookie = string?.split(sep).reduce((res, item) => {
        if (!item) return res
        const data = item.split('=')
        res[decodeURIComponent(data.shift())] = data.length ? decodeURIComponent(data.join('=')) : ''
        return res
    }, {})
    return cookie || {}
}