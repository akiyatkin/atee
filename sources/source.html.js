import field from "/-dialog/field.html.js"
import date from "/-words/date.html.js"
import ago from "/-words/ago.html.js"
import err from "/-controller/err.html.js"
export const css = ['/-sources/status.css']

export const ROOT = (data, env, source = data.source) => err(data, env) || `
	<h1>${source.source_title}</h1>
	<div id="SOURCE"></div>
`
export const SOURCE = (data, env, source = data.source) => `
	<div id="TOP"></div>
	${showButtons(data, env, source)}
	${showComment(data, env, source)}
	<div id="BOT"></div>
`
export const TOP = (data, env, source = data.source) => !data.result ? '' : `
	${source.date_start ? showScriptReload(data, env, source) : ''}
	${showStatus(data, env, source)}
	${showStat(data, env, source)}
`
export const BOT = (data, env, source = data.source) => !data.result ? '' : `
	${showDatas(data, env, source)}
	${showSettings(data, env, source)}
`


const showScriptReload = (data, env, source) => `
	<script>
		setTimeout(async () => {
			const Client = await window.getClient()
			Client.reloaddiv(['TOP','BOT'])
		}, 1000)
	</script>
`
const showDatas = (data, env, source) => `
	<h2>Содержание</h2>


`
const showComment = (data, env, source) => `
	<p>
		${field.area({
			name: 'comment', 
			label: 'Комментарий', 
			action: '/-sources/set-source-comment', 
			args: {source_id: source.source_id},
			value: source.comment
		})}
	</p>
`
const showButtons = (data, env, source) => `
	<div style="margin:2em 0; display: flex; flex-wrap:wrap; gap: 1em; align-items: center;">
		${field.button({
			label: 'Актуализировать', 
			action: '/-sources/set-source-renovate',
			reloaddiv: env.layer.div,
			args: {source_id: source.source_id}
		})}
	</div>
`
const showStatus = (data, env, source) => `
	<p class="status_${source.class}">
		${source.status}${source.date_start ? '...':'.'} <b>${ago.short(source.date_start)}</b>
	</p>
`
const showStat = (data, env, source) => `
	
	<table>
		<tr>
			<td>
				Актуализация
			</td>
			<td>
				${field.switch({
					action: '/-sources/set-source-switch-prop', 
					value: source.renovate, 
					values: {"":"Запрещена", "1":"Разрешена"},
					args: {source_id: source.source_id, sourceprop: 'renovate'}
				})}, ${source.need ? 'требуется': 'не требуется'}
			</td>
		</tr>
		
		
		<tr>
			<td>
				Опубликовано
			</td>
			<td>
				${field.switch({
					action: '/-sources/set-source-switch-prop', 
					value: source.represent_source, 
					values: {"":"Нет", "1":"Да"},
					args: {source_id: source.source_id, sourceprop: 'represent_source'}
				})}
			</td>
		</tr>
		
		<tr>
			<td>
				Ошибка
			</td>
			<td>
				${source.error || 'Нет'}
			</td>
		</tr>
		<tr>
			<td>
				Проверка
			</td>
			<td>
				${source.msg_check}
			</td>
		</tr>
		<tr>
			<td>
				Загрузка
			</td>
			<td>
				${source.msg_load}
			</td>
		</tr>
	</table>
	
`
const showSettings = (data, env, source = data.source) => `
	<h2>Управление</h2>
	<table>
		<tr>
			<td>
				Ревизия
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
				Проверка
			</td>
			<td>
				${date.dmyhi(source.date_check)} / ${ago.pass(source.duration_check)}
			</td>
		</tr>
		
		<tr>
			<td>
				Загрузка
			</td>
			<td>
				${date.dmyhi(source.date_load)} / ${ago.pass(source.duration_rest + source.duration_insert)}
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
				Актуальность
			</td>
			<td>
				${date.dmy(source.date_content)}
			</td>
		</tr>	
	</table>
	<div style="margin: 1em 0; display: grid; gap: 0.25em;">
		<div>Сущности ${field.search({
			cls: 'a',
			search:'/-sources/get-entity-search',
			value: source.entity_id ? showEntity(data, env, source) : 'не определено', 
			label: 'Название сущности', 
			type: 'text',
			name: 'entity_id',
			find: 'entity_id',
			action: '/-sources/set-source-entity',
			args: {source_id: source.source_id},
			reloaddiv: env.layer.div
		})}.</div>
		<div>
			Используется по умолчанию, если для листов не указано.
		</div>
	</div>
	<div style="margin: 1em 0; display: grid; gap: 0.25em;">
		<div>Источник ${field.switch({
			action: '/-sources/set-source-switch-prop', 
			value: source.dependent, 
			values: {"":"независимый", "1":"зависимый"},
			args: {source_id: source.source_id, sourceprop: 'dependent'}
		})}.
		</div>
		<div>
			Зависимость влияет на порядок загрузки при действиях проверить всё и актуализировать всё. 
			Зависимые источники загружаются в последнюю очередь 
			и могут анализировать загруженные перед ними данные из независимых источников.
		</div>
	</div>
	
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
			label: 'Очистить', 
			confirm: 'Удалить данные, как будто источник не загружался. При следующей актуализации он снова загрузится?',
			action: '/-sources/set-source-clear',
			reloaddiv: env.layer.div,
			args: {source_id: source.source_id}
		})}
		${field.prompt({
			value: 'Переименовать',
			input: source.source_title,
			type: 'text',
			name: 'title',
			label: 'Укажите имя файла', 
			action: '/-sources/set-source-title',
			reloaddiv: env.layer.div,
			args: {source_id: source.source_id}
		})}
		${field.button({
			label: 'Удалить', 
			confirm: 'Удалить данные и все упоминания об источнике, комментарии, настройки?',
			action: '/-sources/set-source-delete',
			reloaddiv: env.layer.div,
			args: {source_id: source.source_id},
			go: 'sources'
		})}
	</div>
`
const showEntity = (data, env, entity) => `
	${entity.entity_plural || entity.entity_title} (${entity.prop_title || 'ключ не определён'})
`
