export class Doc {
    exp = /(<\w+.*?id=['"])((\w+?)['"].*?>)([^>]*?)/si
    divs = {}
    insert (html, div = '', childs = false) {
        const ar = []
        if (childs) {
            const r = html.split(this.exp)
            for (let i = 0; i < r.length; i = i + 5) {
                const div = r[i + 3]
                const start = r[i]
                if (div) {
                    const empty = r[i + 4]
                    ar.push(start + r[i + 1] + r[i + 2])
                    ar.push({div, empty})
                } else {
                    if (start) ar.push(start)
                }
            }
        } else {
            ar.push(html)
        }

        this.divs[div] = ar
        if (div == '') console.log(ar)
    }
    get (div = '', empty = '') {
        if (!this.divs[div]?.length) return empty
        let html = ''
        this.divs[div].forEach((el) => {
            if (typeof(el) == 'string') html += el
            else html += this.get(el.div, el.empty)
        })
        return html
    }
}