import field from "/-dialog/field.html.js"
import date from "/-words/date.html.js"
import ago from "/-words/ago.html.js"
export const ROOT = (data, env, source = data.source) => `
	<h1>${source.source_title}</h1>
	${showComment(data, env, source)}
	${showStat(data, env, source)}
	${showButtons(data, env, source)}
	<h2>Данные</h2>
	${showTechButton(data, env, source)}
`
const showComment = (data, env, source) => `
	<p>
		${field.text({
			name: 'comment', 
			label: 'Комментарий', 
			action: '/-sources/set-source-comment', 
			args: {source: source.source_id},
			value: source.comment
		})}
	</p>
`
const showButtons = (data, env, source) => `
	<div style="margin:2em 0; display: flex; flex-wrap:wrap; gap: 1em;">
		${field.button({
			label: 'Проверить', 
			action: '/-sources/set-source-check',
			reloaddiv: env.layer.div,
			args: {source_id: source.source_id}
		})}

		${field.button({
			label: 'Загрузить', 
			action: '/-sources/set-source-load',
			reloaddiv: env.layer.div,
			args: {source_id: source.source_id}
		})}
		${field.button({
			label: 'Актуализировать', 
			action: '/-sources/set-source-renovate',
			reloaddiv: env.layer.div,
			args: {source_id: source.source_id}
		})}
	</div>
`
const showTechButton = (data, env, source) => `
	<div style="margin:2em 0; display: flex; flex-wrap:wrap; gap: 1em;">
		${field.button({
			label: 'Очистить', 
			confirm: 'Удалить данные, как будто источник не загружался. При следующей актуализации он снова загрузится?',
			action: '/-sources/set-source-clear',
			reloaddiv: env.layer.div,
			args: {source_id: source.source_id}
		})}
		${field.button({
			label: 'Удалить', 
			confirm: 'Удалить данные и все упоминания об источнике?',
			action: '/-sources/set-source-delete',
			reloaddiv: env.layer.div,
			args: {source_id: source.source_id}
		})}
	</div>
`
const showStat = (data, env, source) => `
	
	<table>
		<tr>
			<td>
				Актуализация
			</td>
			<td>
				${source.renovate}
			</td>
		</tr>
		<tr>
			<td>
				Публикация
			</td>
			<td>
				${source.represent}
			</td>
		</tr>
		<tr>
			<td>
				Проверка
			</td>
			<td>
				${date.dmyhi(source.date_check)}
			</td>
		</tr>
		<tr>
			<td>
				Изменения
			</td>
			<td>
				${date.dmyhi(source.date_mtime)}
			</td>
		</tr>
		<tr>
			<td>
				Загрузка
			</td>
			<td>
				${date.dmyhi(source.date_load)}
			</td>
			</tr>
		<tr>
			<td>
				Актуальность
			</td>
			<td>
				${date.dmy(source.date_content)}
			</td>
		</tr>
		<tr>
			<td>
				Контроль
			</td>
			<td>
				${field.prompt({
					value: date.dmy(source.date_exam), 
					cls: 'a',
					name: 'date',
					input: source.date_exam,
					ok: 'ОК', 
					label: 'Дата контроля', 
					descr: 'Проверен код источника, описаны типы колонок, синонимы, дата актуальности данных корректна.',
					type: 'date', 
					action: '/-sources/set-source-exam', 
					args: {source_id: source.source_id}, 
					reloaddiv: env.layer.div
				})}
			</td>
		</tr>
		<tr>
			<td>
				Данные по умолчанию
			</td>
			<td>
				${source.entity?.entity_plural || 'Не указано'}
			</td>
		</tr>
		<tr>
			<td>
				Ошибка
			</td>
			<td>
				${source.error}
			</td>
		</tr>
	</table>
`