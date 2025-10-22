import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
import date from "/-words/date.html.js"
import svg from "/-sources/svg.html.js"
import addget from '/-sources/addget.js'
export const css = ['/-sources/represent.css','/-sources/revscroll.css']
const showSourceEntity = (data, env, source, entity = source) => `
	${entity.entity_plural || entity.entity_title} ${entity.prop_title ? (entity.prop_title == entity.entity_title ? '' : '(' + entity.prop_title + ')'): '(ключ не определён)'}
`
const showError = (data, env, source) => `
	<p style="background-color:${source.error ? '#f5e6e6' : '#eaf7d1'}">${source.error || 'Ошибок не было'}</p>
`
// const showScriptReload = (data, env, source) => `
// 	<style>
// 		#MAIN {
// 			opacity: 0.8;
// 		}
// 	</style>
// 	<script>
// 		setTimeout(async () => {
// 			const Client = await window.getClient()
// 			Client.reloaddiv(['SOURCE','SHEETS', 'DATES', 'TABLE'])
// 		}, 3000)
// 	</script>
// `
export const ROOT = (data, env, source = data.source) => err(data, env, ['DATES','SHEETS','TABLE','SOURCE']) || `
	<div style="float:right"><a href="../sources">Источники</a></div>
	<h1>${source.source_title}</h1>

	<style>
		${env.scope} tbody td.rep {
			cursor: pointer;
			max-width: 420px;
		    overflow: hidden;
		    text-overflow: ellipsis;
    
			/*text-decoration: underline dashed 0.5px;
			text-underline-offset: 0.3em;*/

			/*overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			max-width: 200px;*/
		}
		${env.scope} tbody td.key {
			overflow: visible;
			max-width: none;
			font-weight: bold;
		}
		/*${env.scope} tbody td.represent {
			cursor: default;
		}*/
		${env.scope} thead td {
			cursor: pointer;
		}
		${env.scope} thead td.empty {
			font-weight: normal;
			cursor: default;
		}
		${env.scope} table button {
			font-weight: inherit;
		}
	</style>
	<div style="display: flex; flex-wrap: wrap; gap: 1em">
		<div style="margin-bottom:1ch">
			<div id="SOURCE"></div>
		</div>
		<div style="flex-grow: 1">
			${showComment(data, env, source)}
			${showSearch(data, env)}
			
		</div>

	</div>
	<div id="DATES"></div>
	<div id="TABLE"></div>
`
// ${data.issearch ? showSearch(data, env) : showIndex(data, env)}
export const SOURCE = (data, env, source = data.source) => !data.result ? '' : `
	<div style="margin:0 0 1ch 0;">
		${field.button({
			label: 'Загрузить', 
			action: '/-sources/set-source-load',
			args: {source_id: source.source_id},
			global: ['check']
		})}
	</div>
	
	<div class="status_${source.class}">
		${
			source.date_start 
			? source.status + '... ' + date.short(source.date_start) 
			: '<b>' + (data.source.master ? 'Мастер' : 'Прайс') + '</b>' + (
				data.source.entity_id 
				? showSourceEntity(data, env, source) 
				: ''
			)
			 
		}
		${source.error ? showError(data, env, source) : ''}
	</div>
	${data.source.date_load ? showLoadTime(data, env) : 'Не&nbsp;загружался'}
	<div title="${date.dmyhi(data.source.date_exam)}">Ревизия <a href="source/${data.source.source_id}">${date.dmy(data.source.date_exam)}</a></div>
`
const showLoadTime = (data, env) => `
	<div title="${date.dmyhi(data.source.date_load)}">Загрузка <b>${date.ai(data.source.date_load)}</b> за ${date.pass(data.source.duration_rest + data.source.duration_insert + data.source.duration_check)}</div>
	<div title="${date.dmyhi(data.source.date_content)}">Актуальность <b>${date.ai(data.source.date_content) || 'не&nbsp;указана'}</b></div>
`
export const DATES = (data, env) => !data.result ? `` : `
	<div id="date" style="align-items: center; flex-grow: 1; display: flex; gap:0.5em 1em; flex-wrap: wrap; font-size: 12px">
		
		<div style="background: linear-gradient(-30deg, #00aaff55, #4466ff22); padding: 0.5em; flex-grow: 1; display: flex; gap:0.5em 1em; flex-wrap: wrap; font-size: 12px">
			${data.dates.map(dateup => showDate(data, env, dateup)).join('')} ${data.publicateneed ? showIndex(data, env) : ''}
		</div>
		<div style="background: linear-gradient(-30deg, #00aaff55, #4466ff22); padding: 0.5em; display: flex; gap:0.5em 1em; flex-wrap: wrap; font-size: 12px">
			<div><a class="${env.bread.get.keyfilter == 'yes' ? 'active' : ''}" data-keyfilter="yes" data-limit="" href="sheet${addget(env.bread.get, {keyfilter: 'yes', limit: ''})}#date">С&nbsp;ключом<sup>${data.quantity_of_keys}</sup></a></div>
			<div><a class="${env.bread.get.keyfilter == 'not' ? 'active' : ''}" data-keyfilter="not" data-limit="" href="sheet${addget(env.bread.get, {keyfilter: 'not', limit: ''})}#date">Без&nbsp;ключа&nbsp;<sup>${data.quantity_without_keys}</sup></a></div>
			<div><a class="${env.bread.get.keyfilter == 'all' ? 'active' : ''}" data-keyfilter="all" data-limit="10000" href="sheet${addget(env.bread.get, {keyfilter: 'all', limit: 10000})}#date">Всё&nbsp;<sup>${data.quantity_without_keys + data.quantity_of_keys}</sup></a></div>
			<div><a title="Свойств с упрощёнными/обрезанными данными" class="${env.bread.get.keyfilter == 'pruning' ? 'active' : ''}" data-keyfilter="pruning" data-limit="10000" href="sheet${addget(env.bread.get, {keyfilter: 'pruning', limit: 10000})}#date">Упрощений&nbsp;<sup>${data.quantity_with_pruning}</sup></a></div>
			<div><a title="Колонок без назначенных свойств и видимых" class="${env.bread.get.keyfilter == 'unknown' ? 'active' : ''}" data-keyfilter="unknown" data-limit="10000" href="sheet${addget(env.bread.get, {keyfilter: 'unknown', limit: 10000})}#date">Колонок&nbsp;<sup>${data.quantity_with_unknown}</sup></a></div>
			<div><a title="Строки с проигравшими/заменёнными ячейками" class="${env.bread.get.keyfilter == 'passive' ? 'active' : ''}" data-keyfilter="passive" data-limit="" href="sheet${addget(env.bread.get, {keyfilter: 'passive', limit: ''})}#date">Скрыто&nbsp;<sup>${data.quantity_with_passive}</sup></a></div>
			<div><a title="Строки с победившими/заменяющими ячейками" class="${env.bread.get.keyfilter == 'active' ? 'active' : ''}" data-keyfilter="active" data-limit="" href="sheet${addget(env.bread.get, {keyfilter: 'active', limit: ''})}#date">Показано&nbsp;<sup>${data.quantity_with_active}</sup></a></div>
		</div>
	</div>
	<script>
		(async div => {
			const addget = await import('/-sources/addget.js').then(r => r.default)
			const listen = (e) => {
				if (!div.closest('body')) return window.removeEventListener('crossing', listen)
				const {theme, bread} = e.detail
				const aa = div.getElementsByTagName('a')
				for (const a of aa) {
					const keyfilter = a.dataset.keyfilter
					if (!keyfilter) continue
					const limit = a.dataset.limit
					const params = {keyfilter, limit}
					const appear = a.dataset.appear
					if (appear) params.appear = appear
					a.href = 'sheet' + addget(new URLSearchParams(window.location.search), params)+'#date'
				}
				const origin = location.href
				//const origin = location.origin + bread.href
				let r = false
				for (const a of aa) {
					if (a.href != origin) continue
					r = a
				}

				if (r) for (const a of aa) {
					if (a === r) a.classList.add('active')
					else a.classList.remove('active')
				}
			}
			window.addEventListener('crossing', listen)
		})(document.currentScript.previousElementSibling)
	</script>
`
export const SHEETS = (data, env) => !data.result ? `` : `
	
`

