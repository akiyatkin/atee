import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
import date from "/-words/date.html.js"
import svg from "/-sources/svg.html.js"
export const css = ['/-sources/represent.css']

export const ROOT = (data, env, sheet = data.sheet, source = data.source) => err(data, env, ['TABLE']) || `
	<div style="opacity:0.5; float:right">Лист у <a href="source/${source.source_id}">${source.source_title}</a></div>
	<h1>${sheet.sheet_title}</h1>
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
			cursor: default;
		}
		${env.scope} table button {
			font-weight: inherit;
		}
	</style>
	<div style="margin-bottom:1em; display: grid; grid-template-columns: 1fr auto; gap: 1em">
		<div>
			${field.area({
				name: 'comment', 
				label: 'Комментарий источника', 
				action: '/-sources/set-source-comment', 
				args: {source_id: source.source_id},
				value: source.comment
			})}
		</div>
		<div>
			<div class="float-label" style="margin-bottom:1em; max-width: 20ch;">
				<input 
					required
					max="${new Date(data.date_max * 1000).toISOString().split('T')[0]}"
					min="${new Date(data.date_min * 1000).toISOString().split('T')[0]}"

					type="date" 
					id="date${env.sid}"
					value="${env.bread.get.date && !isNaN(new Date(env.bread.get.date - 0)) ? new Date(env.bread.get.date - 0).toISOString().slice(0,10) : new Date().toISOString().split('T')[0]}" 
					placeholder="Появились c" 
				>
				<label for="date${env.sid}">Появились c</label>
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
		</div>
	</div>
	
	<div id="TABLE"></div>
`

export const TABLE = (data, env, sheet = data.sheet, source = data.source) => !data.result ? '' : `
	
	

	<table>
		<thead>
			<tr>
				<td class="empty"></td>
				${data.cols.map(col => showColTd(data, env, sheet, source, col)).join('')}
				<td>

				</td>
				<td></td>
			</tr>
		</thead>
		<tbody>
			${data.texts.map((row, text_index) => showCellsTr(data, env, sheet, source, row, text_index)).join('')}
		</tbody>
	</table>
	<script>
		(async div => {			
			const cols = ${JSON.stringify(data.cols.map(col => [col.col_title, col.prop_id]))}
			const keys = ${JSON.stringify(data.rows.map(row => [row.key_id, row.repeat_index, row.row_index]))}
			const sheet_title = ${JSON.stringify(sheet.sheet_title)}
			const sheet_index = ${sheet.sheet_index}
			const source_id = ${source.source_id}
			const entity_id = ${data.entity?.entity_id || null}
			const eye = await import('/-sources/represent.js').then(r => r.default)
			for (const btn of div.getElementsByClassName('col')) { //Видимость колонки
				btn.addEventListener('click', async () => {
					const senditmsg = await import('/-dialog/senditmsg.js').then(r => r.default)

					const td = btn.closest('td')
					const tr = td.parentElement
					const col_index = Array.from(tr.children).indexOf(td) - 1
					const [col_title, prop_id] = cols[col_index]
					const data = await senditmsg(btn, '/-sources/set-col-switch', {
						source_id, sheet_title, col_title
					}) 
					if (!data.result) return
					btn.classList.remove('represent-1', 'represent-0', 'represent-custom-1', 'represent-custom-0', 'represent-def-0', 'represent-def-1')
					btn.classList.add(data.cls.main, data.cls.custom)
					if (cols.length < 5000) {
						const Client = await window.getClient()
						Client.reloaddiv('${env.layer.div}')
					}
				})
			}

			
			for (const btn of div.getElementsByClassName('row')) { //Видимость строки
				btn.addEventListener('click', async () => {
					if (!entity_id) {
						const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
						return Dialog.alert('Укажите к какой сущности относятся данные этого источника, чтобы управлять видимостью строк!')
						
					}
					
					const tr = btn.closest('tr')
					const tbody = tr.parentElement
					const text_index = Array.from(tbody.children).indexOf(tr)
					const [key_id, repeat_index, row_index] = keys[text_index]

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
					if (cols.length < 5000) {
						const Client = await window.getClient()
						Client.reloaddiv('${env.layer.div}')
					}
				})
			}

			
			for (const btn of div.getElementsByClassName('item')) { //Информация о строке
				btn.addEventListener('click', e => {
					const tr = btn.closest('tr')
					const tbody = tr.parentElement
					const text_index = Array.from(tbody.children).indexOf(tr)
					const [key_id, repeat_index, row_index] = keys[text_index]
					eye.popup({source_id, sheet_index, row_index}, '${env.layer.div}')
				})
			}
			for (const btn of div.getElementsByClassName('value')) { //Информация о значении
				btn.addEventListener('click', e => {
					const td = e.target.closest('td')
					const multi_index = Array.from(td.children).indexOf(btn)
					const tr = td.parentElement
					const tbody = tr.parentElement
					const text_index = Array.from(tbody.children).indexOf(tr)
					const [key_id, repeat_index, row_index] = keys[text_index]
					const col_index = Array.from(tr.children).indexOf(td) - 1
					const [col_title, prop_id] = cols[col_index]
					eye.popup({source_id, sheet_index, row_index, col_index, multi_index}, '${env.layer.div}')
				})
			}
			for (const btn of div.getElementsByClassName('prop')) { //Информация о свойстве
				btn.addEventListener('click', e => {
					const td = e.target.closest('td')
					const tr = td.parentElement
					const col_index = Array.from(tr.children).indexOf(td) - 1
					const [col_title, prop_id] = cols[col_index]
					eye.popup({source_id, sheet_index, col_index}, '${env.layer.div}')
				})
			}
			
		})(document.currentScript.parentElement)
	</script>
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
		<td class="rep ${row.represent_row && row.represent_row_key ? '' : 'mute'}"><button class="transparent item">${row.row_index}</button></td>
		${rowtexts.map((celtexts, col_index) => showCellTd(data, env, sheet, source, text_index, col_index, celtexts)).join('')}
		<td><i><nobr>${date.sai(row.date_appear)}</nobr></i></td>
		<td class="represent">
			${row.key_id ? showRowRepresent(data, env, row, text_index) : ''}
		</td>
	</tr>
`
const showCellTd = (data, env, sheet, source, text_index, col_index, celtexts) => `
	<td style="${data.prunings[text_index]?.[col_index] ? 'color:red' : ''}" class="rep ${sheet.key_index == col_index ? 'key' : ''}">${celtexts.map((text, multi_index) => showMultiSpan(data, env, sheet, source, text, text_index, col_index, multi_index)).join(', ')}</td>
`
const showMultiSpan = (data, env, sheet, source, text, text_index, col_index, multi_index) => `
	<button class="value transparent ${data.winners[text_index][col_index][multi_index] ? '' : 'mute'}">${text}</button>
`.trim()
const showColTd = (data, env, sheet, source, col) => `
	<td>
		<nobr>
			<button class="transparent prop">${col.col_title}</button>
			<button class="eye col transparent ${col.cls.main} ${col.cls.custom}">${svg.eye()}</button>
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
	<span style="font-weight: normal">(${col.prop_title})</span>
`