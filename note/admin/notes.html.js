import date from "/-words/date.html.js"
import err from "/-controller/err.html.js"
import addget from "/-words/addget.js"

const showEndorsement = (data, env, endorsement) => `
	<a href="notes${addget(env.bread.get, {endorsement}, ['endorsement', 'query'])}">${endorsement}</a>`
const showEndorsementb = (data, env, endorsement) => `
	<b>${endorsement}</b>`

export const ROOT = (data, env) => err(data, env) || `
	<h1>Ноты
		<span style="font-size:1rem; text-transform: none;">
			${data.endorsements.map(endorsement => {
				if (env.bread.get.endorsement == endorsement) return showEndorsementb(data, env, endorsement)
				return showEndorsement(data, env, endorsement)
			}).join(', ')}
		</span>
	</h1>
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

					Client.go('notes' + addget(Client.bread.get, {query: val}, ['endorsement', 'query']))
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
	<div id="LIST"></div>
	
`
export const LIST = (data, env) => `
	<div style="padding-bottom: 3ch;">
		<style>
			${env.scope} table td {
				white-space: nowrap;
			}
		</style>
		<table>
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
	 href="notes/${note.note_id}">${note.title || "Пустая заметка"}</a></td>
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