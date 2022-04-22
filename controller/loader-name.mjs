export function resolve(specifier, context, defaultResolve){
    return defaultResolve(specifier, context, defaultResolve);
}
//https://nodejs.org/api/esm.html#hooks
