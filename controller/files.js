import { join } from "path"
import { createReadStream, readFileSync } from 'fs'
const getExt = (str) => {
    const i = str.lastIndexOf('.')
    return ~i ? str.slice(i + 1) : ''
}
export const files = (pub) => {
    return (query, get) => {
        const ext = getExt(query)
        if (!ext) return false
        const data = createReadStream(join(pub, query))
        return { data, ext }
    }
}
export const file = (src, ext) => {
    return (query, get) => {
        const data = createReadStream(src)
        return { data, ext }
    }
}
export const filesw = (src, ext) => {
    return (query, get) => {
        const data = createReadStream(src)
        const headers = { 'Service-Worker-Allowed': '/' }
        return { data, ext, headers }
    }
}
