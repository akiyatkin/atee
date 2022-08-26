import { words } from "/-words/words.js"
export const set_files_loadall = (ans) => `
	<h1>Файлы привязаны</h1>
	`+ (checherror(ans) || `
		Связано: ${ans.count} ${words(ans.count, 'файл', 'файла', 'файлов')}<br>
		Дубликаты файлов: <br>${ans.doublepath?.join(', ')}
	`)

export const set_tables_clearall = (ans) => `
	<h1>Данные очищены</h1>
	${msg(ans)}
`
export const set_prices_clearall = (ans) => `
	<h1>Прайсы очищены</h1>
	${msg(ans)}
`

export const set_prices_loadall = (ans) => `
	<h1>Новые прайсы внесены</h1>
	`+ (checherror(ans) || `
		<p>
			Изменено: ${ans.count} ${words(ans.count, 'позиция', 'позиции', 'позиций')}
		</p>
	`)
export const set_tables_loadall = (ans) => `
	<h1>Новые данные внесены</h1>
	`+ (checherror(ans) || `
		<p>
			Внесено: ${ans.count} ${words(ans.count, 'строка', 'строки', 'строк')}
		</p>
	`)
export const set_applyall = (ans) => `
	<h1>Все изменения применены</h1>
	`+ (checherror(ans) || `
		<p>
			Загружены данные, прайсы, файлы
		</p>
	`)

const checherror = (ans) => ans.result ? '' : `
	<p>
		Ошибка ${ans.msg}
	</p>
`
export const msg = (ans) => `
	<p>
		${ans.msg}
	</p>
`
const run = (obj, call) => {
	const res = []
	for (const key in obj) res.push(call(obj[key], key))
	return res
}
export const set_prices_load = (ans, {div}) => `
	<h1>${ans.name}</h1>
	<style>
		#${div} table {
			font-size:12px
		}
		#${div} table td {
			max-width: 80px;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
	</style>
	`+ (checherror(ans) || `
		<p>
			Всего в прайсе: ${ans.row.count} ${words(ans.row.count, 'строка', 'строки', 'строк')}<br>
			Внесено: ${ans.row.quantity} ${words(ans.row.quantity, 'строка', 'строки', 'строк')}
		</p>
		${run(ans.row.omissions, excellist).join('')}
	`)
const excellist = (data, key) => `
	<h3>${key}</h3>
	<h4>Строки без связи</h4>
	<table>
		<tr><th>${data.head_titles.join('</th><th>')}</th></tr>
		${data.notconnected.map(table).join('')}
	</table>
	<h4>Строки без совпадений</h4>
	<table>
		<tr><th>${data.head_titles.join('</th><th>')}</th></tr>
		${data.notfinded.map(table).join('')}
	</table>
	<h4>Строки без изменений</h4>
	
	${run(data.emptyprops,(rows, name) => showprops(rows,name,data)).join('')}
	
`
const showprops = (rows, name, data) => `
	<h5>${name}</h5>
	<table>
		<tr><th>${data.head_titles.join('</th><th>')}</th></tr>
		${rows.map(table).join('')}
	</table>
`
const table = (row) => '<tr>'+row.map(cel => `<td>${cel === null ? '' : cel}</td>`).join('')+'</tr>'
export const set_tables_load = (ans) => `
	<h1>${ans.name}</h1>
	`+ (checherror(ans) || `
		<p>
			Внесено: ${ans.row.quantity} ${words(ans.row.quantity, 'строка', 'строки', 'строк')}
		</p>
	`)