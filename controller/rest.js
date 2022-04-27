import { files } from "./files.js"
import path from 'path'
import { readFile } from "fs/promises"
import { Meta, View } from "./Meta.js"
import { parse } from './headers.js'
import { whereisit } from './whereisit.js'
import { router } from './router.js'

const { FILE_MOD_ROOT, IMPORT_APP_ROOT } = whereisit(import.meta.url)

const UPDATE_TIME = Date.now()
let ACCESS_TIME = Date.now()

export const meta = new Meta()

meta.addAction('access', view => {
    view.ans['UPDATE_TIME'] = UPDATE_TIME
    view.ans['ACCESS_TIME'] = ACCESS_TIME
    return view.ret()
})
meta.addAction('set-access', view => {
    ACCESS_TIME = Date.now()
    return view.ret()
})

meta.addArgument('cookie', (view, cookie) => {
    return parse(cookie, '; ')
})
meta.addArgument('host')
meta.addArgument('prev')
meta.addArgument('next')
meta.addArgument('root')


meta.addAction('sw.js', async view => {
    const res = await view.get('access')
    const script = await readFile(FILE_MOD_ROOT + '/sw.js', 'utf-8')
    const ans = `
        let UPDATE_TIME = ${res.UPDATE_TIME}
        let ACCESS_TIME = ${res.ACCESS_TIME}
        ${script}`
    return ans
})

const interpolate = function(strings, params) {
    const names = Object.keys(params)
    const vals = Object.values(params)
    return new Function(...names, `return \`${strings}\``)(...vals)
}

meta.addAction('layers', async view => {
    const {prev, next, host, cookie, root} = await view.gets(['prev', 'next', 'host', 'cookie', 'root'])

    const {
        search, secure, get,
        rest, query, restroot,
        cont, root: nextroot, crumbs
    } = await router(next)

    if (rest || secure || root != nextroot) return view.err()

    const { default: layers } = await import(path.posix.join(IMPORT_APP_ROOT, root, 'layers.json'), {assert: { type: "json" }})
    if (layers.root.jsontpl) {
        layers.root.json = interpolate(layers.root.jsontpl, {get, host, cookie, root })
    }
    view.ans.layers = layers.root
    return view.ret()
})
meta.addAction('importmap', async view => {
    return {
        "@atee/": "/-controller/map/@atee/"
    }
})


export const rest = async (query, get) => {

    if (query == 'init.js') return file(FILE_MOD_ROOT + 'init.js', 'js')
    if (query == 'test.js') return files(FILE_MOD_ROOT + 'test.js', 'js')
    const ans = await meta.get(query, get)
    if (query == 'importmap') { //Пока что не поддерживается
        return {ans, ext: 'json', status: 200, headers: { 'content-type': 'application/importmap+json' }}
    }
    if (query == 'sw.js') {
        return { ans, ext: 'js', status: 200, nostore: false, headers: { 'Service-Worker-Allowed': '/' }}
    } else {
        return { ans, status: 200, nostore: ~['set-access','access'].indexOf(query), ext: 'json' }
    }
}
