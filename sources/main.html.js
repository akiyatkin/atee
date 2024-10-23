import field from "/-dialog/field.html.js"
import date from "/-words/date.html.js"
import ago from "/-words/ago.html.js"
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
	<div style="margin: 1em 0; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 1em">

		${field.button({
			label: 'Проверить все', 
			action: '/-sources/set-sources-check',
			reloaddiv: env.layer.div
		})}

		${field.prompt({
			value: 'Добавить источник', 
			name: 'title',
			input: '',
			label: 'Имя файла', 
			descr: 'Укажите, соответсвующее источнику, имя файла в папке с обработками ' + data.dir + '. Расширение файла обязательно .js, можно не указывать.',
			type: 'text', 
			action: '/-sources/set-main-add-source', 
			go: 'source?source_id=', 
			goid: 'source_id'
		})}
	</div>
	<table>
		<tr>
			<td>Имя</td>
			<td>Проверка</td>
			<td>Изменения</td>
			<td>Загружен</td>
			<td>Актуальность</td>
			<td>Контроль</td>
			<td>Данные</td>
			<td>Ошибка</td>
		</tr>
		${data.list.map(source => showSourceTr(data, env, source)).join('')}
	</table>
	
`
const showSourceTr = (data, env, source) => `
	<tr>
		<td>
			<a href="source/${source.source_id}">${source.source_title}</a>
		</td>
		<td>
			${ago.short(source.date_check)}
		</td>
		<td>
			${ago.short(source.date_mtime)}
		</td>
		<td>
			${ago.short(source.date_load)}
		</td>
		<td>
			${date.dmy(source.date_content)}
		</td>
		
		<td>
			${ago.short(source.date_exam)}
		</td>
		<td>
			${source.entities.join(', ')}
		</td>
		<td>
			${source.error}
		</td>
	</tr>
`