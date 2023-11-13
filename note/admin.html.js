import date from "/-words/date.html.js"

const checkErr = (data, env) => data.result ? '': `
	<div class="container">
		<h1>Ошибка</h1>
		<p>
			${data.msg || 'Ошибка на сервере'}.
		</p>
		<p>
			<a href="/">Перейти на главную страницу</a>.
		</p>
	</div>
`
export const ROOT = (data, env) => checkErr(data) || `
	<h1>Статистика</h1>
	<table style="margin-bottom: 3ch;">
		<tr>
			<td><a href="/admin/notes">Всего заметок</a></td><td>${data.notes_count}</td>
		</tr>
		<tr>
			<td>Заметок онлайн</td><td>${data.notes_online_count}</td></tr>
		</tr>
		<tr>
			<td>Всего пользователей</td><td>${data.users_count}</td></tr>
		</tr>
		<tr>
			<td>Пользователей онлайн</td><td>${data.users_online_count}</td></tr>
		</tr>
	</table>

`

export const NOTES = (data, env) => checkErr(data) || `
	<h1>Список непустых заметок</h1>
	<div style="padding-bottom: 3ch;">
		<table>
			<thead>
				<tr>
					<td>Заголовок</td>
					<td>ID</td>
					<td>Правок</td>
					<td>Дата</td>
					<td>Онлайн</td>
					<td>Владельцев</td>				
				</tr>
			</thead>
			<tbody>
				${data.notes.map(note => showNotes(data,env, note)).join('')}	
			</tbody>
		</table>
	</div>
`
const showNotes = (data, env, note) => `
<tr>
	<td><a href="/admin/notes/${note.note_id}">${note.title || "Пустая заметка"}</a></td>
	<td>${note.note_id}</td>
	<td>${note.rev}</td>
	<td>${date.dmy(note.date_create)}</td>
	<td>${note.useronline}</td>
	<td>${note.usercount}</td>
`


export const NOTE = (data, env) => checkErr(data) || `
	<!-- <h2 style="margin-top: 1ch; margin-bottom: 1ch;">${data.note.title}</h2> -->
	<p><a href="/admin/notes">Список заметок</a></p>
	<table>
		<tr>
			<td>Название</td><td>${data.note.title}</td>
		</tr>
		<tr>
			<td>Версия</td><td>${data.note.rev || ''}</td>
		</tr>
		<tr>
			<td>Создано</td><td>${date.dmy(data.note.date_create || '')}</td>
		</tr>
		<tr>
			<td>Онлайн</td><td>${data.users.filter(users => users.open).length}</td>
		</tr>
	</table>


	<table style="margin-top:1rem; margin-bottom:2rem">
		<thead>
			<tr>
				<td>email</td>
				<td>user_id</td>
				<td>open</td>
				<td>focus</td>
				<td>date_change</td>
				<td>date_cursor</td>
				<td>date_close</td>
				<td>date_open</td>
				<td>date_load</td>
				<td>date_appointment</td>
				<td>date_focus</td>
				<td>date_blur</td>
			</tr>
		</thead>
		<tbody>
			${data.users.map(user => showUsers(data,env, user)).join('')}
		</tbody>
	</table>
	<div style="background-color: rgba(0,0,0,0.005); padding:1ch; border:solid 1px rgba(0,0,0,0.1); margin: 1ch 0; line-height: 1.2; font-family: monospace; white-space: pre-wrap; word-break: break-word;">${escapeText(data.note.text || 'Пустая заметка')}</div>
`

const showUsers = (data, env, users) => `
	<tr>
		<td>${users.email || ''}</td>
		<td>${users.user_id}</td>
		<td>${users.open}</td>
		<td>${users.focus}</td>
		<td>${date.dmyhi(users.date_change)}</td>
		<td>${date.dmyhi(users.date_cursor)}</td>
		<td>${date.dmyhi(users.date_close)}</td>
		<td>${date.dmyhi(users.date_open)}</td>
		<td>${date.dmyhi(users.date_load)}</td>
		<td>${date.dmyhi(users.date_appointment)}</td>
		<td>${date.dmyhi(users.date_focus)}</td>
		<td>${date.dmyhi(users.date_blur)}</td>
`
const escapeText = text => text.replace(/[<>]/g, tag => ({'<': '&lt;','>': '&gt;'})[tag] || tag)

