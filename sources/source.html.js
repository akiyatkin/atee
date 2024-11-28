import field from "/-dialog/field.html.js"
import date from "/-words/date.html.js"
import ago from "/-words/ago.html.js"
import svg from "/-sources/svg.html.js"
import err from "/-controller/err.html.js"
import words from "/-words/words.js"
export const css = ['/-sources/status.css']

export const ROOT = (data, env, source = data.source) => err(data, env,['SOURCE']) || `
	<div style="opacity:0.5; float:right">Источник</div>
	<h1>${source.source_title}</h1>
	<div id="SOURCE"></div>
`
export const SOURCE = (data, env, source = data.source) => !data.result ? '' : `
	<div id="TOP"></div>
	${showButtons(data, env, source)}
	${showComment(data, env, source)}

	<div id="BOT"></div>
	${showControll(data, env, source)}
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
	<style>
		#MAIN {
			opacity: 0.8;
		}
	</style>
	<script>
		setTimeout(async () => {
			const Client = await window.getClient()
			Client.reloaddiv(['TOP','BOT'])
		}, 1000)
	</script>
`
const showDatas = (data, env, source) => `
	<h2>Содержание</h2>
	${source.date_load ? '' : showNoLoad(data, env, source)}
	<table>
		<tr>
			<td></td>
			<td>Лист</td>
			<td>Сущность</td>
			<td>Позиций</td>
			<td>Строк</td>
			<td></td>
		</tr>
		${data.sheets.map(sheet => showSheetTr(data, env, source, sheet)).join('')}
	</table>
	
`