const showSheet = (data, env, sheet, active = sheet.sheet_index == data.sheet.sheet_index) => {
	if (active) return `
		<div class="${sheet.represent_sheet ? '' : 'mute'}">
			${sheet.sheet_title}&nbsp;<sup>${sheet.count}</sup>
			${!sheet.entity || sheet.entity.entity_id != data.source.entity_id ? showEntity(data, env, sheet.entity) : ''}
		</div>
	`
	if (!active) return `
		<div class="${sheet.represent_sheet ? '' : 'mute'}">
			<a href="sheet${addget(env.bread.get, {sheet_index:sheet.sheet_index})}#data">${sheet.sheet_title}&nbsp;<sup>${sheet.count}</sup></a>
			${!sheet.entity || sheet.entity.entity_id != data.source.entity_id ? showEntity(data, env, sheet.entity) : ''}
		</div>
	`
	
}
const showEntity = (data, env, entity) => {
	if (entity) return `
		<div>${entity.entity_title}</div>
	`
	else return `
		<div class="mute">Ключевое свойство не выбрано</div>
	`
}


const showSearch = (data, env) => `
	<form style="margin: 1em 0; display: flex; gap: 1em; clear:both">
		
		<input name="search" type="search" style="flex-grow:1" value="${env.bread.get.search ?? ''}"><button type="submit">Найти</button>
		<script>
			(form => {
				const go = async () => {
					const addget = await import('/-sources/addget.js').then(r => r.default)
					const query = addget(new URLSearchParams(window.location.search), {search: form.search.value.trim()})
					const Client = await window.getClient()
					Client.go('sheet' + query)
				}
				form.addEventListener('submit', e => {
					e.preventDefault()
					go()
				})
			})(document.currentScript.parentElement)
		</script>
	</form>
`
const showDate = (data, env, dateup, active = dateup.active && (!env.bread.get.keyfilter || env.bread.get.keyfilter == 'appear')) => `
	<div title="Дата обновления ${date.dmyhi(dateup.date)}">
		<a class="${active ? 'active' : ''}" 
		 	data-keyfilter="appear"
		 	data-appear="${dateup.date}"
			href="sheet${addget(env.bread.get, {keyfilter:'appear', appear:dateup.date, limit: ''})}#date">
			${dateup.title || date.ai(dateup.date)}&nbsp;<sup>${dateup.count}</sup>
		</a>
	</div>
`
const showIndex = (data, env) => `
	<div>
		Требуется публикация 😛<sup>&nbsp;</sup>
	</div>
`
const showComment = (data, env, source) => `
	<div style="float:right; position: relative; clear:both">
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
	<div style="white-space: pre; font-style: italic; margin-right: 2em">${source.comment}</div>
	<div style="float:right; position: relative; clear:both; margin-bottom:0.5em">
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
	<div style="font-size:12px; font-family: monospace; white-space: pre; margin-right: 2em;">${source.params || ''}</div>
`

