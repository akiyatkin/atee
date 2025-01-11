import words from "/-words/words.js"

const date = {}
const rtf = new Intl.RelativeTimeFormat("ru", { 
	localeMatcher: "best fit",
	style: "long",
	numeric: "always" 
})
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
date.show = (mtime) => ago(mtime, formatAgo)
date.short = (mtime) => ago(mtime, formatShort)

date.sshow = (string) => sago(string, formatAgo)
date.sshort = (string) => sago(string, formatShort)

const totime = (string) => {
	if (!string) return ''
	const d = new Date(string)
	if (isNaN(d)) return ''
	const time = d.getTime()
	return time / 1000
}
const sago = (string, format) => {
	return ago(totime(string), format)
}
const ago = (mtime, format) => {
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


date.pass = (dif) => {
	if (!dif && dif != 0) return ''
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
	if (dif < 12) return formatPass(dif, 'месяц', 'месяца','месяцев')

	dif = dif / 12 //лет
	return formatPass(dif, 'год','года','лет')
}

const intl = new Intl.DateTimeFormat("ru-RU")
date.sdmy = (string) => {
	return date.dmy(totime(string))
}
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
date.sdmyhi = (string) => {
	if (!string) return ''
	const date = new Date(string)
	return intl_dmyhi.format(date)
}
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
date.sai = (string) => {
	if (!string) return ''
	const d = new Date(string)
	if (isNaN(d)) return ''
	const time = d.getTime()
	return date.ai(time / 1000)
}
date.ai = (time) => {
	if (!time) return ''
	const dtime = new Date(time * 1000)
	const today = new Date()
	if (today.getFullYear() != dtime.getFullYear()) return date.dmy(time)
	if (today.getDate() != dtime.getDate()) return date.dm(time)
	if (today.getHours() != dtime.getHours()) return date.hi(time)
	return date.is(time)
}
date.input = (time) => {
	const now = time ? new Date(time * 1000) : new Date()
	const day = ("0" + now.getDate()).slice(-2)
	const month = ("0" + (now.getMonth() + 1)).slice(-2)
	return now.getFullYear()+"-"+(month)+"-"+(day)
}
export default date