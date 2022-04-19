import { join } from "path"
import { createReadStream } from 'fs'
const getExt = (str) => {
    const i = str.lastIndexOf('.')
    return ~i ? str.slice(i + 1) : ''
}
export const files = (pub) => {
    return (query, get) => {
        const ext = getExt(query)
        if (!ext) return false
        const ans = createReadStream(join(pub, query))
        return { ans, ext, status: 200, nostore: false }
    }
}
