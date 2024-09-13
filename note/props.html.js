import date from "/-words/date.html.js"
import escapeText from '/-note/escapeText.js'
import field from "/-dialog/field.html.js"


const props = {}

props.showMiddlePart = (data, env) => ''
props.showTable = (data, env) => `
	<table style="margin-top:1rem; margin-bottom:2rem">
		<thead>
			<tr>
				<!-- <td>Email</td> -->
				<td>Редактор</td>
				<td>Онлайн</td>
				<td>Изменения</td>
				<td>Изменений</td>
				<td>Открытий</td>
			</tr>
		</thead>
		${data.note.users.map(user => props.showUserEmail(data, env, user)).join('')}
	</table>
`
props.ROOT = (data, env) => data.result ? `
	<h1>${data.note.title || 'Пустая запись'}</h1>
	
	<div>Пользователей онлайн ${data.note.useronline}</div>
	<div>Пользователей ${data.note.usercount}</div>
	<div>Гостей ${data.note.userguests}</div>
	<div>Авторизованных ${data.note.useremails}</div>
	<div>Версия ${data.note.rev}</div>
	<div>Дата создания ${date.dmy(data.note.date_create)} <b>${data.note.create_email || 'Гость'}</b></div>
	<div>Последние изменения ${date.dmy(data.note.date_edit)} ${data.note.editor_email || 'Гость'}</div>

	${props.showTable(data, env)}
	${props.showMiddlePart(data, env)}

	<h2>История</h2>
	<table style="margin-top:1rem; margin-bottom:2rem">
		<thead>
			<tr>
				<!-- <td>Email</td> -->
				<td>Дата</td>
				<td>Редактор</td>
				<td>Версия</td>
			</tr>
		</thead>
		${data.note.history.map(row => showHistory(data, env, row)).join('')}
	</table>
` : `<h1>Ошибка</h1><p>${data.msg}</p>`
const showHistory = (data, env, row) => `
	<tr style="background-color: hsla(${row.hue}, 50%, 50%, 20%)">
		<td><a href="${env.crumb}/${row.rev}">${date.dmy(row.date_edit)}</a></td>
		<td>${row.editor_email}</td>
		<td>${row.rev}</td>
	</tr>
`
props.showUserEmail = (data, env, user) => `
	
	<tr style="background-color: hsla(${user.hue}, 50%, 50%, 20%)">
		<!-- <td>${user.email || 'Гость'}</td> -->
		<td>${user.email || 'Гость'}</td>
		<td>${user.open ? 'online' : date.dmyhi(user.date_close)}</td>
		<td>${date.dmyhi(user.date_change)}</td>
		<td>${user.count_changes}</td>
		<td>${user.count_opens}</td>
	</tr>
`

props.REV = (data, env) => data.result ? `

	<h1>${data.note.title}</h1>
	<p>Версия ${data.note.rev} от ${date.dmy(data.note.date_edit)}</p>
	<pre wrap>${escapeText(data.note.text)}</pre>
	
` : `<h1>Ошибка</h1><p>${data.msg}</p>`


export default props