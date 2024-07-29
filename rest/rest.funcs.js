import Rest from '/-rest'
import nicked from '/-nicked'

const rest = new Rest()

rest.addArgument('visitor')
rest.addFunction('string', (view, n) => n != null ? String(n) : '')
rest.addFunction('checkbox', (view, n) => !!n)
rest.addFunction('isset', (view, v) => v !== null)
rest.addFunction('0', (view, v) => v || 0)
rest.addFunction('null', (view, v) => v === '' ? null : v)


rest.addFunction('required', async (view, value, pname) => {
	if (value === null || value === '') return view.err('Требуется ' + pname.split('#')[0], 422)
	return value
})

rest.addFunction('unsigned', async (view, value, pname) => {
	if (value && value < 0) return view.err('Принимаются только положительные значения ' + pname.split('#')[0], 422)	
	return value
})



rest.addFunction('int', (view, n, pname) => {
	if (!n) return n //'0' - true, '' = null
	n = Number(n)
	if (isNaN(n)) return null //view.err('Некорректное число ' + pname)
	else return n
})
rest.addFunction('int#0', ['int','0'])

rest.addFunction('mint', ['int'], (view, num, pname) => {
	if (!num) return num
	if (num > 8000000 || num < -8000000) return view.err('Передано слишком большое число ' + pname)
	return num
})
rest.addFunction('mint#unsigned', ['mint','unsigned'])
rest.addFunction('mint#0', ['mint','0'])

rest.addFunction('sint', ['int'], (view, num, pname) => {
	if (!num) return num
	if (num > 32000 || num < -32000) return view.err('Передано слишком большое число ' + pname)
	return num
})
rest.addFunction('sint#0', ['sint','0'])

rest.addFunction('sint#required', ['sint','required'])
rest.addFunction('mint#required', ['mint','required'])
rest.addFunction('int#required', ['int', 'required'])



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