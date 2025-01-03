import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
import date from "/-words/date.html.js"
import svg from "/-sources/svg.html.js"
export const css = ['/-sources/represent.css','/-sources/revscroll.css']

export const ROOT = (data, env, sheet = data.sheet, source = data.source) => err(data, env, ['TABLE']) || `
	<div style="float:right"><a href="source/${source.source_id}">${source.source_title}</a></div>
	<h1>Содержание</h1>

	<style>
		${env.scope} tbody td.rep {
			cursor: pointer;
			
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
		${env.scope} tbody td.represent {
			cursor: default;
		}
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
	${showComment(data, env, source)}
	<div id="SHEET"></div>
	
`
export const SHEET = (data, env) => `
	<div class="sheetrow">
		<style>
			${env.scope} .sheetrow {
				margin:1em 0; 
				display: flex; 
				gap: 1em; 
				align-items: center;
			}
			@container main (max-width:575px) {
				${env.scope} .sheetrow {
					flex-wrap: wrap;
				}	
			}
		</style>
		<div class="float-label" style="max-width: 20ch;">
			<input 
				required
				max="${new Date(data.date_max * 1000).toISOString().split('T')[0]}"
				min="${new Date(data.date_min * 1000).toISOString().split('T')[0]}"

				type="date" 
				id="date${env.sid}"
				value="${env.bread.get.date && !isNaN(new Date(env.bread.get.date - 0)) ? new Date(env.bread.get.date - 0).toISOString().slice(0,10) : new Date().toISOString().split('T')[0]}" 
				placeholder="Появились c" 
			>
			<label for="date${env.sid}">Новые данные</label>
			<script>
				(float => {
					const field = float.querySelector('input')
					const check = async () => {
						
						const Client = await window.getClient()
						const params = {}
						const source_id = Client.bread.get.source_id || ''
						const entity_id = Client.bread.get.entity_id || ''
						if (source_id) params.source_id = source_id
						if (entity_id) params.entity_id = entity_id
						if (field.valueAsDate) params.date = Math.round(field.valueAsDate.getTime())
						Client.go('sheet?' + new URLSearchParams(params))
					}
					// field.addEventListener('focus', check)
					// field.addEventListener('click', check)
					// field.addEventListener('keydown', check)
					field.addEventListener('input', check)
				})(document.currentScript.parentElement)
			</script>
		</div>
		<div style="flex-grow: 1; display: flex; gap:0.1em 1em; flex-wrap: wrap">
			${data.sheets.map(sheet => sheet.loaded.sheet_index == data.sheet.sheet_index ? '<div>' + sheet.sheet_title + '</div>' : showSheetLink(data, env, sheet)).join('')}
		</div>
	</div>
	<form style="margin: 1em 0; display: flex; gap: 1em">
		
		<input name="search" type="search" style="flex-grow:1" value="${env.bread.get.search ?? ''}"><button type="submit">Найти</button>
		<script>
			(form => {
				const source_id = ${data.source.source_id}
				const sheet_index = ${data.sheet.sheet_index ?? 0}
				const date = ${env.bread.get.date ?? 0}
				const count = ${data.count}
				const check = async (go) => {
					const Client = await window.getClient()
					const search = form.search.value.trim()

					const gindex = sheet_index ? '&sheet_index=' + sheet_index : ''
					const gsearch = search ? '&search=' + search : ''
					const gdate = date ? '&date=' + date : ''

					if (go || count < 1000) {
						Client.go('sheet?source_id=' + source_id + gindex + gdate + gsearch)
					}
				}
				form.addEventListener('submit', e => {
					e.preventDefault()
					check(true)
				})
				form.search.addEventListener('input', () => {
					check()
				})

			})(document.currentScript.parentElement)
		</script>
	</form>
	
	<div id="TABLE"></div>
`
const showSheetLink = (data, env, sheet) => `
	<a href="sheet?source_id=${sheet.source_id}&sheet_index=${sheet.loaded.sheet_index}">${sheet.sheet_title}</a>
`
const showComment = (data, env, source) => `
	<div>
		${field.area({
			name: 'comment', 
			label: 'Комментарий источника', 
			action: '/-sources/set-source-comment', 
			args: {source_id: source.source_id},
			value: source.comment
		})}
	</div>
	<script>
		(div => {
			const field = div.querySelector('.field')
			if (!field) return
			const check = async () => {
				if (!div.closest('body')) return
				const data = await fetch('${env.layer.json}').then(r => r.json())
				if (!div.closest('body')) return
				if (data.source.comment != field.innerHTML) {
					alert('Комментарий был изменён на другой вкладке или другим пользователем, обновите страницу!')
				}
				setTimeout(check, 30000)
			}
			setTimeout(check, 30000)	
		})(document.currentScript.previousElementSibling)
	</script>
`
export const TABLE = (data, env, sheet = data.sheet, source = data.source) => !data.result ? '' : `
	
	
	<div class="revscroll">
		<script>
			(async div => {
				const cols = ${JSON.stringify(data.cols.map(col => [col.col_title, col.prop_id]))}
				const keys = ${JSON.stringify(data.rows.map(row => [row.key_id, row.repeat_index, row.row_index]))}
				const sheet_title = ${JSON.stringify(sheet.sheet_title)}
				const source_id = ${source.source_id}
				const entity_id = ${data.entity?.entity_id || null}
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
						const [key_id, repeat_index, row_index] = keys[text_index]
						const col_index = Array.from(tr.children).indexOf(td) - 1
						const [col_title, prop_id] = cols[col_index]
						represent.popup({source_id, sheet_title, key_id, repeat_index, col_title, multi_index, col_index, row_index, sheet_index}, '${env.layer.div}')
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
						const [key_id, repeat_index] = keys[text_index]

						if (!key_id) {
							const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
							return Dialog.alert('В строке нет ключа')
						}
						
						const senditmsg = await import('/-dialog/senditmsg.js').then(r => r.default)
						const data = await senditmsg(btn, '/-sources/set-row-switch', {
						 	source_id, sheet_title, key_id, repeat_index
						})
						if (!data.result) return

						btn.classList.remove('represent-1', 'represent-0', 'represent-custom-1', 'represent-custom-0', 'represent-def-0', 'represent-def-1')
						btn.classList.add(data.cls.main, data.cls.custom)
						if (cols.length * keys.length < 1000) {
							const Client = await window.getClient()
							Client.reloaddiv('${env.layer.div}')
						}
					}
					const prop = e.target.closest('.prop')
					if (prop) {
						const td = e.target.closest('td')
						const tr = td.parentElement
						const col_index = Array.from(tr.children).indexOf(td) - 1
						const [col_title, prop_id] = cols[col_index]
						represent.popup({source_id, sheet_title, col_title}, '${env.layer.div}')
					}
				
				})

			})(document.currentScript.parentElement)
		</script>
		<table class="compact" style="table-layout: fixed;">
			<thead>
				<tr>
					<td class="empty"></td>
					${data.cols.map(col => showColTd(data, env, sheet, source, col)).join('')}
					<td class="empty" title="Дата первого появление ключа в этом источнике">Появление</td>
				</tr>
			</thead>
			<tbody>
				${data.texts.map((row, text_index) => showCellsTr(data, env, sheet, source, row, text_index)).join('')}
			</tbody>
		</table>
		<script>
			(async div => {
				const name = 'revscroll_sheet_${source.source_id}_${source.sheet_index}'
				div.scrollLeft = window.sessionStorage.getItem(name) || 0
				div.addEventListener('scroll', e => {
					window.sessionStorage.setItem(name, div.scrollLeft)
				}, {passive: true})

			})(document.currentScript.parentElement)
		</script>
	</div>
`
const showRowRepresent = (data, env, row, text_index) => `
	<button 
		title="Изменить видимость строки" 
		class="eye row transparent ${row.cls.main} ${row.cls.custom}">
		${svg.eye()}
	</button>
`
const showCellsTr = (data, env, sheet, source, rowtexts, text_index, row = data.rows[text_index]) => `
	<tr>
		<td class="represent">
			${row.key_id ? showRowRepresent(data, env, row, text_index) : ''}
		</td>		
		${rowtexts.map((celtexts, col_index) => showCellTd(data, env, sheet, source, text_index, col_index, celtexts)).join('')}
		<td><i><nobr>${date.sai(row.date_appear)}</nobr></i></td>
	</tr>
`
const showCellTd = (data, env, sheet, source, text_index, col_index, celtexts) => `
	<td${data.prunings[text_index]?.[col_index] ? ' style="color:red"' : ''} class="rep">${celtexts.map((text, multi_index) => showMultiSpan(data, env, sheet, source, text, text_index, col_index, multi_index)).join(', ')}</td>
`
const showMultiSpan = (data, env, sheet, source, text, text_index, col_index, multi_index) => `
	<button style="${text ? '' : 'display:block; width:100%'}" class="value transparent ${data.winners[text_index][col_index][multi_index] ? '' : 'mute'}">${text || '&nbsp;'}</span>
`.trim()

const showColTd = (data, env, sheet, source, col) => `
	<td>
		<nobr>
			<button class="transparent prop">${col.col_title}</button>
		</nobr>
		${showProp(data, env, sheet, source, col)}
	</td>
`
const showProp = (data, env, sheet, source, col) => !col.prop_title || col.col_title == col.prop_title ? '' : `
	<br>
	${field.search({
		cls: 'a',
		search:'/-sources/get-col-prop-search?entity_id=' + sheet.entity_id,
		value: col.prop_title || 'Не указано',
		label: 'Выберите свойство', 
		type: 'text',
		name: 'prop_id',
		find: 'prop_id',
		action: '/-sources/set-col-prop',
		args: {source_id: source.source_id, sheet_index: sheet.sheet_index, col_index: col.col_index},
		reloaddiv:env.layer.div
	})}
`