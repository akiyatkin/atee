import field from "/-dialog/field.html.js"
import date from "/-words/date.html.js"
import ago from "/-words/ago.html.js"
import svg from "/-sources/svg.html.js"
import err from "/-controller/err.html.js"
import words from "/-words/words.js"
export const css = ['/-sources/represent.css']

export const ROOT = (data, env, source = data.source) => err(data, env,['SOURCE']) || `
	<div style="opacity:0.5; float:right">Источник</div>
	
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
	<h1>${source.source_title}</h1>
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
const defcustom = (value) => {
	if (value) return 'represent-def-1'
	else return 'represent-custom-0'
}
const showDatas = (data, env, source) => `
	<h2>Содержание</h2>
	${source.date_load ? '' : showNoLoad(data, env, source)}
	<table>
		<tr>
			<td>
				<button title="Изменить видимость источника" class="represent_sheets eye transparent represent-${data.source.represent_source} ${defcustom(data.source.represent_sheets)}">${svg.eye()}</button>
			</td>
			<td>Лист</td>
			<td>Сущность</td>
			<td>Позиций</td>
			<td>Строк</td>
			<td></td>
		</tr>
		<tbody>
			${data.sheets.map(sheet => showSheetTr(data, env, source, sheet)).join('')}
		</tbody>
	</table>
	<script>
		(div => {
			const name = 'represent_sheet'
			const remove = div.getElementsByClassName('remove')[0]
			const source_id = ${data.source.source_id}
			const titles = ${JSON.stringify(data.sheets.map(sheet => sheet.sheet_title))}
			for (const btn of div.getElementsByClassName(name)) {
				btn.addEventListener('click', async () => {
					const td = btn.closest('td')
					const tr = td.parentElement
					const tbody = tr.parentElement

					const represent = await import('/-sources/represent.js').then(r => r.default)
					const sheet_index = Array.from(tbody.children).indexOf(tr)
					const sheet_title = titles[sheet_index]
					const data = await represent.set(btn, name, {sheet_title, source_id})
					if (!data.result) return
					const Client = await window.getClient()
					remove.style.display = 'block'
					Client.reloaddiv('${env.layer.div}')
				})
			}
		})(document.currentScript.parentElement)
	</script>
	<script>
		(div => {
			const name = 'represent_sheets'
			const source_id = ${data.source.source_id}
			const btn = div.getElementsByClassName(name)[0]
			btn.addEventListener('click', async () => {
				const represent = await import('/-sources/represent.js').then(r => r.default)
				const data = await represent.set(btn, name, {source_id})
				if (!data.result) return
				const Client = await window.getClient()
				Client.reloaddiv('${env.layer.div}')
			})
		})(document.currentScript.parentElement)
	</script>
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
			<button title="Изменить видимость листа" class="represent_sheet eye transparent ${sheet.cls.main} ${sheet.cls.custom}">${svg.eye()}</button>
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
	<script>
		(div => {
			const field = div.querySelector('.field')
			if (!field) return
			const check = async () => {
				if (!div.closest('body')) return
				const data = await fetch('${env.layer.json}').then(r => r.json())
				if (!div.closest('body')) return
				if (data.source.comment != field.innerHTML) {
					alert('Комментарий был изменён на другой вкладке или другим пользователем, обновите страницу!')
				}
				setTimeout(check, 30000)
			}
			setTimeout(check, 30000)
		})(document.currentScript.previousElementSibling)
	</script>
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
	<div style="margin: 1em 0; display: grid; gap: 0.25em;">
		<div class="status_${source.class}">
			${source.status}${source.date_start ? '... ':''}<b>${ago.short(source.date_start)}</b>. Актуализация ${field.setpop({
				heading:'Актуализация',
				value: source.renovate,
				name: 'bit',
				descr: 'При актуализации проверяется дата обновления данных источника и если дата более свежая, то загрузится новая версия. Актуализация может выполняться автоматически по расписанию для всех источников с разрешённой актуализацией.',
				action: '/-sources/set-source-prop', 
				values: {"":"запрещена", "1":"разрешена"},
				args: {source_id: source.source_id, sourceprop: 'renovate'}
			})}.
		</div>
		<div>
			Актуальность <b>${date.ai(source.date_content) || 'не указана'}</b>. Ревизия администратора
			${field.prompt({
				value: date.ai(source.date_exam), 
				cls: 'a',
				name: 'date',
				input: source.date_exam,
				ok: 'ОК', 
				label: 'Дата контроля', 
				descr: 'Отметка администратор, когда была выполнена проверка источника. Проверен код обработчика, описаны типы колонок, синонимы, дата актуальности данных определяется корректно.',
				type: 'date', 
				action: '/-sources/set-source-exam', 
				args: {source_id: source.source_id}, 
				reloaddiv: env.layer.div
			})}.
		</div>
	</div>
	${source.error ? showError(data, env, source) : ''}
`
const showError = (data, env, source) => `
	<p style="background-color:${source.error ? '#f5e6e6' : '#eaf7d1'}">${source.error || 'Ошибок не было'}</p>
`
const showStat = (data, env, source) => `
	
	<table>
		<tr>
			<td>
				Сообщение get-check 
			</td>
			<td>${date.ai(source.date_check)}</td>
			<td>
				${source.msg_check || 'Нет сообщений'}
			</td>
			<td>${date.ai(source.date_mtime)}</td>
		</tr>
		<tr>
			<td>
				Сообщение get-load
			</td>
			<td>${date.ai(source.date_load)}</td>
			<td>
				 ${source.msg_load || 'Нет сообщений'}
			</td>
			<td>${date.ai(source.date_content)}</td>
		</tr>
	</table>
	
`
const showSettings = (data, env, source = data.source) => `
	<h2>Управление</h2>
	<table>
		
		
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
		<div>
			<span class="a">Настроить видимость</span>.
			<script>
				(btn => {
					btn.addEventListener('click', async () => {
						const represent = await import('/-sources/represent.js').then(r => r.default)
						represent.popup(${JSON.stringify({source_id: source.source_id})}, '${env.layer.div}')
					})
				})(document.currentScript.previousElementSibling)
			</script>
		</div>
		<div>
			Сущность ${field.search({
				cls: 'a',
				heading: 'Сущность по умолчанию',
				search:'/-sources/get-source-entity-search',
				value: source.entity_id ? showSourceEntity(data, env, source) : 'не определено', 
				label: 'Название сущности', 
				descr: 'Сущность применяется к данным на новых листах.',
				type: 'text',
				name: 'entity_id',
				find: 'entity_id',
				action: '/-sources/set-source-entity',
				args: {source_id: source.source_id},
				reloaddiv: env.layer.div
			})}.
		</div>
		
		<div>
			Источник 
			${field.setpop({
				heading:'Зависимость источника',
				value: source.dependent,
				name: 'bit',
				descr: 'Зависимость влияет на порядок загрузки при действии "актуализировать всё". Зависимые источники загружаются в последнюю очередь и могут анализировать загруженные перед ними данные из независимых источников.',
				action: '/-sources/set-source-prop', 
				values: {"":"независимый", "1":"зависимый"},
				args: {source_id: source.source_id, sourceprop: 'dependent'}
			})}.
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