const showSheetLink = (data, env, source, sheet) => `
	<a href="sheet?source_id=${source.source_id}&sheet_index=${sheet.loaded.sheet_index}">${sheet.sheet_title}</a>
`
const showChangeLink = (data, env, source, sheet) => `
	${field.prompt({
		value: sheet.sheet_title, 
		cls: 'a',
		name: 'title',
		input: sheet.sheet_title,
		ok: 'ОК', 
		label: 'Имя листа', 
		descr: 'Лист в загруженных данных не найден. Настройки видимости сохраняются по имени листа. Если в источнике лист был переименован, нужно переименовать и тут. Укажите имя нового листа.',
		type: 'text', 
		action: '/-sources/set-sheet-title', 
		args: {source_id: source.source_id, sheet_title: sheet.sheet_title}, 
		reloaddiv: env.layer.div
	})}
`
const showSheetTr = (data, env, source, sheet) => `
	<tr>
		<td>	
			<button title="Изменить видимость листа" class="eye transparent ${sheet.cls.main} ${sheet.cls.custom}">${svg.eye()}</button>
		</td>
		<td>
			${sheet.loaded ? showSheetLink(data, env, source, sheet).trim() : showChangeLink(data, env, source, sheet).trim()}
		</td>
		<td>
			${field.search({
				cls: 'a',
				search:'/-sources/get-sheet-entity-search',
				value: source.entity_id ? showEntity(data, env, sheet) : 'не определено', 
				label: 'Название сущности', 
				type: 'text',
				name: 'entity_id',
				find: 'entity_id',
				action: '/-sources/set-sheet-entity',
				args: {source_id: source.source_id, sheet_title: sheet.sheet_title},
				reloaddiv: env.layer.div
			})}
		</td>
		<td>${sheet.loaded?.count_keys ?? '&mdash;'}</td>
		<td>${sheet.loaded?.count_rows ?? '&mdash;'}</td>
		<td>
			<span class="remove" style="${!sheet.remove ? 'display:none' : 'display: block'}">
				${field.button({
					confirm:'Удалить все настройки пользователя у этого листа, его строк, колонок и ячеек?',
					cls:'transparent',
					label:svg.cross(),
					action:'/-sources/set-sheet-delete',
					args:{source_id: source.source_id, title: sheet.sheet_title},
					reloaddiv: env.layer.div
				})}
			</span>
		</td>
		<script>
			(div => {
				const btn = div.getElementsByClassName('eye')[0]
				const remove = div.getElementsByClassName('remove')[0]
				btn.addEventListener('click', async () => {
					const senditmsg = await import('/-dialog/senditmsg.js').then(r => r.default)
					const data = await senditmsg(btn, '/-sources/set-sheet-switch', {source_id: ${source.source_id}, sheet_title: ${JSON.stringify(sheet.sheet_title)}}) 
					if (!data.result) return
					btn.classList.remove('represent-1', 'represent-0', 'represent-custom-1', 'represent-custom-0', 'represent-def-0', 'represent-def-1')
					btn.classList.add(data.cls.main, data.cls.custom)
					remove.style.display = 'block'
				})
			})(document.currentScript.parentElement)
		</script>
	</tr>

`
const showStatLoad = (data, env, source) => `
	
`
const showNoLoad = (data, env, source) => `
	<p>Загрузки ещё не было. Выполните загрузку источника.</p>
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
				${source.msg_check || 'Нет сообщений'}
			</td>
		</tr>
		<tr>
			<td>
				Загрузка
			</td>
			<td>
				${source.msg_load || 'Нет сообщений'}
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
				${date.dmyhi(source.date_load)} / ${ago.pass(source.duration_rest)} + ${ago.pass(source.duration_insert)}
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
`
const showControll = (data, env, source) => `
	<div style="margin: 1em 0; display: grid; gap: 0.25em;">
		<div>Сущности ${field.search({
			cls: 'a',
			search:'/-sources/get-source-entity-search',
			value: source.entity_id ? showSourceEntity(data, env, source) : 'не определено', 
			label: 'Название сущности', 
			type: 'text',
			name: 'entity_id',
			find: 'entity_id',
			action: '/-sources/set-source-entity',
			args: {source_id: source.source_id},
			reloaddiv: env.layer.div
		})}.</div>
		<div>
			Используется по умолчанию, если для листов явно не указано.
		</div>
	</div>
	<div style="margin: 1em 0; display: grid; gap: 0.25em;">
		<div>
			Данные источника ${field.switch({
				action: '/-sources/set-source-switch-prop', 
				value: source.represent_source, 
				values: {"":"скрыты", "1":"опубликованы"},
				args: {source_id: source.source_id, sourceprop: 'represent_source'},
				reloaddiv:'BOT'
			})}.<br>
			По умолчанию листы ${field.switch({
				action: '/-sources/set-source-switch-prop', 
				value: source.represent_sheets, 
				values: {"":"скрыты", "1":"опубликованы"},
				args: {source_id: source.source_id, sourceprop: 'represent_sheets'},
				reloaddiv:'BOT'
			})}.<br>
			По умолчанию строки ${field.switch({
				action: '/-sources/set-source-switch-prop', 
				value: source.represent_rows, 
				values: {"":"скрыты", "1":"опубликованы"},
				args: {source_id: source.source_id, sourceprop: 'represent_rows'}
			})}.<br>
			По умолчанию колонки ${field.switch({
				action: '/-sources/set-source-switch-prop', 
				value: source.represent_cols, 
				values: {"":"скрыты", "1":"опубликованы"},
				args: {source_id: source.source_id, sourceprop: 'represent_cols'}
			})}.<br>
			По умолчанию ячейки ${field.switch({
				action: '/-sources/set-source-switch-prop', 
				value: source.represent_cells, 
				values: {"":"скрыты", "1":"опубликованы"},
				args: {source_id: source.source_id, sourceprop: 'represent_cells'}
			})}.
		</div>
		<div>
			Если всё новое скрыто, то этот источник сомнительный прайс, от него нужно только что-то конкретное. 
			Если всё видимо, значит этот источник c надёжными данными.
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
			Зависимость влияет на порядок загрузки при действии "актуализировать всё". 
			Зависимые источники загружаются в последнюю очередь 
			и могут анализировать загруженные перед ними данные из независимых источников.
		</div>
	</div>

	
	<div style="margin:2em 0; display: flex; flex-wrap:wrap; gap: 1em;">
		${field.button({
			label: 'Проверить', 
			action: '/-sources/set-source-check',
			reloaddiv: ['TOP','BOT'],
			args: {source_id: source.source_id}
		})}
		${field.button({
			label: 'Загрузить', 
			action: '/-sources/set-source-load',
			reloaddiv: ['TOP','BOT'],
			args: {source_id: source.source_id}
		})}
		${field.button({
			label: 'Очистить', 
			confirm: 'Удалить данные, как будто источник не загружался. При следующей актуализации он снова загрузится?',
			action: '/-sources/set-source-clear',
			reloaddiv: ['TOP','BOT'],
			args: {source_id: source.source_id}
		})}
		${field.prompt({
			value: 'Переименовать',
			input: source.source_title,
			type: 'text',
			name: 'title',
			label: 'Укажите имя файла', 
			action: '/-sources/set-source-title',
			reloaddiv: ['TOP','BOT'],
			args: {source_id: source.source_id}
		})}
		${field.button({
			label: 'Удалить', 
			confirm: 'Удалить данные и все упоминания об источнике, комментарии, настройки?',
			action: '/-sources/set-source-delete',
			reloaddiv: ['TOP','BOT'],
			args: {source_id: source.source_id},
			go: '../sources'
		})}
	</div>
`
const showEntity = (data, env, entity) => `
	<span class="${entity.custom?.entity_id ? '' : 'mute'}">
		${entity.entity_plural || entity.entity_title} (${entity.prop_title || 'ключ не определён'})
	</span>
`
const showSourceEntity = (data, env, source) => `
	${source.entity_plural || source.entity_title} (${source.prop_title || 'ключ не определён'})
`
