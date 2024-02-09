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

const intldm = new Intl.DateTimeFormat("ru-RU", {
 	month: "long",
	day: "numeric"
})

date.dm = (time) => {
	if (!time) return ''
	return intldm.format(time * 1000)
}

date.input = (time) => {
	const now = time ? new Date(time * 1000) : new Date()
	const day = ("0" + now.getDate()).slice(-2)
	const month = ("0" + (now.getMonth() + 1)).slice(-2)
	return now.getFullYear()+"-"+(month)+"-"+(day)
}
export default date