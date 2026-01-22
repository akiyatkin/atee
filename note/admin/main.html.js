import date from "/-words/date.html.js"
import err from "/-controller/err.html.js"

export const ROOT = (data, env) => err(data, env) || `
	<h1>Статистика</h1>
	<table style="margin-bottom: 3ch;">
		<tr>
			<td>Пользователей онлайн</td><td>${data.users_online_count}</td></tr>
		</tr>
		<tr>
			<td>Заметок онлайн</td><td>${data.notes_online_count}</td></tr>
		</tr>
		<tr>
			<td>Редакторов за 24 часа</td><td>${data.editors_24_count}</td></tr>
		</tr>
		<tr>
			<td>Редакторов за 24 часа, с первым визитом ранее</td><td>${data.editors_old24_count}</td></tr>
		</tr>
		<tr>
			<td>Редакторов за 24 часа, c первым визитом за 24 часа</td><td>${data.editors_24_count - data.editors_old24_count}</td></tr>
		</tr>
		<tr>
			<td>Непустых заметок с изменениями за 24 часа</td><td>${data.notes_24_count}</td></tr>
		</tr>
		
		<tr>
			<td>Непустых заметок с изменениями за 30 дней</td><td>${data.notes_month_count}</td>
		</tr>
		<tr>
			<td>Непустых заметок</td><td>${data.notes_count}</td>
		</tr>
		<tr>
			<td>Всего заметок</td><td>${data.notes_count}</td>
		</tr>
		<tr>
			<td>Всего пользователей</td><td>${data.users_count}</td></tr>
		</tr>
	</table>	
`




export const NOTE = (data, env) => err(data, env) || `
	<!-- <h2 style="margin-top: 1ch; margin-bottom: 1ch;">${data.note.title}</h2> -->
	<p><a href="notes">Список заметок</a></p>
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
		<tr>
			<td>Редакторов</td><td>${data.users.filter(users => users.accept == 'edit').length}</td>
		</tr>
		<tr>
			<td>Наблюдателей</td><td>${data.users.filter(users => users.accept == 'view').length}</td>
		</tr>
	</table>

	<p>
		<a href="notes/${data.note.note_id}/history">История</a>
	</p>
	<table style="margin-top:1rem; margin-bottom:2rem">
		<thead>
			<tr>
				<td>email</td>
				<td>user_id</td>
				<td>accept</td>
				<td>open</td>
				<td>focus</td>
				<td>change</td>
				<td>cursor</td>
				<td>close</td>
				<td>open</td>
				<td>load</td>
				<td>appointment</td>
				<td>focus</td>
				<td>blur</td>
				<td>changes</td>
				<td>opens</td>
			</tr>
		</thead>
		<tbody>
			${data.users.map(user => showUsers(data,env, user)).join('')}
		</tbody>
	</table>
	<div style="background-color: rgba(0,0,0,0.005); padding:1ch; border:solid 1px rgba(0,0,0,0.1); margin: 1ch 0; line-height: 1.2; font-family: monospace; white-space: pre-wrap; word-break: break-word;">${escapeText(data.note.text || 'Пустая заметка')}</div>
`

const showUsers = (data, env, user) => `
	<tr style="white-space: nowrap;">
		<td>${user.email || ''}</td>
		<td>${user.user_id}</td>
		<td>${user.accept}</td>
		<td>${user.open}</td>
		<td>${user.focus}</td>
		<td>${date.ai(user.date_change)}</td>
		<td>${date.ai(user.date_cursor)}</td>
		<td>${date.ai(user.date_close)}</td>
		<td>${date.ai(user.date_open)}</td>
		<td>${date.ai(user.date_load)}</td>
		<td>${date.ai(user.date_appointment)}</td>
		<td>${date.ai(user.date_focus)}</td>
		<td>${date.ai(user.date_blur)}</td>
		<td>${user.count_changes}</td>
		<td>${user.count_opens}</td>
`
const escapeText = text => text.replace(/[<>]/g, tag => ({'<': '&lt;','>': '&gt;'})[tag] || tag)

