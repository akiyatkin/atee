import { words } from "/-words/words.js"
export const set_files_loadall = (ans) => `
	Связано: ${ans.count} ${words(ans.count, 'файл', 'файла', 'файлов')}<br>
	Дубликаты файлов: <br>${ans.doublepath.join(', ')}
`
export const set_tables_clearall = (ans) => `
	${ans.msg}
`
export const set_prices_clearall = (ans) => `
	${ans.msg}
`

export const set_prices_loadall = (ans) => `
	Изменено: ${ans.count} ${words(ans.count, 'позиция', 'позиции', 'позиций')}
`
export const set_tables_loadall = (ans) => `
	Внесено: ${ans.count} ${words(ans.count, 'строка', 'строки', 'строк')}
`