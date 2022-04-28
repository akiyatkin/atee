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

export const resolve = async (specifier, context, defaultResolve) => {
    //console.log(context.parentURL)    
    const checkfromroot = async path => {
        const { Access } = await import('@atee/controller/Access.js')
        if (isExt(path) && path.indexOf('./data/') === 0) {
            path = path + (~path.indexOf('?') ? '&' : '?') + 't=' + Access.getAccessTime()
        }
        return defaultResolve(path, {
            ...context,
            parentURL: pathToFileURL('./')
        }, defaultResolve).catch(() => false)
    }
    let res
    if (specifier[0] === '-') {
        specifier = specifier.slice(1)
        res = await checkfromroot('@atee/' + specifier)
        if (res) return res
        // res = checkfromroot(specifier) //проверяется ключевое выражение в specifier
        // if (res) return res
        res = await checkfromroot('./' + specifier)
        if (res) return res
    } else if (specifier[0] === '/') {
        specifier = specifier.slice(1)
        const res = await checkfromroot('./' + specifier)
        if (res) return res
    }
    //Node loader запускает с ведущим слэшом
    //Но это решение НЕ захватывает важные имена, например catalog contacts так как применятся только для файлов с расширением (точкой)
    //console.log('resolve', specifier)
    return defaultResolve(specifier, context, defaultResolve) //Проверка относительного адреса
}
