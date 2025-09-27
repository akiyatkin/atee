import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
import words from "/-words/words.js"
import date from "/-words/date.html.js"
export const css = ['/-sources/revscroll.css']

export const ROOT = (data, env) => err(data, env) || `
	<h1>Позиции</h1>
	${showFree(data, env, data.table)}
	
`

const showFree = (data, env, table) => `
	
	
	<form style="display: flex; margin: 1em 0; gap: 1em">
		<div class="float-label">
			<input id="freeinp" name="search" type="search" placeholder="Поиск" value="${env.bread.get.search ?? ''}">
			<label for="freeinp">Поиск</label>
		</div>
		<button type="submit">Найти</button>
		<script>
			(form => {
				const btn = form.querySelector('button')
				const input = form.querySelector('input')
				form.addEventListener('submit', async (e) => {
					e.preventDefault()
					const Client = await window.getClient()
					Client.go('poss?search=' + input.value, false)
					Client.reloaddiv("${env.layer.div}")
				})
			})(document.currentScript.parentElement)
		</script>
	</form>

	
	<div class="revscroll">
		<table>
			<thead>
				${showHeadTr(data, env, table.head)}
			</thead>
			<tbody>
				${table.rows.map((row, i) => showRowTr(data, env, row, table.key_ids[i], table.groups[i])).join('')}
			</tbody>
		</table>
	</div>
`
const showRowTr = (data, env, row, key_id, groups) => `
	<tr>
		<td>${key_id}</td>
		<td>${groups.map(g => showGroup(data, env, g)).join(', ')}</td>
		${row.map(title => showTd(data, env, title)).join('')}
	</tr>
`
const showHeadTr = (data, env, row, groups) => `
	<tr>
		<td><code>key_id</code></td>
		<td><code>groups</code></td>
		${row.map(title => showTd(data, env, title)).join('')}
	</tr>
`
const showTd = (data, env, title) => `
	<td>${title}</td>
`
const showGroup = (data, env, group) => `
	<a href="groups/${group.group_id}?search=${env.bread.get.search}">${group.group_title}</a>`