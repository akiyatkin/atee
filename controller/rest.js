import { files } from "./files.js"
import { join } from 'path'
import { readFile } from "fs/promises"
import { Meta, View } from "./Meta.js"

import { whereisit } from './whereisit.js'
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
meta.addArgument('prev')
meta.addArgument('next')


meta.addAction('sw.js', async view => {
    const res = await view.get('access')
    const script = await readFile(FILE_MOD_ROOT + '/sw.js', 'utf-8')
    const ans = `
        let UPDATE_TIME = ${res.UPDATE_TIME}
        let ACCESS_TIME = ${res.ACCESS_TIME}
        ${script}`
    return ans
})
meta.addAction('layers', async view => {
    const {prev, next} = await view.gets(['prev','next'])
    view.ans.layers = LAYERS.root
    return view.ret()
})

let LAYERS
export const rest = l => {
    LAYERS = l
    return async (query, get) => {
        if (query == 'init.js') return files(FILE_MOD_ROOT + '')('init.js')
        if (query == 'test.js') return files(FILE_MOD_ROOT + '')('test.js')
        const ans = await meta.get(query, get)
        if (query == 'sw.js') {
            return {ans, ext: 'js', status: 200, nostore: false, headers: { 'Service-Worker-Allowed': '/' }}
        } else {
            return { ans, status: 200, nostore: ~['set-access','access'].indexOf(query), ext: 'json' }
        }
    }
}
