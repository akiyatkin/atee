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

    let data = true
    let res = {
        ext: 'json',
        status: 200, 
        nostore: false, 
        headers: { }
    }
    if (json) {
        const {
            search, secure, get,
            rest, query, restroot
        } = await router(json)

        if (!rest) return { ...res, html: '', ar: [], status: 404, nostore: false }

        res = {...jsonres, ...(await rest(query, get))}
        data = ans
        if (res.ans instanceof ReadStream) {
            data = await readStream(ans)
        }
    }
    try {
        const objtpl = await import(tpl)
        const html = objtpl[tplroot || 'ROOT'].call(layers, data, layers)
        const ar = []
        ar.push('</images/logo.svg>; rel=preload; as=image; type=image/svg+xml')
        return { ...res, html, ar}
    } catch (e) {
        console.error(e)
        return { status: 500}
    }
    
}
