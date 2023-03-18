import nicked from '/-nicked'
class Hand {
    constructor (indexes, sheet, conf, row, prop) {
        this.indexes = indexes
        this.sheet = sheet
        this.conf = conf
        this.row = row
        this.prop = prop
    }
    def () {
        const value = this.row[this.prop.index]
        if (value == null) return ''
        return value
    }
    ifnot (from) {
        return this.floor(from)
    }
    min (...mins) {
        mins = mins.filter(m => !!m)
        return Math.min(...mins)
    }
    get (from) {
        const {row, indexes} = this
        let from_index
        if (!from) return this.def()
        const from_nick = nicked(from)
        from_index = indexes[from_nick]
        if (from_index == null) return ''
        const value = row[from_index]
        if (value == null) return ''
        return value
    }
    floor (from) {
        const value = this.get(from)
        if (!value) return ''
        return Math.floor(value)
    }
    skidka (from) {
        const {conf} = this
        const orig = this.get(from)
        const value = this.discount(from, conf.skidka)
        return value
    }
    discount (from, discount) {
        const value = this.get(from)
        if (!value) return this.def()
        if (!discount) return this.def()
        const k = (100 - discount) / 100
        return Math.floor(value * k)
    }
    usdlist (from) {
        const {sheet, conf} = this
        const value = this.get(from)
        if (!value) return this.floor()
        if (!conf.usdlist) return this.floor()
        if (!~conf.usdlist.indexOf(sheet)) return this.floor()
        if (!conf.usd) return this.floor()
        return Math.floor(value * conf.usd)
    }
}

export default Hand