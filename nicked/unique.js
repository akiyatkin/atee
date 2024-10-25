export const unique = ar => {
    const a = []
    for (let i = 0, l = ar.length; i < l; i++) {
        if (a.indexOf(ar[i]) === -1) a.push(ar[i])
    }
    return a
}
unique.bykey = (rows, key) => rows.filter((row, idx, arr) => idx === arr.findIndex((r) => r[key] === row[key]))
export default unique