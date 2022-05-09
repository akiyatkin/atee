import { pathToFileURL } from 'url'
import { readdir } from 'fs/promises'


// const MAP = {
//     '-controller/server.js': '@atee/controller/server.js',
//     //'controller/server.js': '@atee/controller/server.js',
//     '-index.html.js': 'index.html.js',
// }

/*
    Все папки в корне и все папки в node_modules
    -data - будет работать
*/
// const path = 'node_modules/'
// try {
//   const files = await readdir(path);
//   for (const file of files)
//     console.log('asdf',file);
// } catch (err) {
//   console.error(err);
// }
const isExt = (str) => {
    const i = str.lastIndexOf('.')
    const ext = ~i ? str.slice(i + 1) : ''
    return ext && ext.length < 5 
}
const checkAccessMark = (src) => {
    //data from root
    //data
    //./data
}
const checkfromroot = async (path, context, defaultResolve) => {
    const { Access } = await import('@atee/controller/Access.js')
    if (isExt(path) && path.indexOf('./data/') === 0) {
        path = path + (~path.indexOf('?') ? '&' : '?') + 't=' + Access.getAccessTime()
    }
    return defaultResolve(path, {
        ...context,
        parentURL: pathToFileURL('./')
    }, defaultResolve).catch(() => false)
}
export const resolve = (specifier, context, defaultResolve) => {
    const key = specifier + context.parentURL //conditions, importAssertions не могут различваться у одного parentURL и specifier
    if (resolve.cache[key]) return resolve.cache[key]
    const res = (async () => {
        let res
        if (specifier[0] === '/') {
            specifier = specifier.slice(1)
            res = await checkfromroot('./' + specifier, context, defaultResolve)
            if (res) return res
            if (specifier[0] === '-') {
                specifier = specifier.slice(1)
                
                res = await checkfromroot('./' + specifier, context, defaultResolve)
                if (res) return res

                res = await checkfromroot('@atee/' + specifier, context, defaultResolve)
                if (res) return res
            }
        }
        
        //Node loader запускает с ведущим слэшом
        //Но это решение НЕ захватывает важные имена, например catalog contacts так как применятся только для файлов с расширением (точкой)
        //console.log('resolve', specifier)
        return defaultResolve(specifier, context, defaultResolve) //Проверка относительного адреса
    })()
    resolve.cache[key] = res
    return res
}
resolve.cache = {}