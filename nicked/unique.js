export const unique = ar => {
    const a = []
    for (let i = 0, l = ar.length; i < l; i++) {
        if (a.indexOf(ar[i]) === -1) a.push(ar[i])
    }
    return a
}