import nicked from '/-nicked'

const nicks = { }
const tonick = (from) => {
	if (!nicks[from]) nicks[from] = nicked(from)
	return nicks[from]
}
class Hand {
	constructor (indexes, sheet, conf, row, prop) {
		this.indexes = indexes
		this.sheet = sheet
		this.conf = conf
		this.row = row
		this.prop = prop
	}
	// def () {
	// 	const value = this.row[this.prop.index]
	// 	if (value == null) return ''
	// 	return value
	// }

	min (...mins) {
		mins = mins.filter(m => !!m)
		if (!mins.length) return ''
		return Math.min(...mins)
	}
	getFrom (from) {
		const {row, indexes, prop} = this
		if (!from) from = prop.prop_title
		const nick = tonick(from)
		const index = indexes[nick]
		if (!index) return ''
		let value = row[index] ?? ''
		value = parseFloat(value)
		return value
	}
	get (from) {
		if (from) return this.getFrom(from)
		const {row, indexes} = this
		let value = this.getFrom(from)
		value = this._checkUSD(value)
		if (!value) return '' //0 за значение не считаем
		return Math.floor(value)
	}
	getSkidka (from) {
		const {row, indexes, conf, prop} = this
		let value
		if (from) {
			value = this.getFrom(from)
		} else {
			value = this.getFrom(prop.prop_title)
			value = this._checkUSD(value)
		}
		if (!value) return ''
		const discount = conf.skidka
		if (discount) {
			const k = (100 - discount) / 100
			value = value * k
		}
		return Math.floor(value)
	}
	_checkUSD (value) {
		const {sheet, conf} = this
		if (!value) return value
		if (!conf.usdlist) return value
		if (!~conf.usdlist.indexOf(sheet)) return value
		if (!conf.usd) return value
		return value * conf.usd
	}
	// floor (from) {
	// 	const value = this.get(from)
	// 	if (!value) return ''
	// 	return Math.floor(value)
	// }
	// ifnot (from) {
	// 	const value = this.def()
	// 	if (value) return value
	// 	return this.floor(from)
	// }
	// skidkaSelfUsdOrFrom (from) {
	// 	const {conf} = this
	// 	let value = this.usdlist()
	// 	if (!value) value = this.get(from)
	// 	const discount = conf.skidka
	// 	if (!discount) return value
	// 	const k = (100 - discount) / 100
	// 	return Math.floor(value * k)
	// }
	// skidka (from) {
	// 	const {conf} = this
	// 	const orig = this.get(from)
	// 	const value = this.discount(from, conf.skidka)
	// 	return value
	// }
	// discount (from, discount) {
	// 	const value = this.get(from)
	// 	if (!value) return this.def()
	// 	if (!discount) return this.def()
	// 	const k = (100 - discount) / 100
	// 	return Math.floor(value * k)
	// }
	
}

export default Hand