const date = {}
const intl = new Intl.DateTimeFormat("ru-RU")
date.dmy = (time) => {
	if (!time) return ''
	return intl.format(time * 1000)
}
export default date