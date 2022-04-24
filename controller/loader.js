
const MAP = {
    '/-controller/server.js': '@atee/controller/server.js',
    'controller/server.js': '@atee/controller/server.js',
    '-index.html.js': 'index.html.js',
}

export function resolve(specifier, context, defaultResolve){
    const end = specifier => {
        if (defaultResolve) return defaultResolve(specifier, context, defaultResolve)
        else return specifier
    }
    //if (specifier.indexOf('/') === 0) specifier = specifier.slice(1) //Node loader запускает с ведущим слэшом
    //Можно резолвить как абсолютный так и относительный путь
    if (specifier in MAP) return end(MAP[specifier])
    return end(specifier)

}
export function webresolve(specifier, context, defaultResolve){
    const { url } = resolve(specifier, context, defaultResolve)
    const end = specifier => {
        if (context) return defaultResolve(specifier, context, defaultResolve)
        else return specifier
    }
    //if (specifier.indexOf('/') === 0) specifier = specifier.slice(1) //Node loader запускает с ведущим слэшом
    //Можно резолвить как абсолютный так и относительный путь
    if (specifier in MAP) return end(MAP[specifier])
    return end(specifier)

}
//https://nodejs.org/api/esm.html#hooks
//https://github.com/KaMeHb-UA/loader.mjs/blob/master/loader.mjs
