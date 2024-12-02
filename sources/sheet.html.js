import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
import date from "/-words/date.html.js"
import svg from "/-sources/svg.html.js"
export const css = ['/-sources/status.css']

export const ROOT = (data, env, sheet = data.sheet, source = data.source) => err(data, env, ['TABLE']) || `
	<div style="opacity:0.5; float:right">Лист у <a href="source/${source.source_id}">${source.source_title}</a></div>
	<h1>${sheet.sheet_title}</h1>
	<style>
		${env.scope} tbody td {
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
	<div id="TABLE"></div>
`
export const TABLE = (data, env, sheet = data.sheet, source = data.source) => !data.result ? '' : `
	<table>
		<thead>
			<tr>
				<td class="empty"></td>
				${data.cols.map(col => showColTd(data, env, sheet, source, col)).join('')}<td></td>
			</tr>
		</thead>
		<tbody>
			${data.texts.map((row, row_index) => showCellsTr(data, env, sheet, source, row, row_index)).join('')}
		</tbody>
	</table>
	<script>
		(div => {			
			const cols = ${JSON.stringify(data.cols.map(col => [col.col_title, col.prop_id]))}
			const keys = ${JSON.stringify(data.rows.map(row => [row.key_id, row.repeat_index]))}
			const sheet_title = ${JSON.stringify(sheet.sheet_title)}
			const sheet_index = ${sheet.sheet_index}
			const source_id = ${source.source_id}
			const entity_id = ${data.entity?.entity_id || null}
			
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
					const row_index = Array.from(tbody.children).indexOf(tr)
					const [key_id, repeat_index] = keys[row_index]

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

			const popupRepresent = async (args) => {
				const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
				console.log(args)
				Dialog.open({
					tpl:'/-sources/represent.html.js',
					sub:'POPUP',
					conf: {
						reloaddiv:'${env.layer.div}'
					},
					json:'/-sources/get-represent?' + new URLSearchParams(args)
				})
			}
			for (const btn of div.getElementsByClassName('item')) { //Информация о строке
				btn.addEventListener('click', e => {
					const tr = btn.closest('tr')
					const tbody = tr.parentElement
					const row_index = Array.from(tbody.children).indexOf(tr)
					const [key_id, repeat_index] = keys[row_index]
					popupRepresent({source_id, sheet_index, row_index})
				})
			}
			for (const btn of div.getElementsByClassName('value')) { //Информация о значении
				btn.addEventListener('click', e => {
					const td = e.target.closest('td')
					const multi_index = Array.from(td.children).indexOf(btn)
					const tr = td.parentElement
					const tbody = tr.parentElement
					const row_index = Array.from(tbody.children).indexOf(tr)
					const [key_id, repeat_index] = keys[row_index]
					const col_index = Array.from(tr.children).indexOf(td) - 1
					const [col_title, prop_id] = cols[col_index]
					console.log(cols)
					popupRepresent({source_id, sheet_index, row_index, col_index, multi_index})
				})
			}
			for (const btn of div.getElementsByClassName('prop')) { //Информация о свойстве
				btn.addEventListener('click', e => {
					const td = e.target.closest('td')
					const tr = td.parentElement
					const col_index = Array.from(tr.children).indexOf(td) - 1
					const [col_title, prop_id] = cols[col_index]
					popupRepresent({source_id, sheet_index, col_index})
				})
			}
			
		})(document.currentScript.parentElement)
	</script>
`
const showRowRepresent = (data, env, row, row_index) => `
	<button 
		
		title="Изменить видимость строки" 
		class="eye row transparent ${data.rows[row_index].cls.main} ${data.rows[row_index].cls.custom}">
		${svg.eye()}
	</button>
`
const showCellsTr = (data, env, sheet, source, rowtexts, row_index, row = data.rows[row_index]) => `
	<tr>
		<td class="mute"><button class="transparent item">${row_index}</button></td>
		${rowtexts.map((celtexts, col_index) => showCellTd(data, env, sheet, source, row_index, col_index, celtexts)).join('')}
		<td class="represent">
			${row.key_id ? showRowRepresent(data, env, row, row_index) : ''}
		</td>
	</tr>
`
const showCellTd = (data, env, sheet, source, row_index, col_index, celtexts) => `
	<td style="${data.prunings[row_index]?.[col_index] ? 'color:red' : ''}" class="${sheet.key_index == col_index ? 'key' : ''}">${celtexts.map((text, multi_index) => showMultiSpan(data, env, sheet, source, text, row_index, col_index, multi_index)).join(', ')}</td>
`
const showMultiSpan = (data, env, sheet, source, text, row_index, col_index, multi_index) => `
	<button class="value transparent ${data.winners[row_index][col_index][multi_index] ? '' : 'mute'}">${text}</button>
`.trim()
const showColTd = (data, env, sheet, source, col) => `
	<td>
		<button class="transparent prop">${col.col_title}</button>
		<button class="eye col transparent ${col.cls.main} ${col.cls.custom}">${svg.eye()}</button>
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