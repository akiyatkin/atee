import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
export const css = ['/-sources/revscroll.css']
export const ROOT = (data, env, entity = data.entity) => err(data, env, ['TABLE']) || `
	<h1>${entity.entity_plural}</h1>
	<form style="margin: 1em 0; display: flex; gap: 1em">
		
		<input name="search" type="search" style="flex-grow:1" value="${env.crumb.child?.name ?? ''}"><button type="submit">Найти</button>
		<script>
			(form => {
				const entity_id = ${data.entity.entity_id}
				const check = async () => {
					const Client = await window.getClient()
					const search = form.search.value.trim()
					if (search) {
						Client.go('positions/' + entity_id + '/' + search)	
					} else {
						Client.go('positions/' + entity_id)
					}
				}
				form.addEventListener('submit', e => {
					e.preventDefault()
					check()
				})
				form.search.addEventListener('input', () => {
					check()
				})

			})(document.currentScript.parentElement)
		</script>
	</form>
	<div id="TABLE"></div>
`
export const TABLE = (data, env) => !data.result ? '' : `
	<div class="revscroll">
		<table style="max-width: 100%; table-layout: fixed;">
			<thead>
				<tr>
					${data.props.map(prop => showHeadTd(data, env, prop)).join('')}
				</tr>
			</thead>
			<tbody style="cursor:pointer">
				${data.rows.map(([key_id, row]) => showRowTr(data, env, key_id, row)).join('')}
			</tbody>
		</table>
		<script>
			(table => {
				const entity_id = ${data.entity.entity_id}
				const tbody = table.tBodies[0]
				tbody.addEventListener('click', async (e) => {
					const tr = e.target.closest('tr')
					const key_id = tr.dataset.key_id
					const Client = await window.getClient()
					Client.go('position/' + entity_id + '/' + key_id)	
				})
			})(document.currentScript.previousElementSibling)
		</script>
	</div>
`
const showRowTr = (data, env, key_id, row) => `
	<tr data-key_id="${key_id}">
		${data.props.map(prop => showCellTd(data, env, row[prop.prop_id])).join('')}
	</tr>
`
const showHeadTd = (data, env, prop) => `
	<th>${prop.prop_title}</th>
`
const showCellTd = (data, env, cell) => `
	<td>${cell.join(', ')}</td>
`