import field from "/-dialog/field.html.js"
export const ROOT = (data, env) => `
	<h1>Источники данных</h1>
	${data.admin && data.isdb ? showMain(data, env) : showAuth(data, env)}
	
	
`
const showAuth = (data, env) => `
	<div style="display: grid; gap: 0.25em">
		<div>Администратор сайта: ${data.admin?'Да':'Нет'}</div>
		<div>База данных: ${data.isdb?'Да':'Нет'}</div>
	</div>
`
const showMain = (data, env) => `
	${field.prompt({
		value: 'Добавить источник', 
		name: 'title',
		input: '',
		label: 'Имя файла', 
		descr: 'Укажите соответсвующее источнику имя файла в папке с обработками ' + data.dir + '. Расширение файла обязательно .js, можно не указывать.',
		type: 'text', 
		action: '/-sources/set-main-add-source', 
		go: '/source?source_id=', 
		goid: 'source_id'
	})}
	
	
	
`