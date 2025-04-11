import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
import date from "/-words/date.html.js"
export const css = ['/-sources/revscroll.css']


export const ROOT = (data, env) => err(data, env, ['TABLE']) || `
	<h1>Исчезли</h1>
	${Object.values(data.variations).map(variation => showVariation(data, env, variation)).join('')}
	<div id="TABLE"></div>
`
const showVariation = (data, env, variation) => `
	<div>
		<a href="disappear?entity_id=${variation[0].entity_id}">${variation[0].entity_title}</a>: ${variation.map(row => showSource(data, env, row)).join(', ')}
	</div>
`
const showSource = (data, env, row) => `
	<a href="disappear?entity_id=${row.entity_id}&source_id=${row.source_id}">${row.source_title}</a>
`.trim()
export const TABLE = (data, env) => !data.result ? '<p><i>Выберите ключевое свойство.</i></p>' : `
	<div class="revscroll"  style="margin-top:2em">
		<table>
			<thead>
				<tr>
					<td>Источник</td>
					<td>Сущность</td>
					<td>Ключ</td>
					<td>Появился</td>
					<td>Исчез</td>
				</tr>
			</thead>
			${data.list.map(row => showTr(data, env, row)).join('')}
		</table>
	</div>
`
const showTr = (data, env, row) => `
	<tr>
		<td>${row.source_title}</td>
		<td>${data.entity.entity_title}</td>
		<td>${row.value_title}</td>
		<td>${date.sai(row.date_appear)}</td>
		<td>${date.sai(row.date_disappear)}</td>
	</tr>
`