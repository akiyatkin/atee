import { parse } from './headers.js'
const explode = (sep, str) => {
    const i = str.indexOf(sep)
    return ~i ? [str.slice(0, i), str.slice(i + 1)] : [str]
}
const getExt = (str) => {
    const i = str.lastIndexOf('.')
    return ~i ? str.slice(i + 1) : ''
}
export const pathparser = (request) => {
	request = request.slice(1);
    try { request = decodeURI(request) } catch { }
    const [path, params] = explode('?', request)
    const get = parse(params || '', '&');
    const ext = getExt(path)
    const secure = !!~path.indexOf('/.')
    const crumbs = path.split('/')
    return {secure, crumbs, path, ext, get}
}