export const TABLE = (data, env, sheet = data.sheet, source = data.source) => !data.result ? '' : `
	<div style="margin: 1em 0; flex-grow: 1; display: flex; gap:0.5em 1em; flex-wrap: wrap">
		${data.sheets.map(sheet => showSheet(data, env, sheet)).join('')}
	</div>
	<div id="data" class="revscroll">
		<script>
			(async div => {
				const cols = ${JSON.stringify(data.cols.map(col => [col.col_title, col.prop_id, col.col_index]))}
				const keys = ${JSON.stringify(data.rows.map(row => [row.key_id, row.row_index]))}
				const sheet_title = ${JSON.stringify(sheet.sheet_title)}
				const source_id = ${source.source_id}
				const entity_id = ${data.sheet?.entity_id || null}
				const sheet_index = ${data.sheet?.sheet_index ?? null}
				const represent = await import('/-sources/represent.js').then(r => r.default)

				div.addEventListener('click', async e => {
					const td = e.target.closest('.rep')
					if (td) {						
						const btn = e.target.closest('.value')
						const multi_index = btn ? Array.from(td.children).indexOf(btn) : 0
						const tr = td.parentElement
						const tbody = tr.parentElement
						const text_index = Array.from(tbody.children).indexOf(tr)
						const [key_id, row_index] = keys[text_index]
						//const col_index = Array.from(tr.children).indexOf(td) //- 1
						const pos_index = Array.from(tr.children).indexOf(td) //- 1
						const [col_title, prop_id, col_index] = cols[pos_index]

						represent.popup({source_id, sheet_title, key_id, col_title, multi_index, col_index, row_index, sheet_index}, '${env.layer.div}')
					}
					const btn = e.target.closest('.row')
					if (btn) {
						if (!entity_id) {
							const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
							return Dialog.alert('Укажите к какой сущности относятся данные этого источника, чтобы управлять видимостью строк!')
							
						}
						const tr = btn.closest('tr')
						const tbody = tr.parentElement
						const text_index = Array.from(tbody.children).indexOf(tr)
						const [key_id] = keys[text_index]

						if (!key_id) {
							const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
							return Dialog.alert('В строке нет ключа')
						}
						
						const represent = await import('/-sources/represent.js').then(r => r.default)
						const data = await represent.set(btn, 'represent_row', {sheet_title, source_id, key_id})
						if (!data.result) return

						btn.classList.remove('represent-1', 'represent-0', 'represent-custom-1', 'represent-custom-0', 'represent-def-0', 'represent-def-1')
						btn.classList.add(data.cls.main, data.cls.custom)
						// if (cols.length * keys.length < 1000) {
						// 	const Client = await window.getClient()
						// 	Client.reloaddiv('${env.layer.div}')
						// }
					}
					const prop = e.target.closest('.prop')
					if (prop) {
						const td = e.target.closest('td')
						const tr = td.parentElement
						const col_index = Array.from(tr.children).indexOf(td) //- 1
						const [col_title, prop_id] = cols[col_index]
						represent.popup({source_id, sheet_title, col_title}, '${env.layer.div}')
					}
				
				})

			})(document.currentScript.parentElement)
		</script>
		<style>
			${env.scope} table thead td {
				vertical-align: top;
			}
			
			${env.scope} table .prop_column:before {
				content:"✅";
			}
			${env.scope} table .prop_more:before {
				content:"🟡";
			}
			${env.scope} table .prop_system:before {
				content:"🛡️";
			}
			${env.scope} table .prop_unknown.prop_represent {
				background-color: #ffdc0024;
			}
			
			/*${env.scope} button {
				white-space: normal;
			}*/
		</style>
		<table style="table-layout: fixed;">
			<thead>
				<tr>
					
					${data.cols.map(col => showColTd(data, env, sheet, source, col)).join('')}
				</tr>
			</thead>
			<tbody>
				${data.texts.map((row, text_index) => showCellsTr(data, env, sheet, source, row, text_index)).join('')}
			</tbody>
		</table>
		
		<script>
			(async div => {
				const name = 'sources_sheet_${source.source_id}_${sheet.sheet_index}'
				div.scrollLeft = window.sessionStorage.getItem(name) || 0
				div.addEventListener('scroll', e => {
					window.sessionStorage.setItem(name, div.scrollLeft)
				}, {passive: true})

			})(document.currentScript.parentElement)
		</script>
	</div>
	<p align="right"> Лимит: ${data.limit}</p>
`
// <td>
// 						<!-- <button 
// 							title="Изменить видимость листа" 
// 							class="eye represent_sheet transparent ${data.sheet.cls.main} ${data.sheet.cls.custom}">
// 							${svg.eye()}
// 						</button> -->
// 					</td>
// <script>
// 			(div => {
// 				const name = 'represent_sheet'
// 				const sheet_title = ${JSON.stringify(sheet.sheet_title)}
// 				const source_id = ${data.source.source_id}
// 				const btn = div.getElementsByClassName(name)[0]
// 				btn.addEventListener('click', async () => {
// 					const represent = await import('/-sources/represent.js').then(r => r.default)
// 					const data = await represent.set(btn, name, {source_id, sheet_title})
// 					//if (!data.result) return
// 					//const Client = await window.getClient()
// 					//Client.reloaddiv('${env.layer.div}')
// 				})
// 			})(document.currentScript.parentElement)
// 		</script>
const defcustom = (value) => {
	if (value) return 'represent-def-1'
	else return 'represent-custom-0'
}
const showRowRepresent = (data, env, row, text_index) => `
	<button 
		title="Изменить видимость строки" 
		class="eye row transparent ${row.cls.main} ${row.cls.custom}">
		${svg.eye()}
	</button>
`
// <td class="represent">
// 			${row.key_id ? showRowRepresent(data, env, row, text_index) : ''}
// 		</td>	
const showCellsTr = (data, env, sheet, source, rowtexts, text_index, row = data.rows[text_index]) => `
	<tr>
			
		${data.cols.map((col) => showCellTd(data, env, sheet, source, text_index, col.col_index, rowtexts[col.col_index])).join('')}
	</tr>
`
const showCellTd = (data, env, sheet, source, text_index, col_index, celtexts) => `
	<td${data.prunings[text_index]?.[col_index] ? ' style="color:red"' : ''} class="rep">${celtexts.map((text, multi_index) => showMultiSpan(data, env, sheet, source, text, text_index, col_index, multi_index)).join(',&nbsp;')}</td>
`

const showMultiSpan = (data, env, sheet, source, text, text_index, col_index, multi_index) => `	
	<span style="${text ? '' : 'display:block; width:100%'}" class="value transparent ${((data.winners[text_index][col_index][multi_index] || col_index == data.sheet.key_index) && data.masters[text_index]) ? '' : 'mute'}">${text || '&nbsp;'}</span>
`.trim()

const showColTd = (data, env, sheet, source, col) => `
	<td class="prop prop_${col.known || 'unknown'} ${col.represent_col && (!col.prop_id || col.represent_prop) ? 'prop_represent' : 'mute'}">
		${col.col_title}
		${showProp(data, env, sheet, source, col)}
	</td>
`
const showProp = (data, env, sheet, source, col) => {
	let html = ''
	//if (col.type == 'text') 
	if (col.type) html += `<i style="font-weight:normal">${col.type}</i>`
	if (col.col_nick != col.prop_nick) {
		html += `<div style="font-weight:normal">${col.prop_title || 'Свойство не назначено'}</div>`
	} else {
		html += `<div></div>`
	}
	return html
}
