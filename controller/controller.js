import { join } from "path"
import { resolve } from './loader.js'

import { whereisit } from './whereisit.js'
const { FILE_MOD_ROOT, IMPORT_APP_ROOT } = whereisit(import.meta.url)

export const controller = async (layers) => {
    
    const { tpl, json } = layers


    const ftpl = resolve(tpl) //получать путь по дефису и по default_loader_name не требуется так как путь как есть идёт в import



    const { default: data }  = await import(IMPORT_APP_ROOT + '/' + json, {assert: { type: 'json' }})
    const { root } = await import(IMPORT_APP_ROOT + '/' + ftpl)
    const html = root(data)


    const ar = []
    ar.push('</images/logo.svg>; rel=preload; as=image; type=image/svg+xml')
    let status = 200
    let nostore = false
    return { html, ar, status, nostore}
}
