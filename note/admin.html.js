import date from "/-words/date.html.js"
import err from "/-controller/err.html.js"
import addget from "/-words/addget.js"
import escapeText from '/-note/escapeText.js'
import field from "/-dialog/field.html.js"


export const css = ["/-notreset/compact.css", "/-notreset/revscroll.css"]

export const REV = (data, env) => err(data, env) || `
	<p><a href="history/${data.note.note_id}">История</a></p>
	<table>
		<tr><td>Редактор</td><td>${data.note.editor_email}</td></tr>
		<tr><td>Версия</td><td>${data.note.rev}</td></tr>
		<tr><td>Версия</td><td title="${date.dmyhi(data.note.date_edit)}">${date.ai(data.note.date_edit)}</td></tr>
		
	</table>
	<h1>${data.note.title}</h1>
	<div style="background-color: rgba(0,0,0,0.005); padding:1ch; border:solid 1px rgba(0,0,0,0.1); margin: 1ch 0; line-height: 1.2; font-family: monospace; white-space: pre-wrap; word-break: break-word;">${escapeText(data.note.text || 'Пустая заметка')}</div>
`
export const HISTORY = (data, env) => err(data, env) || `
	<h1>История</h1>
	<p><a href="props/${data.note.note_id}">${data.note.title || 'Пустая заметка'}</a></p>
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
	<td><a href="history/${data.note.note_id}/${editor.rev}">${editor.rev}</a></td>
	<td>${editor.editor_email || ''}</td>
	<td>${date.ai(editor.date_edit)}</td>
	
</tr>
`
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




export const PROPS = (data, env) => err(data, env) || `
	
	<p><a href="notes">Список заметок</a></p>
	<h1>${data.note.title}</h1>
	<table class="compact">
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
		<a href="history/${data.note.note_id}">История</a>
		<a href="edit/${data.note.note_id}">Изменить</a>
	</p>
	<div class="revscroll">
		<table>
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
	</div>
	<div style="background-color: rgba(0,0,0,0.005); padding:1ch;  
	margin: 1em 0; line-height: 1.2; font-family: monospace; white-space: pre-wrap; word-break: break-word;">${escapeText(data.note.text || 'Пустая заметка')}</div>
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


// export const EMPTIES = (data, env) => err(data, env) || `
// 	<h1>Список непустых заметок</h1>
// 	<div style="padding-bottom: 3ch;">
// 		<table>
// 			<thead>
// 				<tr>
// 					<td>Заголовок</td>
// 					<td>ID</td>
// 					<td>Правок</td>
// 					<td>Дата</td>
// 					<td>Онлайн</td>
// 					<td>Владельцев</td>				
// 				</tr>
// 			</thead>
// 			<tbody>
// 				${data.notes.map(note => showNotes(data,env, note)).join('')}	
// 			</tbody>
// 		</table>
// 	</div>
// `
// const showNotes = (data, env, note) => `
// <tr>
// 	<td><a href="/admin/notes/${note.note_id}">${note.title || "Пустая заметка"}</a></td>
// 	<td>${note.note_id}</td>
// 	<td>${note.rev}</td>
// 	<td>${date.dmy(note.date_create)}</td>
// 	<td>${note.useronline}</td>
// 	<td>${note.usercount}</td>
// `















const argsinurl = ['endorsement','query','inside','change','create', 'id','sort']
const add = (get, set) => addget(get, set, argsinurl)
const addLink = (data, env, name, value, title = value) => env.bread.get[name] == value ?  addLinkB(data, env, name, value, title) : addLinkA(data, env, name, value, title)
const addLinkA = (data, env, name, value, title = value) => `<a href="notes${add(env.bread.get, {[name]: value})}">${title}</a>`
const addLinkB = (data, env, name, value, title = value) => `<b><a href="notes${add(env.bread.get, {[name]: null})}">${title}</a></b>`

