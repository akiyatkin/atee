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
	</style>
	<div class="revscroll">
		<table>
			<thead>
				<tr>
					<td>Год</td>
					<td>Месяц</td>
					<td>Позиций</td>
					<td>В группах</td>
					<td>Готовых</td>
					<td>Фильтры</td>
					<td>Цены</td>
					<td>Картинки</td>
					<td>Описания</td>
					<td>Наименования</td>
					<td>Фильтров</td>
					<td>Брендов</td>
					<td>Групп</td>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>2025</td>
					<td>Июнь</td>
					<td>2560</td>
					<td>1350</td>
					<th>10%</th>
					<td class="red">13</td>
					<td class="red">130</td>
					<td class="red">135</td>
					<td class="red">80</td>
					<td class="red">99</td>
					<td>2</td>
					<td>13</td>
					<td>10</td>
				</tr>
			</tbody>
		</table>
	</div>
	${showAuth(data, env)}
`
const showAuth = (data, env) => `
	<div style="display: grid; gap: 0.25em; margin: 1em 0">
		<div>Администратор сайта: ${data.admin?'Да':'Нет'}</div>
		<div>База данных: ${data.isdb?'Да':'Нет'}</div>
	</div>
`
