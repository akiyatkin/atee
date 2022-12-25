const ru = {
	'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd',
	'е': 'e', 'ё': 'e', 'ж': 'j', 'з': 'z', 'и': 'i', 'й': 'y',
	'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
	'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
	'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh',
	'щ': 'shch', 'ы': 'y', 'э': 'e', 'ю': 'yu', 'я': 'ya'
}
const translit = str => {
	const ar = []
	str = str.replace(/[ъь]+/g, '')
	for (var i = 0; i < str.length; ++i) {
		ar.push(ru[str[i]] || str[i])
	}
	return ar.join('')
}
export const nicked = str => {
	if (typeof(str) == 'number') str = String(str)
	if (!str) return ''
	str = str.replace(/[\+]/g, 'p')
	str = str.toLowerCase()
	str = translit(str)
	str = str.replace(/[\W_]/g, '-')
	str = str.replace(/^\-+/g, '')
 	str = str.replace(/\-+$/g, '')
 	str = str.replace(/\-+/g, '-')
	return str
}
export default nicked