export const NOTESROOT = (data, env) => err(data, env) || `
	<h1>Ноты</h1>
	<table class="compact">
		<tr>
			<td>Тип</td>
			<td>
				${data.endorsements.map(endorsement => addLink(data, env, 'endorsement', endorsement)).join(', ')}
			</td>
		</tr>
		<tr>
			<td>Содержание</td><td>${addLink(data, env, "inside", "notempty", "непустые")}</td>
		</tr>
		<tr>
			<td>Создание</td><td>${addLink(data, env, "create", "tod", "сегодня")}, ${addLink(data, env, "create", "yes", "вчера")}, ${addLink(data, env, "create", "28", "28 дней")}</td>
		</tr>
		<tr>
			<td>Изменение</td><td>${addLink(data, env, "change", "tod", "сегодня")}, ${addLink(data, env, "change", "yes", "вчера")}, ${addLink(data, env, "change", "28", "28 дней")}</td>
		</tr>
		<tr>
			<td>Пользователь</td><td>
				${field.search({
					cls:'a',
					search:'/-user/get-user-search',
					value: data.user?.email ? '<b>' + data.user?.email + '</b>' : 'выбрать', 
					label:'Пользователь', 
					type: 'text'
				})}
				<script>
					(block => {
						const field = block.querySelector('.field')
						field.addEventListener('field-clicked', async (e) => {
							const row = e.detail
							const Client = await window.getClient()
							const addget = await import('/-words/addget.js').then(r => r.default)
							Client.go('notes' + addget(Client.bread.get, {id: row.user_id}, ${JSON.stringify(argsinurl)}))
						})
					})(document.currentScript.parentElement)
				</script>
			</td> <!-- user = 1 - пользователь выбрать -->
		</tr>
		<tr>
			<td>Сортировать</td><td>${addLink(data, env, "sort", "create", "по дате создания")}</td>
		</tr>
	</table>
	<p>
		<input autocomplete="off" name="search" type="search" placeholder="Поиск..." 
			style="opacity:0; transition: 0.3s; width:100%; font-size: 1.5rem; padding: 0.5rem 1rem; border-radius: 1rem; border-width:1px; border-color:rgba(0,0,0,0.2)">
		<script>
			(input => {
				const go = async () => {
					const Client = await window.getClient()
					//const nicked = await import('/@atee/nicked').then(r => r.default)
					const addget = await import('/-words/addget.js').then(r => r.default)
					const val = encodeURIComponent(input.value)//nicked()

					Client.go('notes' + addget(Client.bread.get, {query: val}, ${JSON.stringify(argsinurl)}))
					//else Client.go('notes')
				}
				input.addEventListener('input', go)
				input.addEventListener('focus', go)
				import('/-form/Autosave.js').then(r => r.default).then(Autosave => Autosave.init(input.parentNode)).then(r => {
					input.style.opacity = 1
					input.focus()
				})
			})(document.currentScript.previousElementSibling)
		</script>
	</p>
	<div id="NOTESLIST"></div>
	
`
export const NOTESLIST = (data, env) => err(data, env) || `
	<div style="padding-bottom: 3ch;">
		<style>
			${env.scope} table td {
				white-space: nowrap;
			}
		</style>
		<div class="revscroll">
			<table class="">
				<thead>
					<tr>
						<td>Заголовок</td>
						<td>Изменения</td>
						<td>Правок</td>
						<td>Создана</td>
						<td>Онлайн</td>
						<td>Редакторов</td>
						<td>Наблюдателей</td>
						<td>Создатель</td>
						<td>Редактор</td>
					</tr>
				</thead>
				<tbody>
					${data.notes.map(note => showNote(data,env, note)).join('')}
				</tbody>
			</table>
		</div>
	</div>
`
const showNote = (data, env, note) => `
<tr>
	<td><a
		style="
		overflow: hidden;
		text-overflow: ellipsis;
		display: block;
		width:300px; 
	"
	 href="props/${note.note_id}">${note.title || "Пустая заметка"}</a></td>
	<td title="${date.dmyhi(note.date_edit)}">${date.short(note.date_edit)}</td>
	<td>${note.rev}</td>
	<td title="${date.dmyhi(note.date_create)}">${date.short(note.date_create)}</td>
	<td>${note.useronline}</td>
	<td>${note.editors}</td>
	<td>${note.viewers}</td>
	<td>${note.creater_email || ''}</td>
	<td>${note.editor_email || ''}</td>
</tr>
`