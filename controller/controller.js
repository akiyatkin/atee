// import { join, relative, format } from "path"
// import { whereisit } from './whereisit.js'
// import { pathToFileURL, fileURLToPath } from 'url'
// const { FILE_MOD_ROOT, IMPORT_APP_ROOT } = whereisit(import.meta.url)
// const resolveby = async (search, base) => {
//     console.log('base', base, pathToFileURL(base).href)
//     const to = await import.meta.resolve(search, pathToFileURL(base).href).then(src => src).catch(() => false)
//     if (!to) return false
//     console.log('to', to)
//     const from = pathToFileURL(FILE_MOD_ROOT).href
//     console.log('from', IMPORT_APP_ROOT)
//     path.format({
//         root: base,
//         dir: '/home/user/dir',
//         base: 'file.txt'
//     });
//     return relative(from,to)
// }
import { router } from './router.js'
import { ReadStream } from 'fs'
const readStream = stream => {
    return new Promise((resolve, reject) => {
        let data = ''
        stream.on('readable', () => {
            const d = stream.read()
            if (d === null) return
            data += d
        })
        stream.on('error', reject)
        stream.on('end', () => {
            resolve(JSON.parse(data))
        })
    })
}
export const controller = async (layers) => {
    const { tpl, json, tplroot } = layers
    //const ftpl = await webresolve(tpl) //получать путь по дефису и по default_loader_name не требуется так как путь как есть идёт в import
    // const { default: data }  = await import(IMPORT_APP_ROOT + '/' + json, {assert: { type: 'json' }})
    // const { root } = await import(IMPORT_APP_ROOT + '/' + ftpl)

    //Для json надо получить rest

    const {
        search, secure, get,
        rest, query, restroot
    } = await router(json)

    if (!rest) return { html: '', ar: [], status: 404, nostore: false }

    const { ans = false, ext = 'json', status = 200, nostore = false, headers = { } } = await rest(query, get)
    let data = ans
    if (ans instanceof ReadStream) {
        data = await readStream(ans)
    }


    //const { default: data } = await import(json, {assert: { type: 'json' }})

    //Для tpl import? тоже стоит получить rest вдруг шаблон генерируется
    // const ftpl = await resolveby(tpl,'./')
    // console.log('ftpl', ftpl)
    // console.log(ftpl)

    const objtpl = await import(tpl)

    const html = objtpl[tplroot || 'ROOT'].call(layers, data)

    const ar = []
    ar.push('</images/logo.svg>; rel=preload; as=image; type=image/svg+xml')


    return { html, ar, status, nostore}
}
