import { words } from "/-words/words.js"
export const set_files_loadall = (ans) => `
	<h1>Файлы привязаны</h1>
	`+ (checherror(ans) || `
		Связано: ${ans.count} ${words(ans.count, 'файл', 'файла', 'файлов')}<br>
		Дубликаты файлов: <br>${ans.doublepath?.join(', ')}
	`)

export const set_files_connectall = (ans) => `
	<h1>Файлы привязаны</h1>
	`+ (checherror(ans) || `
		Связано: ${ans.count} ${words(ans.count, 'файл', 'файла', 'файлов')}<br>
		Бесхозных: ${ans.free} ${words(ans.free, 'файл', 'файла', 'файлов')}<br>
	`)

export const set_files_indexall = (ans) => `
	<h1>Файлов в индексе</h1>
	`+ (checherror(ans) || `
		Всего: ${ans.count} ${words(ans.count, 'файл', 'файла', 'файлов')}<br>
		Дубликатов: ${ans.doublepath.length}<br>${ans.doublepath?.join(',<br>')}
	`)

export const set_models_reorder = (ans) => `
	<h1>Сортировка</h1>
	${msg(ans)}
`
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
			${ans.msg}
		</p>
		<blockquote>Быстрая ссылка для внесения новых данных<br><a href="/-showcase/set-load">${location.host}/-showcase/set-load</a></blockquote>
	`)

const checherror = (ans) => ans.result ? '' : `
	<p style="background-color: #ffdddd; padding:1rem">
		${ans.msg}
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
export const set_prices_load = (ans, env) => `
	<h1>${ans.name}</h1>
	<style>
		${env.scope} table {
			font-size:12px
		}
		${env.scope} table td {
			max-width: 140px;
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
		<pre>${JSON.stringify(ans.row.conf, null, "\t")}</pre>
	`)
const excellist = (data, key) => `
	<h3>Лист: ${key}</h3>
	<p>Успешно загружено строк: ${data.loadedrow}</p>
	${data.keyrepeated.length ? showRepeat(data, key) : ''}
	${data.notconnected.length ? showNotconected(data, key) : ''}
	${data.notfinded.length ? showNotfinded(data, key) : ''}
	${data.emptyprops.length ? showEmptyprops(data, key) : ''}
`
const showEmptyprops = (data, key) => `
	<h4>Ключи связи есть, совпадения есть, а менять нечего</h4>
	${run(data.emptyprops,(rows, name) => showprops(rows,name,data)).join('')}
`
const showNotfinded = (data, key) => `
	<h4>Ключи связи есть, а совпадений нет</h4>
	<table>
		<tr><th>${data.head_titles.join('</th><th>')}</th></tr>
		${data.notfinded.map(table).join('')}
	</table>
`
const showNotconected = (data, key) => `
	<h4>Строки без ключа связи</h4>
	<table>
		<tr><th>${data.head_titles.join('</th><th>')}</th></tr>
		${data.notconnected.map(table).join('')}
	</table>
`
const showRepeat = (data, key) => `
	<h4>Повторы ключей, применяется первое совпадение</h4>
	<table>
		<tr><th>${data.head_titles.join('</th><th>')}</th></tr>
		${data.keyrepeated.map(table).join('')}
	</table>
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
		${ans.msgs.length ? showmsgs(ans) : ''}
		
	`)
const showmsgs = ans => `
	<ul>
		<li>${ans.msgs.join('</li><li>')}</li>
	</ul>
`