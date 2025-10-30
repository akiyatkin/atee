import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
import words from "/-words/words.js"
import date from "/-words/date.html.js"
export const css = ['/-sources/revscroll.css']

export const ROOT = (data, env) => err(data, env) || `
	<h1>Строки</h1>
	${showRows(data, env, data.table)}
`

const showRows = (data, env, table) => `
	<form style="display: flex; margin: 1em 0; gap: 1em">
		<div class="float-label">
			<input id="freeinp" name="query" type="search" placeholder="Поиск" value="${env.bread.get.query ?? ''}">
			<label for="freeinp">Поиск</label>
		</div>
		<button type="submit">Найти</button>
		<script>
			(form => {
				const btn = form.querySelector('button')
				const input = form.querySelector('input')
				input.focus()
				input.setSelectionRange(input.value.length, input.value.length)
				form.addEventListener('submit', async (e) => {
					e.preventDefault()
					const Client = await window.getClient()
					Client.go('rows?query=' + input.value, false)
					Client.reloaddiv("${env.layer.div}")
				})
			})(document.currentScript.parentElement)
		</script>
	</form>

	<p>
		Найдено: ${data.count}
	</p>
	<div class="revscroll">
		<table>
			<thead>
				${showHeadTr(data, env, table.head)}
			</thead>
			<tbody>
				${table.rows.map((row, i) => showRowTr(data, env, row)).join('')}
			</tbody>
		</table>
		<script>
			(async div => {
				const name = 'sources_rows_${env.bread.get.search || ''}'
				div.scrollLeft = window.sessionStorage.getItem(name) || 0
				div.addEventListener('scroll', e => {
					window.sessionStorage.setItem(name, div.scrollLeft)
				}, {passive: true})

			})(document.currentScript.parentElement)
		</script>
		<script>
			(async div => {
				const table = div.querySelector('table')
				table.addEventListener('click', (e) => {
					const old = table.querySelector('.clicked')
					if (old) old.classList.remove('clicked')
					const tr = e.target.closest('tr')
					if (!tr) return
					tr.classList.add('clicked')
				})
			})(document.currentScript.parentElement)
		</script>
	</div>
`
const showHeadTr = (data, env, head) => `
	<tr>
		${head.map(title => showTd(data, env, title)).join('')}
		<td>Источник</td>
		<td>Лист</td>
		<td><code>key_id</code></td>
	</tr>
`
const showRowTr = (data, env, row) => `
	<tr>
		
		${row.cells.map(cell => cell ? showCell(data, env, row, cell) : showTd(data, env, '')).join('')}
		${showRowTdSource(data, env, row, )}
		${showRowTdSheet(data, env, row, row.sheet_title)}
		${showRowTdKey(data, env, row, row.sheet_title)}
	</tr>
`
const showRowTdSource = (data, env, row) => `
	<td class="${row.key_id ? '' : 'mute'}"><a href="sheet?source_id=${row.source_id}&search=${env.bread.get.search || ''}">${row.source_title}</a></td>
`
const showRowTdSheet = (data, env, row) => `
	<td class="${row.key_id ? '' : 'mute'}"><a href="sheet?keyfilter=all&source_id=${row.source_id}&sheet_index=${row.sheet_index}&search=${env.bread.get.search || ''}">${row.sheet_title}</a></td>
`
const showRowTdKey = (data, env, row) => `
	<td class="${row.key_id ? '' : 'mute'}"><code>${row.key_id||''}</code></td>
`
const showTd = (data, env, title) => `
	<td>${title}</td>
`
const showCell = (data, env, row, cell) => `
	<td class="${cell.winner || (row.key_id && cell.col_index == row.key_index) ? '' : 'mute'}">${cell.text}</td>
`