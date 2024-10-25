const date = {}
const intl = new Intl.DateTimeFormat("ru-RU")
date.dmy = (time) => {
	if (!time) return ''
	return intl.format(time * 1000)
}
const intl_dmyhi = new Intl.DateTimeFormat("ru-RU", {
	year: "numeric",
 	month: "2-digit",
	day: "2-digit",
	hour: '2-digit',
  	minute: '2-digit'
})
const intl_hi = new Intl.DateTimeFormat("ru-RU", {
	hour: '2-digit',
  	minute: '2-digit'
})
const intl_dm = new Intl.DateTimeFormat("ru-RU", {
 	month: "long",
	day: "numeric"
})
const intl_is = new Intl.DateTimeFormat("ru-RU", {
	hour: '2-digit',
  	minute: '2-digit',
  	second: '2-digit'
})
date.dmyhi = (time) => {
	if (!time) return ''
	return intl_dmyhi.format(time * 1000)
}
date.dm = (time) => {
	if (!time) return ''
	return intl_dm.format(time * 1000)
}
date.hi = (time) => {
	if (!time) return ''
	return intl_hi.format(time * 1000)
}

date.is = (time) => {
	if (!time) return ''
	return intl_is.format(time * 1000)
}
date.ai = (time) => {
	if (!time) return ''
	if (Date.now() / 1000 - 60 * 60 * 6 > time) return date.dm(time)
	if (Date.now() / 1000 - 60 * 10 > time) return date.hi(time)
	return date.is(time)
}
date.input = (time) => {
	const now = time ? new Date(time * 1000) : new Date()
	const day = ("0" + now.getDate()).slice(-2)
	const month = ("0" + (now.getMonth() + 1)).slice(-2)
	return now.getFullYear()+"-"+(month)+"-"+(day)
}
export default date