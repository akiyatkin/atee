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
const getHTML = layer => {
    const { tpl, json, sub, div } = layer
    let ar = []
    let html = ''
    let status = 200
    let data
    if (json) {
        let resjson = {
            ans: '',
            ext: 'json',
            status: 200, 
            nostore: false, 
            headers: { }
        }
        const {
            search, secure, get,
            rest, query, restroot
        } = await router(json)

        if (rest) resjson = {...resjson, ...(await rest(query, get))}
        else status = 500

        status = Math.max(status, resjson.status)
        data = resjson.ans
        if (res.ans instanceof ReadStream) {
            data = await readStream(ans)
        }
    }
    try {
        const objtpl = await import(tpl)
        const html = objtpl[sub](data, layer, seo)
        const ar = []
        ar.push('</images/logo.svg>; rel=preload; as=image; type=image/svg+xml')
        return { ...res, html, ar}
    } catch (e) {
        console.error(e)
        return { status: 500}
    }

}
export const controller = async (layers, seo) => {

    for (const layer of layers) {
        const { nostore, html, ar, status } = getHTML(layer)
        

        
    }
}
