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
				//Client.global('recalc')
			})
		})(document.currentScript.previousElementSibling)
	</script>
`
const showMain = (data, env) => `
	<div style="float:right; position: relative; margin-bottom: 1em;">
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
	<div style="white-space: pre; font-style: italic; margin-right: 2em;">${data.comment}</div>



	<form style="display: flex; margin: 1em 0; gap: 1em; flex-wrap: wrap">
		<div class="float-label">
			<input id="freeinp" name="query" type="search" placeholder="Поиск" value="${env.bread.get.query ?? ''}">
			<label for="freeinp">Поиск</label>
		</div>
		<div style="display: flex; justify-content: space-between; flex-grow: 1; gap: 1em;">
			<div><button type="submit">Найти</button></div>
			<div style="clear: both; display: flex; flex-wrap: wrap; gap: 1em; justify-content: end">
				
				${field.button({
					async: true,
					label: 'Актуализировать все', 
					action: '/-sources/set-sources-renovate',
					reloaddiv: env.layer.div,
				})}

				<div>
					${field.button({
						label: 'Проверить все', 
						action: '/-sources/set-sources-check',
						reloaddiv: env.layer.div,
					})}
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
			</div>
		</div>
		<script>
			(form => {
				const btn = form.querySelector('button')
				const input = form.querySelector('input')
				input.focus()
				input.setSelectionRange(input.value.length, input.value.length)
				form.addEventListener('submit', async (e) => {
					e.preventDefault()
					const Client = await window.getClient()
					Client.go('?query=' + input.value, false)
					Client.reloaddiv("${env.layer.div}")
				})
			})(document.currentScript.parentElement)
		</script>
	</form>
	
	${data.msg ? data.msg : showTable(data, env)}
	
	
`
const showTable = (data, env) => `
	
	<!-- <div class="revscroll"> -->
		<table draggable="false">
			<thead>
				<tr>
					<td>Источник</td>
					<td>Статус</td>
					<td>Проверка</td>
					<td>Загрузка</td>
					<td>Комментарий</td>
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
	
	<div style="max-width: 600px;">
		<p>Чтобы позиция попала в итоговую выгрузку, должен быть хотя бы один источник мастер c этой позицией.</p>
		<p>Каждый повтор свойства позиции перезаписывает предыдущее значение. Источники применяются сверху вниз. Чем ниже, тем приоритетнее, чем дальше лист или чем дальше колнка, тем приоритетней значение.</p>
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
	<tr data-id="${source.source_id}" style="white-space: nowrap;" class="item status_${source.class} ${source.represent_source ? '': 'mute'}">
		<td>
			<a title="Содержание ${source.master ? 'мастера' : 'прайса'}" href="sheet?source_id=${source.source_id}">${source.source_title}</a>
			
			<div>
				<a title="Ревизия ${source.master ? 'мастера' : 'прайса'}" href="source/${source.source_id}">${date.dm(source.date_exam)}</a>
			</div>
			<div>
				
				<button style="stroke-width: 1;" title="Изменить видимость источника. Скрытые источники не актуализируются." 
				data-name="represent_source" class="eye transparent ${source.cls.main} ${source.cls.custom}">${svg.eye()}</button>
				<script>

					(async div => {
						const btn = div.querySelector('button')
						btn.addEventListener('click', async () => {
							const represent = await import('/-sources/represent.js').then(r => r.default)
							const data = await represent.set(btn, btn.dataset.name, {source_id: ${source?.source_id}})
							if (!data.result) return
							const Client = await window.getClient()
							Client.reloaddiv('${env.layer.div}')
						})
						
					})(document.currentScript.parentElement)
				</script>
				${source.master ? 'Мастер' : 'Слуга'}
			</div>
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
			${source.date_load ? showLoadStat(data, env, source) : 'не&nbsp;загружался'}
			
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
			<div style="float:right; position: relative; clear:both;">
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
			<div style="margin-right: 2em; white-space: pre; font-style: italic;">${source.comment}</div>
			<div style="float:right; position: relative; clear:both;">
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
			<div style="margin-right: 2em; font-size:12px; font-family: monospace; white-space: pre;">${source.params || ''}</div>
		</td>
	</tr>
`
const showLoadStat = (data, env, source) => `
	<span title="Дата загрузки ${date.dmyhi(source.date_load)}">${date.dm(source.date_load)}</span>${source.date_load ? ', ' : 'не&nbsp;загружался, '}<span class="mute" title="Длительность загрузки">${ago.pass(source.duration_rest + source.duration_insert + source.duration_recalc)}</span>
	<div class="mute">
		<span title="Дата актуальности в загруженных данных ${date.dmyhi(source.date_content)}">${date.dm(source.date_content)}</span>${source.date_content ? ', ': ''}${source.rows} ${words(source.rows, 'строка', 'строки', 'строк')}
	</div>
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
	<a class="mute" style="color: red" href="sheet?source_id=${source.source_id}&keyfilter=unknown">${source.news} ${words(source.news, 'колонка', 'колонки', 'колонок')}</a>
`
const showPrunings = (source) => `
	<a class="mute" style="color: red" href="sheet?source_id=${source.source_id}&keyfilter=pruning&limit=10000">${source.prunings} ${words(source.prunings, 'упрощение', 'упрощения', 'упрощений')}</a>
	
`