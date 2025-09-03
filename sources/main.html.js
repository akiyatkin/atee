import field from "/-dialog/field.html.js"
import date from "/-words/date.html.js"
import ago from "/-words/ago.html.js"
import err from "/-controller/err.html.js"
export const css = ['/-sources/represent.css','/-sources/revscroll.css']
export const ROOT = (data, env) => `
	<h1>Источники</h1>
	${data.admin && data.isdb ? showMain(data, env) : showAuth(data, env)}
	
	
`
const showAuth = (data, env) => `
	<div style="display: grid; gap: 0.25em">
		<div>Администратор сайта: ${data.admin?'Да':'Нет'}</div>
		<div>База данных: ${data.isdb?'Да':'Нет'}</div>
	</div>

	<div id="TABLE"></div>
`
export const TABLE = (data, env) => !data.result ? '' : `
	
	<table draggable="false" class="list">
		<thead>
			<tr>
				<td>Источник</td>
				<td>Тип</td>
				<td>Статус</td>
				<td>Проверен</td>
				<td>Актуальность</td>
				<td>Загружен</td>
				<td>Ревизия</td>
			</tr>
		</thead>
		<tbody draggable="false">
			${data.list.map(source => showSourceTr(data, env, source)).join('')}
		</tbody>
	</table>
	${data.list.some(source => source.date_start) ? showScriptReload(data, env) : showScriptDrag(data, env)}
	
	
	
`
const showScriptDrag = (data, env) => `
	<script>
		(async table => {
			const list = table.tBodies[0]
			const Drag = await import('/-note/theory/Drag.js').then(r => r.default)
			Drag.make(list, async ({id, next_id}) => {
				const senditmsg = await import('/-dialog/senditmsg.js').then(r => r.default)
				const ans = await senditmsg(list, '/-sources/set-source-ordain', {id, next_id})
				const Client = await window.getClient()
				Client.global('recalc')
			})
		})(document.currentScript.previousElementSibling)
	</script>
`
const showMain = (data, env) => `
	<p>Повтор свойства перезаписывает предыдущее значение. Источники применяются сверху вниз. Чем ниже, тем приоритетней.</p>
	<div style="margin: 1em 0; display: flex; flex-wrap: wrap; gap: 1em; justify-content: space-between;">
		${field.button({
			async: true,
			label: 'Актуализировать все', 
			action: '/-sources/set-sources-renovate',
			reloaddiv: 'TABLE'
		})}
		${field.button({
			label: 'Проверить все', 
			action: '/-sources/set-sources-check',
			reloaddiv: 'TABLE'
		})}
	</div>
	<div id="TABLE"></div>
	<div style="margin:2em 0; display: flex; flex-wrap:wrap; gap: 1em; justify-content: flex-end">
		${field.prompt({
			value: 'Добавить источник', 
			name: 'title',
			input: '',
			label: 'Имя файла', 
			descr: 'Укажите, соответсвующее источнику, имя файла в папке с обработками ' + data.dir + '. Расширение файла обязательно .js, можно не указывать.',
			type: 'text', 
			action: '/-sources/set-source-add', 
			go: 'source/',
			goid: 'source_id'
		})}
	</div>
	
`
const showScriptReload = (data, env) => `
	<style>
		#MAIN {
			opacity: 0.8;
		}
	</style>
	<script>
		setTimeout(async () => {
			const Client = await window.getClient()
			Client.reloaddiv('${env.layer.div}')
		}, 4000)
	</script>
`
const showSourceTr = (data, env, source) => `
	<tr data-id="${source.source_id}" style="white-space: nowrap;" class="item status_${source.class}">
		<td>
			<a href="sheet?source_id=${source.source_id}">${source.source_title}</a>
		</td>
		<td>
			${source.master ? 'Мастер' : 'Прайс'}
		</td>
		<td>
			${source.status} <b>${ago.short(source.date_start)}</b>
		</td>
		<td>
			${date.ai(source.date_check)}
		</td>
		<td>
			${date.ai(source.date_content)}
		</td>
		<td>
			${date.ai(source.date_load)}
		</td>
		
		
		<td>
			${date.ai(source.date_exam)}
		</td>
	</tr>
`