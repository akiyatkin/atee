import { rest as controller } from './rest.js'
import { files } from './files.js'
//import layers from '../layers.json' assert { type: "json" }
import { whereisit } from './whereisit.js'
const { FILE_MOD_ROOT, IMPORT_APP_ROOT } = whereisit(import.meta.url)

const explode = (sep, str) => {
    const i = str.indexOf(sep)
    return ~i ? [str.slice(0, i), str.slice(i + 1)] : [str]
}
const getExt = (str) => {
    const i = str.lastIndexOf('.')
    return ~i ? str.slice(i + 1) : ''
}
const getRoot = (str) => {
    const i = str.indexOf('/',1)
    return ~i ? str.slice(1, i) : ''
}
const pathparser = request => { //request всегда со слэшом в начале
    request = request.slice(1);
    try { request = decodeURI(request) } catch { }
    const [path, params] = explode('?', request)
    const get = { };
    if (params) {
        const ar = params.split('&');
    	for (let i = 0; i < ar.length; i++) {
            const [key, value] = explode('=', ar[i])
            get[key] = value;
    	}
    }
    const ext = getExt(path)
    const secure = !!~path.indexOf('/.')
    const crumbs = path.split('/')

    return {secure, crumbs, path, ext, get}
}
export const router = async (search, host) => {

    const { default: layers } = await import(IMPORT_APP_ROOT + '/layers.json', {assert: { type: "json" }})

    const SCOPE = {
        '': files('./public'),
        'robots.txt': (query, get) => {
            const ans = "Host: " + host
            return { ans, status: 200, nostore: false, ext: 'txt' }
        },
        '-controller': controller(layers)
    }
    const {secure, path, crumbs, ext, get} = pathparser(search)
    let rest = false
    let query = false
    let root = ''
    let cont = SCOPE


    const scope1 = SCOPE[crumbs[0]]
    let scope2
    if (scope1 && !scope1 instanceof Function) {
        scope2 = scope1[crumbs[1]]
        if (scope2 instanceof Function) {
            rest = scope2
            query = crumbs.slice(2).join('/')
        }
        root = crumbs.shift()
        cont = scope1
    } else {
        if (scope1 instanceof Function) {
            rest = scope1
            query = crumbs.slice(1).join('/')
        }
    }
    if (!rest && ext) {
        if (cont['']) {
            if (root) query = crumbs.join('/')
            else query = crumbs.join('/')
            rest = cont['']
        }
    }

    return {
        secure, get,
        rest, query,
        cont, root, crumbs
    }
}
