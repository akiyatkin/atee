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

export async function resolve(specifier, context, defaultResolve){
    //console.log(context.parentURL)
    const checkfromroot = path => {
        return defaultResolve(path, {
            ...context,
            parentURL: pathToFileURL('./')
        }, defaultResolve).catch(() => false)
    }
    let res
    if (specifier[0] === '-') {
        specifier = specifier.slice(1)
        res = checkfromroot('@atee/' + specifier)
        if (res) return res
        // res = checkfromroot(specifier) //проверяется ключевое выражение в specifier
        // if (res) return res
        res = checkfromroot('./' + specifier)
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
