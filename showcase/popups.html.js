import { words } from "/-words/words.js"
export const set_files_loadall = (ans) => `
	<h1>Файлы привязаны</h1>
	${checherror(ans) || `
		Связано: ${ans.count} ${words(ans.count, 'файл', 'файла', 'файлов')}<br>
		Дубликаты файлов: <br>${ans.doublepath?.join(', ')}
	`}
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
	${checherror(ans) || `
		<p>
			Изменено: ${ans.count} ${words(ans.count, 'позиция', 'позиции', 'позиций')}
		</p>
	`}
`
export const set_tables_loadall = (ans) => `
	<h1>Новые данные внесены</h1>
	${checherror(ans) || `
		<p>
			Внесено: ${ans.count} ${words(ans.count, 'строка', 'строки', 'строк')}
		</p>
	`}
	
`
export const set_applyall = (ans) => `
	<h1>Все изменения применены</h1>
	${checherror(ans) || `
		<p>
			Загружены данные, прайсы, файлы
		</p>
	`}
	
`
const checherror = (ans) => ans.result ? '' : `
	<p>
		Ошибка ${ans.msg}
	</p>
`
const msg = (ans) => `
	<p>
		${ans.msg}
	</p>
`