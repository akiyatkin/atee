import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
import date from "/-words/date.html.js"
import svg from "/-sources/svg.html.js"
export const css = ['/-sources/status.css']

export const ROOT = (data, env, sheet = data.sheet, source = data.source) => err(data, env, []) || `
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
	</style>
	<table>
		<thead>
			<tr>
				<td class="empty"></td>${data.cols.map(col => showColTd(data, env, sheet, source, col)).join('')}<td></td>
			</tr>
		</thead>
		<tbody>
			${data.texts.map((row, row_index) => showCellsTr(data, env, sheet, source, row, row_index)).join('')}
		</tbody>
	</table>
	<script>
		(div => {
			
			//const remove = div.getElementsByClassName('remove')[0]
			const cols = ${JSON.stringify(data.cols.map(col => col.col_title))}
			const sheet_title = ${JSON.stringify(sheet.sheet_title)}
			const sheet_index = ${sheet.sheet_index}
			const source_id = ${source.source_id}
			const entity_id = ${data.entity?.entity_id || null}
			for (const btn of div.getElementsByClassName('col')) {
				btn.addEventListener('click', async () => {
					const senditmsg = await import('/-dialog/senditmsg.js').then(r => r.default)
					const col_index = btn.dataset.col_index
					const data = await senditmsg(btn, '/-sources/set-col-switch', {
						source_id, sheet_title,
						col_title: cols[col_index]
					}) 
					if (!data.result) return
					btn.classList.remove('represent-1', 'represent-0', 'represent-custom-1', 'represent-custom-0', 'represent-def-0', 'represent-def-1')
					btn.classList.add(data.cls.main, data.cls.custom)
				})
			}

			for (const btn of div.getElementsByClassName('row')) {
				btn.addEventListener('click', async () => {
					if (!entity_id) {
						const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
						Dialog.alert('Укажите к какой сущности относятся данные этого источника, чтобы управлять видимостью строк!')
						return
					}
					const key_id = btn.dataset.key_id
					const repeat_index = btn.dataset.repeat_index
					
					const senditmsg = await import('/-dialog/senditmsg.js').then(r => r.default)
					const data = await senditmsg(btn, '/-sources/set-row-switch', {
					 	source_id, sheet_title, key_id, repeat_index
					}) 
					if (!data.result) return

					btn.classList.remove('represent-1', 'represent-0', 'represent-custom-1', 'represent-custom-0', 'represent-def-0', 'represent-def-1')
					btn.classList.add(data.cls.main, data.cls.custom)
				})
			}
			for (const btn of div.getElementsByTagName('tbody')) {
				btn.addEventListener('click', e => {
					const td = e.target.closest('td')
					if (!td) return
					const tr = td.parentElement
					const tbody = tr.parentElement
					const td_index = Array.from(tr.children).indexOf(td)
					const row_index = Array.from(tbody.children).indexOf(tr)

					const col_index = td_index - 1
					if (col_index < 0) {
						console.log('row', {source_id, sheet_index, row_index})
					} else {
						console.log('cell', {source_id, sheet_index, row_index, col_index})
					}
				})
			}
			for (const btn of div.getElementsByTagName('thead')) {
				btn.addEventListener('click', e => {
					const eye = e.target.closest('.eye')
					if (eye) return

					const td = e.target.closest('td')

					if (!td) return
					const tr = td.parentElement
					const td_index = Array.from(tr.children).indexOf(td)
					const col_index = td_index - 1
					if (col_index >= 0) {
						console.log('col', {source_id, sheet_index, col_index})
					}
				})
			}
		})(document.currentScript.parentElement)
	</script>
`
const showRowRepresent = (data, env, row, row_index) => `
	<button 
		data-key_id="${row.key_id}"
		data-repeat_index="${row.repeat_index}"
		title="Изменить видимость строки" 
		class="eye row transparent ${data.rows[row_index].cls.main} ${data.rows[row_index].cls.custom}">
		${svg.eye()}
	</button>
`
const showCellsTr = (data, env, sheet, source, rowtexts, row_index) => `
	<tr>
		<td class="mute">${row_index}</td>
		${rowtexts.map((celtexts, col_index) => showCellTd(data, env, sheet, source, row_index, col_index, celtexts)).join('')}
		<td class="represent">
			${showRowRepresent(data, env, data.rows[row_index], row_index)}
		</td>
	</tr>
`
const showCellTd = (data, env, sheet, source, row_index, col_index, celtexts) => `
	<td class="${sheet.key_index == col_index ? 'key' : ''}">${celtexts.map((text, multi_index) => showMultiSpan(data, env, sheet, source, text, row_index, col_index, multi_index)).join(', ')}</td>
`
const showMultiSpan = (data, env, sheet, source, text, row_index, col_index, multi_index) => `
	<span class="${data.winners[row_index][col_index][multi_index] ? '' : 'mute'}">${text}</span>
`.trim()
const showColTd = (data, env, sheet, source, col) => `
	<td>
		${col.col_title}
		<button data-col_index="${col.col_index}" title="Изменить видимость колонки" class="eye col transparent ${col.cls.main} ${col.cls.custom}">${svg.eye()}</button>
	</td>
`