import field from "/-dialog/field.html.js"
import date from "/-words/date.html.js"
import svg from "/-sources/svg.html.js"
import ago from "/-words/ago.html.js"
import words from "/-words/words.html.js"
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
	<div style="float:right;position: relative;">
		${field.prompt({
			cls: 'a mute',
			type: 'area',
			name: 'comment', 
			label: 'Общий план',
			value: svg.edit(), 
			action: '/-sources/set-comment', 
			reloaddiv: env.layer.div,
			input: data.comment
		})}
	</div>
	<div style="white-space: pre; font-style: italic;">${data.comment}</div>
	<div style="margin: 1em 0; display: flex; flex-wrap: wrap; gap: 1em; justify-content: space-between;">
		${field.button({
			async: true,
			label: 'Актуализировать все', 
			action: '/-sources/set-sources-renovate',
			reloaddiv: env.layer.div,
		})}
		${field.button({
			label: 'Проверить все', 
			action: '/-sources/set-sources-check',
			reloaddiv: env.layer.div,
		})}
	</div>
	
	<!-- <div class="revscroll"> -->
		<table draggable="false">
			<thead>
				<tr>
					<td>Источник</td>
					<td>Статус</td>
					
					<td>Комментарий</td>

					
					
					
					<td>Проверка</td>
					
					<td>Загрузка</td>
					<td>Ревизия</td>
					
				</tr>
			</thead>
			<tbody draggable="false">
				${data.list.map(source => showSourceTr(data, env, source)).join('')}
			</tbody>
		</table>
		${data.list.some(source => source.date_start) ? showScriptReload(data, env) : showScriptDrag(data, env)}
		<script>
			(async div => {
				const table = div.getElementsByTagName('table')[0]
				const name = 'sources_main'
				table.scrollLeft = window.sessionStorage.getItem(name) || 0
				table.addEventListener('scroll', e => {
					window.sessionStorage.setItem(name, table.scrollLeft)
				}, {passive: true})

			})(document.currentScript.parentElement)
		</script>
	<!-- </div> -->
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
	<div style="max-width: 600px;">
		<p>Чтобы позиция попала в итоговую выгрузку, должне быть хотя бы один истончик мастер c этой позицией.</p>
		<p>Повтор свойства у одной позиции в колонке, листе или в разных истончиках перезаписывает предыдущее значение. 
		Источники применяются сверху вниз. Чем ниже, тем приоритетнее.</p>
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
			<div class="mute">${source.master ? 'Мастер' : 'Прайс'}</div>
		</td>
		<td>
			${source.status} 
			<!-- <b>${ago.short(source.date_start)}</b> -->
			<div class="mute">
				<span title="Проверка или загрузка ${date.dmyhi(source.need ? source.date_load : source.date_check)}">${date.dm(source.need ? source.date_load : source.date_check)}</span>
			</div>
			<div>
				<div title="Нескрытые колонки без свойств">${source.news ? showNews(source) : ''}</div>
				<div title="Столбцов с обрезанными значениями">${source.prunings ? showPrunings(source) : ''}</div>
			</div>
		</td>
		
		<td>
			<div style="float:right; position: relative">
				${field.prompt({
					cls: 'a mute',
					type: 'area',
					name: 'comment', 
					label: 'Комментарий источника',
					value: svg.edit(), 
					action: '/-sources/set-source-comment', 
					args: {source_id: source.source_id},
					reloaddiv: env.layer.div,
					input: source.comment
				})}
			</div>
			<div style="white-space: pre; font-style: italic;">${source.comment}</div>
			<div style="float:right; position: relative">
				${field.prompt({
					cls: 'a mute',
					type: 'area',
					name: 'comment', 
					label: 'Параметры источника json',
					value: svg.edit(), 
					action: '/-sources/set-source-params', 
					args: {source_id: source.source_id},
					reloaddiv: env.layer.div,
					input: source.params
				})}
			</div>
			<div style="font-size:12px; font-family: monospace; white-space: pre;">${source.params || ''}</div>
		</td>

		


		<td>
			<div title="Дата проверки ${date.dmyhi(source.date_check)}">
				${date.dm(source.date_check)}, <span class="mute" title="Длительность проверки">${ago.pass(source.duration_check)}</span>
			</div>
			<div class="mute">
				<span title="Дата последних изменений ${date.dmyhi(source.date_mtime)}">${date.dm(source.date_mtime)}</span>
			</div>
			<div>
				${field.button({
					cls: 'a',
					label: 'Проверить', 
					action: '/-sources/set-source-check',
					args: {source_id: source.source_id},
					global: 'check'
				})}
			</div>
		</td>
		
		<td>
			
			<span title="Дата загрузки ${date.dmyhi(source.date_load)}">${date.dm(source.date_load)}</span>${source.date_load ? ', ' : ''}<span class="mute" title="Длительность загрузки">${ago.pass(source.duration_rest + source.duration_insert + source.duration_recalc)}</span>
			<div class="mute">
				<span title="Дата актуальности в загруженных данных ${date.dmyhi(source.date_content)}">${date.dm(source.date_content)}</span>${source.date_content ? ', ': ''}${source.rows} ${words(source.rows, 'строка', 'строки', 'строк')}
			</div>
			<div>
				${field.button({
					cls: 'a',
					label: 'Загрузить', 
					action: '/-sources/set-source-load',
					args: {source_id: source.source_id},
					global: 'check'
				})}
			</div>
		</td>
		
		
		<td>
			<a href="source/${source.source_id}">${date.dm(source.date_exam)}</a>
			
		</td>
		
	</tr>
`
// ${field.prompt({
// 				value: date.dm(source.date_exam), 
// 				cls: 'a',
// 				name: 'date',
// 				input: source.date_exam,
// 				ok: 'ОК', 
// 				label: 'Дата контроля', 
// 				descr: 'Отметка администратор, когда была выполнена проверка источника. <br>Проверен код обработчика, описаны типы колонок, синонимы, <br>дата актуальности данных в обработчике определяется корректно.',
// 				type: 'date', 
// 				action: '/-sources/set-source-exam', 
// 				args: {source_id: source.source_id}, 
// 				reloaddiv: env.layer.div
// 			})}
const showNews = (source) => `
	<a class="mute" style="color: red" href="sheet?source_id=${source.source_id}&keyfilter=unknown">${source.news} ${words(source.prunings, 'колонка', 'колонки', 'колонок')}</a>
`
const showPrunings = (source) => `
	<a class="mute" style="color: red" href="sheet?source_id=${source.source_id}&keyfilter=pruning&limit=10000">${source.prunings} ${words(source.prunings, 'упрощение', 'упрощения', 'упрощений')}</a>
	
`