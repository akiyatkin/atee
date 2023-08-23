const rtf = new Intl.RelativeTimeFormat("ru", { 
	localeMatcher: "best fit",
	style: "long",
	numeric: "always" 
})
const format = (dif, type) => {
	return rtf.format(-Math.round(dif), type)
}
const ago = {}
export default ago
ago.show = (mtime) => {
	mtime = mtime ? mtime * 1000 : 0
	let dif = Date.now() - mtime

	dif = dif / 1000
	if (dif < 60) return format(dif, 'second')
	
	dif = dif / 60 //минут
	if (dif < 60) return format(dif, 'minute')

	dif = dif / 60 //часов
	if (dif < 24) return format(dif, 'hour')

	dif = dif / 24 //дней
	if (dif < 10) return format(dif, 'day')

	dif = dif / 7 //недель
	if (dif < 6) return format(dif, 'week')

	dif = dif / 4.345 //месяцев
	if (dif < 12) return format(dif, 'month')

	dif = dif / 12 //лет
	return format(dif, 'years')
}