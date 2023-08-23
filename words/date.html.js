const date = {}
const intl = new Intl.DateTimeFormat("ru-RU")
date.dmy = (time) => {
	if (!time) return ''
	return intl.format(time * 1000)
}
const intlhi = new Intl.DateTimeFormat("ru-RU", {
	year: "numeric",
  month: "2-digit",
  day: "2-digit",
	hour: '2-digit',
  	minute: '2-digit'
})
date.dmyhi = (time) => {
	if (!time) return ''
	return intlhi.format(time * 1000)
}
export default date