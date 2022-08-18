export const ROOT = (data) => `
<p>
	Администратор сайта: ${data.admin?'Да':'Нет'}<br>
	Соединение с базой данных: ${data.db?'Да':'Нет'}<br>
</p>
<div id="CONTENT"></div>
`
export const MAIN = (data, env) => `
	<a href="tables">Таблицы</a>
`
export const TABLES = (data, env) => `
	<h1>Таблицы</h1>
	<table>
		<tr><td></td><td>Строк</td><td>Мб</td></tr>
		${data.list.map(({name, mb, length}) => `<tr><td>${name}</td><td>${length}</td><td>${mb}</td></tr>`).join('')}
	</table>
`
