import date from "/-words/date.html.js"
import err from "/-controller/err.html.js"
import addget from "/-words/addget.js"

const escapeText = text => text.replace(/[<>]/g, tag => ({'<': '&lt;','>': '&gt;'})[tag] || tag)
export const REV = (data, env) => err(data, env) || `
	<p><a href="notes/${data.note.note_id}/history">История</a></p>
	<table>
		<tr><td>Редактор</td><td>${data.note.editor_email}</td></tr>
		<tr><td>Версия</td><td>${data.note.rev}</td></tr>
		<tr><td>Версия</td><td title="${date.dmyhi(data.note.date_edit)}">${date.ai(data.note.date_edit)}</td></tr>
		
	</table>
	<h1>${data.note.title}</h1>
	<div style="background-color: rgba(0,0,0,0.005); padding:1ch; border:solid 1px rgba(0,0,0,0.1); margin: 1ch 0; line-height: 1.2; font-family: monospace; white-space: pre-wrap; word-break: break-word;">${escapeText(data.note.text || 'Пустая заметка')}</div>
`
export const ROOT = (data, env) => err(data, env) || `
	<h1>История</h1>
	<p><a href="notes/${data.note.note_id}">${data.note.title || 'Пустая заметка'}</a></p>
	<div style="padding-bottom: 3ch;">
		<style>
			${env.scope} table td {
				white-space: nowrap;
			}
		</style>
		<table>
			<thead>
				<tr>
					<td>Версия</td>
					<td>Редактор</td>
					<td>Дата</td>
				</tr>
			</thead>
			<tbody>
				${data.note.history.map(editor => showRev(data, env, editor)).join('')}
			</tbody>
		</table>
	</div>
`
const showRev = (data, env, editor) => `
<tr>
	<td><a href="notes/${data.note.note_id}/history/${editor.rev}">${editor.rev}</a></td>
	<td>${editor.editor_email || ''}</td>
	<td>${date.ai(editor.date_edit)}</td>
	
</tr>
`