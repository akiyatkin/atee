import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
import date from "/-words/date.html.js"
import svg from "/-sources/svg.html.js"
export const css = ['/-sources/represent.css','/-sources/revscroll.css']

export const ROOT = (data, env, sheet = data.sheet, source = data.source) => err(data, env, ['DATES','SHEETS', 'TABLE']) || `
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
	${showSearch(data, env)}
	<div id="DATES"></div>
	<div id="SHEETS"></div>
	<div id="TABLE"></div>
	<div style="margin-top:2em; text-align: right;">
		${field.button({
			label: 'Загрузить', 
			action: '/-sources/set-source-load',
			reloaddiv: env.layer.div,
			args: {source_id: source.source_id}
		})}
	</div>
`
export const DATES = (data, env) => !data.result ? `` : `
	<div style="align-items: center; flex-grow: 1; display: flex; gap:0.5em 1em; flex-wrap: wrap; font-size: 12px">
		<div><a class="${env.bread.get.keyfilter == 'all' ? 'active' : ''}" href="sheet${addget(env, {keyfilter: 'all'})}">Всё&nbsp;<sup>${data.quantity_without_keys + data.quantity_of_keys}</sup></a></div>
		<div><a class="${env.bread.get.keyfilter == 'not' ? 'active' : ''}" href="sheet${addget(env, {keyfilter: 'not'})}">Без&nbsp;ключа&nbsp;<sup>${data.quantity_without_keys}</sup></a></div>
		<div><a class="${env.bread.get.keyfilter == 'yes' ? 'active' : ''}" href="sheet${addget(env, {keyfilter: 'yes'})}">С&nbsp;ключом<sup>${data.quantity_of_keys}</sup></a></div>
		<div style="background: linear-gradient(-30deg, #00aaff55, #4466ff22); padding: 0.5em; flex-grow: 1; display: flex; gap:0.5em 1em; flex-wrap: wrap; font-size: 12px">
			
			${data.dates.map(dateup => showDate(data, env, dateup)).join('')}
			
		</div>
	</div>
	<script>
		(async div => {
			window.addEventListener('crossing', (e) => {
				const {theme, bread} = e.detail
				const origin = location.origin + bread.href
				const aa = div.getElementsByTagName('a')
				let r = false
				for (const a of aa) {
					if (a.href != origin) continue
					r = a
				}
				if (r) for (const a of aa) {
					if (a === r) a.classList.add('active')
					else a.classList.remove('active')
				}
			})
		})(document.currentScript.previousElementSibling)
	</script>
`
export const SHEETS = (data, env) => !data.result ? `` : `
	<div style="margin: 1em 0; flex-grow: 1; display: flex; gap:0.5em 1em; flex-wrap: wrap">
		${data.sheets.map(sheet => showSheet(data, env, sheet)).join('')}
	</div>
`
const showDate = (data, env, dateup, active = dateup.active && (!env.bread.get.keyfilter || env.bread.get.keyfilter == 'appear')) => `
	<div title="Дата обновления ${date.dmyhi(dateup.date)}">
		<a class="${active ? 'active' : ''}" href="sheet${addget(env, {keyfilter:'appear', appear:dateup.date})}">
			${dateup.title || date.ai(dateup.date)}&nbsp;<sup>${dateup.count}</sup>
		</a>
	</div>
`
const showSheet = (data, env, sheet, active = sheet.sheet_index == data.sheet.sheet_index) => {
	if (!active) return `<div><a href="sheet${addget(env, {sheet_index:sheet.sheet_index})}">${sheet.sheet_title}&nbsp;<sup>${sheet.count}</sup></a></div>`
	if (active) return `<div>${sheet.sheet_title}&nbsp;<sup>${sheet.count}</sup></div>`
}



const addget = (env, params = {}) => {
	for (const name in env.bread.get) if (!(name in params)) params[name] = env.bread.get[name]
	delete params.t
	const search = Object.entries(params)
		.filter(([key, val]) => val !== '' && val !== null)
		.map(([key, val]) => key)
		.sort()
		.map(key => `${key}=${params[key]}`)
		.join('&')
	return search ? '?' + search : ''
}
const showSearch = (data, env) => `
	<form style="margin: 1em 0; display: flex; gap: 1em">
		
		<input name="search" type="search" style="flex-grow:1" value="${env.bread.get.search ?? ''}"><button type="submit">Найти</button>
		<script>
			(form => {
				const source_id = ${data.source.source_id}
				const sheet_index = ${env.bread.get.sheet_index || 0}
				const date = ${env.bread.get.date}
				
				const check = async (go) => {
					
					const search = form.search.value.trim()

					const gindex = sheet_index ? '&sheet_index=' + sheet_index : ''
					const gsearch = search ? '&search=' + search : ''
					const gdate = date !== '' ? '&date=' + date : ''

					if (go) {
						const Client = await window.getClient()
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
		<style>
			${env.scope} table thead td {
				vertical-align: top;
			}
			/*${env.scope} button {
				white-space: normal;
			}*/
		</style>
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
		
		<button class="transparent prop">${col.col_title}</button>
		
		${showProp(data, env, sheet, source, col)}
	</td>
`
const showProp = (data, env, sheet, source, col) => col.col_title == col.prop_title ? '' : `
	<div>
		${field.search({
			cls: 'a',
			search:'/-sources/get-col-prop-search?entity_id=' + sheet.entity_id,
			value: col.prop_title || 'Свойство не назначено',
			heading: 'Свойство колонки',
			descr: 'Выберите свойство, которое будте соответствовать колонке <b>' + col.col_title + '</b>',
			label: 'Выберите свойство', 
			type: 'text',
			name: 'prop_id',
			find: 'prop_id',
			action: '/-sources/set-col-prop',
			args: {source_id: source.source_id, sheet_index: sheet.sheet_index, col_index: col.col_index},
			reloaddiv:env.layer.div
		})}
	</div>
`