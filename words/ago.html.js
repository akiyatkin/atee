import words from "/-words/words.js"

const rtf = new Intl.RelativeTimeFormat("ru", { 
	localeMatcher: "best fit",
	style: "long",
	numeric: "always" 
})




const ago = {}
export default ago


const formatAgo = (dif, type) => {
	return rtf.format(-Math.round(dif), type)
}
const formatShort = (dif, type) => {
	return rtf.format(-Math.round(dif), type).replace(' ago', '').replace(' назад', '')
}
const formatPass = (dif, a, b, c) => {
	dif = Math.round(dif)
	return dif + ' ' + words(dif, a, b, c)
}

ago.show = (mtime) => ago.ago(mtime, formatAgo)
ago.short = (mtime) => ago.ago(mtime, formatShort)

ago.ago = (mtime, format) => {
	mtime = mtime ? mtime * 1000 : 0
	if (!mtime) return ''
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


ago.pass = (dif) => {
	if (!dif) dif = 0
	dif = dif / 1000
	if (dif < 60) return formatPass(dif, 'секунду','секунды','секунд')
	
	dif = dif / 60 //минут
	if (dif < 60) return formatPass(dif, 'минуту', 'минуты', 'минут')

	dif = dif / 60 //часов
	if (dif < 24) return formatPass(dif, 'час','часа','часов')

	dif = dif / 24 //дней
	if (dif < 10) return formatPass(dif, 'день','дня','дней')

	dif = dif / 7 //недель
	if (dif < 5) return formatPass(dif, 'неделю', 'недели','недель')

	dif = dif / 4.345 //месяцев
	if (dif < 12) return formatPassed(dif, 'месяц', 'месяца','месяцев')

	dif = dif / 12 //лет
	return formatPass(dif, 'год','года','лет')
}