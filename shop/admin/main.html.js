import field from "/-dialog/field.html.js"
import date from "/-words/date.html.js"
import ago from "/-words/ago.html.js"
import err from "/-controller/err.html.js"
export const css = ['/-sources/represent.css','/-sources/revscroll.css']
export const ROOT = (data, env) => `
	<h1>Магазин</h1>
	<style>
		${env.scope} .red {
			color: red;
		}
		${env.scope} table thead td {
			font-weight: normal;
		}
		${env.scope} .green {
			color: green;
		}
	</style>
	<!-- <div class="revscroll">
		<table>
			<thead>
				<tr>
					<th>Год</th>
					<th>Месяц</th>
					<th>Позиций</th>
					<th>ОК</th>
					<td>Бренды</td>
					<td>Фильтры</td>
					<td>Группы</td>
					<td>В группах</td>
					<td>Фильтров</td>
					<td>Цен</th>
					<td>Картинок</td>
					<td>Описаний</td>
					<td>Наименований</td>
					
				</tr>
			</thead>
			<tbody>
				${(data.rows || []).map(row => showRow(data, env, row)).join('')}
			</tbody>
		</table>
	</div> -->
	${showAuth(data, env)}
`
const redTd = (row, name, sum = row.inpositions - row[name]) => `
	<td class="${sum ? 'red' : 'green'}">${sum || 'ОК'}</td>
`
const showRow = (data, env, row) => `
	<tr>
		<th>${row.year}</th>
		<th>${MONTH[row.month]}</th>
		<!-- <td>${row.positions}</td> -->
		<th title="${row.withall}">${row.inpositions ? Math.round(row.withall / row.inpositions * 100) : 0}%</th>
		<td>${row.inbrands}</td>
		<td>${row.infilters}</td>
		<td>${row.groups}</td>
		<td>${row.inpositions}</td>
		${redTd(row, 'withfilters')}
		${redTd(row, 'withcost')}
		${redTd(row, 'withimage')}
		${redTd(row, 'withdescription')}
		${redTd(row, 'withname')}
		
	</tr>
`
const showAuth = (data, env) => `
	<div style="display: grid; gap: 0.25em; margin: 1em 0">
		<div>Администратор сайта: ${data.admin?'Да':'Нет'}</div>
		<div>База данных: ${data.isdb?'Да':'Нет'}</div>
	</div>
`
