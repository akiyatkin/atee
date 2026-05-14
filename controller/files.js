import { join } from "path"
import { createReadStream, readFileSync } from 'fs'
const getExt = (str) => {
    const i = str.lastIndexOf('.')
    return ~i ? str.slice(i + 1) : ''
}
// export const files = (pub) => {
//     return (query, get) => {
//         const ext = getExt(query)
//         if (!ext) return false
//         const data = createReadStream(join(pub, query))
//         return { data, ext }
//     }
// }
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
export const readStreamAndClose = async (stream, options = {}) => {
    const { timeout = 30000, encoding = 'utf8' } = options;
    
    let timeoutId;
    const chunks = [];
    
    try {
        // Создаем promise с таймаутом
        const readPromise = (async () => {
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            return Buffer.concat(chunks).toString(encoding);
        })();
        
        // Таймаут
        timeoutId = setTimeout(() => {
            if (!stream.destroyed) {
                stream.destroy(new Error(`Stream timeout after ${timeout}ms`));
            }
        }, timeout);
        
        return await readPromise;
    } finally {
        clearTimeout(timeoutId);
        // Гарантированно закрываем поток
        if (stream && !stream.destroyed) {
            if (typeof stream.destroy === 'function') {
                stream.destroy();
            }
        }
    }
}