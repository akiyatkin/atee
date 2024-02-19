import field from "/-dialog/field.html.js"
import note from "/-note/layout.html.js"
import date from "/-words/date.html.js"
import ago from "/-words/ago.html.js"
const tpl = {}
export default tpl

tpl.ALL = (data, env) => data.result ? `
	<h1>Все записи</h1>
	${data.list.map(text => tpl.showText(data, env, text)).join('<hr>')}

` : `<h1>Ошибка</h1><p>${data.msg}</p>`


tpl.showText = (data, env, text) => `
	<div>${text}</div>
`
tpl.title = (data, env) => `<h1>Теория</h1>`
tpl.ROOT = (data, env) => `
	${tpl.title(data,env)}
	<input autocomplete="on" name="theory" type="search" placeholder="Поиск..." style="opacity:0; transition: 0.3s; width:100%; font-size: 1.5rem; padding: 0.5rem 1rem; border-radius: 1rem; border-width:1px; border-color:rgba(0,0,0,0.2)">
	<script>
		(input => {

			const go = async () => {
				const Client = await window.getClient()
				const nicked = await import('/-nicked').then(r => r.default)
				const val = nicked(input.value)
				if (val) Client.go('/theory/search/' + val)
				else  Client.go('/theory')
			}
			input.addEventListener('input', go)
			input.addEventListener('focus', go)
			import('/-form/Autosave.js').then(r => r.default).then(Autosave => Autosave.init(input.parentNode)).then(r => {
				input.style.opacity = 1
				input.focus()
			})
		})(document.currentScript.previousElementSibling)
	</script>
	<div id="BUTTON"></div>
	<div id="LIST" style="margin-top:2rem; margin-bottom: 2rem; display: grid; gap: 0.5rem"></div>
`
tpl.BUTTON = (data, env) => data.user?.manager ? `
	<div style="position: relative;">
		<p style="position: absolute; right:0; z-index: 1">
			<a href="/theory/all">Открыть всё</a>
			${field.button({label:"Cоздать", action:"/-note/theory/set-note-create", go:"/note/", goid:"note_id"})}
		</p>
	</div>
` : ''




tpl.LIST = (data, env) => data.result ? `
	
	${data.list.length ? tpl.showList(data, env) : tpl.showNotFound(data, env)}

` : `<h2>Что-то пошло не так</h2><p>${data.msg || 'Ошибка на сервере'}</p>`


tpl.showList = (data, env) => `
	<style>
		${env.scope} .item {
			opacity: 0.5;
			margin:0.5rem 0;
		}
		${env.scope} .item.published {
			opacity: 1;
		}
		${env.scope} .item.selected {
			background-color: lightblue;
		}
	</style>
	<div>
		${data.list.map(note => tpl.showNote(data, env, note)).join('')}
	</div>
	<script>
		(async div => {
			const send = await import('/-dialog/send.js').then(r => r.default)
			const ans = await send('/-user/get-user')
			if (!ans.user?.manager) return
			const Drag = await import('/-note/theory/Drag.js').then(r => r.default)
			Drag.make(div, '/-note/theory/set-note-ordain')
		})(document.currentScript.previousElementSibling)
	</script>
`
tpl.showNotFound = (data, env) => `
	Ничего не нашлось :(
`

tpl.showNote = (data, env, note) => `
	<div data-id="${note.note_id}" class="item ${note.published ? 'published' : '' }">
		<a href="/theory/note/${note.note_id}-${note.nick}">${note.title || 'Пустая запись'}</a> <small style="opacity:0.5">${ago.show(note.date_edit)}</small>
	</div>
`



tpl.CONTROL = (data, env) => {
	if (data.user?.manager) {
		return `
			<p align="right">
				
				${
					field.button({
						label:"Удалить", 
						action:"/-note/theory/set-note-delete?note_id=" + data.note.note_id, 
						go:'/theory', 
						confirm:'Вы точно хотите удалить запись?'
					})
				}
				

				${
					field.switch({
						name:'published', 
						action:'/-note/theory/set-switch-published?note_id=' + data.note.note_id, 
						value: data.note.published, 
						values: {'': 'Не опубликовано','1':'Опубликовано'}
					})
				}



				<a target="about:blank" href="/note/${env.crumb.name.split('-').shift()}">Изменить</a>
			</p>
		` 
	} else {
		return ``
	}
}




tpl.printDates = (data, env) => {
	const date_create = date.dmy(data.note.date_create)
	const date_edit = date.dmy(data.note.date_edit)
	if (!date_edit) return date_create
	if (date_create == date_edit) return date_edit
	else return date_create + ' &mdash; ' + date_edit
}
tpl.PAGE = (data, env) => (data.result ? `
	<p align="right" style="float:right; margin-left:1rem">
		${tpl.printDates(data, env)}
	</p>
	
	${data.note.text || '<h1>Пустая запись</h1>'}
	
	
	<p align="right">
		${tpl.showLink(data.note.prev)} &#8644; ${tpl.showLink(data.note.next)}
	</p>
	<p align="right">
		<a href="/theory">К списку</a>
	</p>

	` : `
	<h1>Ошибка</h1><p>${data.msg}</p>
`) 

+ `
	<div style="margin-bottom:2rem" id="CONTROL"></div>
`
tpl.showLink = (note) => note ? `
	<a href="/theory/note/${note.note_id}-${note.nick}">${note.title || 'Пустая запись'}</a>
` : ''
tpl.EDIT = (data, env) => data.result ? `
	<div style="display: flex; flex-direction: column; margin-top:3rem">
		${note.show(data.note)}
		<script>
			(div => {
				const wrap = div.querySelector('.notewrapper')
				const user_id = ${note.user_id||0}
				wrap.addEventListener('note-signal', async e => {
					const signal = e.detail
					const Client = await window.getClient()
					if (signal.type == 'joined') {
					} else if (signal.type == 'reject') {
						if (signal.myuser) {
							Client.go('/theory')
						}
					} else if (signal.type == 'leave') {
					} else if (signal.type == 'rename') {
					}
				})
			})(document.currentScript.parentNode)
		</script>
		<p align="right">
			<a href="/theory/note/${data.note.note_id}-${data.note.nick}">Посмотреть</a>,
			<a href="/note/props/${data.note.note_id}">Свойства</a>
		</p>
	</div>
` : `<h1>Ошибка</h1><p>${data.msg}</p>`


