import Rest from '/-rest'
import nicked from '/-nicked'

const rest = new Rest()

rest.addArgument('visitor')
rest.addFunction('string', (view, n) => n != null ? String(n) : '')
rest.addFunction('checkbox', (view, n) => !!n)
rest.addFunction('isset', (view, v) => v !== null)
rest.addFunction('int', (view, n) => Number(n) || 0)

rest.addFunction('mint', ['int'], (view, num, pname) => {
	if (num > 8000000 || num < -8000000) return view.err('Передано слишком большое число ' + pname)
	return num
})
rest.addFunction('mint#required', ['int'], (view, num, pname) => {
	if (!n) return view.err('Требуется ' + pname, 422)
	return n
})


rest.addFunction('int#required', ['int'], (view, n, pname) => {
	if (!n) return view.err('Требуется ' + pname, 422)
	return n
})
rest.addFunction('array', (view, n) => n ? n.split(',') : [])
rest.addFunction('nicked', (view, v) => nicked(v))
rest.addFunction('escape', (view, text) => {
	return (text || '').replaceAll(/[\n\r"'&<>]/g, tag => ({
		'"': '&quot;', //Чтобы вставлять в атрибут value="" и защита от sql инекции
		"'": '&apos;', //Чтобы вставлять в атрибут value="" и защита от sql инекции
		"\n": '&#10;', //Чтобы вставлять в атрибут value=""
		"\r": '&#13;', //Чтобы вставлять в атрибут value=""
		'&': '&amp;', //Чтобы вставлять в запрос?
		'<': '&lt;', //защита от интерпретации тегов и скриптов
		'>': '&gt;'//защита от интерпретации тегов и скриптов
	})[tag]).trim()
})



export default rest