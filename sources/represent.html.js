import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
import words from "/-words/words.js"

const main = {}
main.prop = (data, env) => `Свойство`
main.col = (data, env, col = data.col, entity = data.entity, prop = data.prop, source = data.source) => `
	Колонке <b>${col.col_title}</b> соответствует свойство 
	${entity ? field.search({
		cls: 'a',
		search:'/-sources/get-col-prop-search?entity_id=' + entity.entity_id,
		value: prop.prop_title || 'Не указано',
		label: 'Выберите свойство', 
		type: 'text',
		name: 'prop_id',
		find: 'prop_id',
		action: '/-sources/set-col-prop',
		args: {source_id: source.source_id, sheet_index: col.sheet_index, col_index: col.col_index},
		reloaddiv:env.layer.conf.reloaddiv
	}) : 'Свойство не назначено, требуется сущность'}
	<script>
		(div => {
			const field = div.getElementsByClassName('field')[0]
			if (!field) return
			field.addEventListener('field-saved', async e => {
				const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
				Dialog.hide()
			})
		})(document.currentScript.previousElementSibling)
	</script>
`
main.row = (data, env, row = data.row) => `Строка ${row.row_index}`
main.cell = (data, env, cell = data.cell, prop = data.prop) => `
	<div style="color:red">${cell.pruning ? 'Значение в ячейке обрезано из-за выбранного типа' : ''}</div>
	<div>${!cell.represent ? 'Ячейка скрыта' : ''}</div>
	<div>${!cell.winner && cell.represent ? 'Значение заменено следующим подходящим значением' : ''}</div>
	<div style="color:darkgreen">${cell.winner ? 'Значение попадает в итоговые данные' : ''}</div>
	
	<div>${prop ? showTypeStat(data, env, prop, cell) : 'Тип не определён'}</div>
	<div style="font-weight:bold">${prop?.type == 'text' ? cell.text : (cell.number ?? '') + (cell.date ?? '') + (cell.value_title ?? '')}</div>
	
`
main.wtf = (data, env) => `Ошибочный выбор`

const showTypeStat = (data, env, prop, cell) => `
	Тип: ${prop.type}${prop.multi ? ', multi' : ''}${cell.multi_index_max > 0 ? ', указано ещё ' + cell.multi_index_max + ' ' + words(cell.multi_index_max, 'значение', 'значения', 'значений'): ''}
`
export const POPUP = (data, env) => err(data, env, []) || `
	<div style="margin-bottom:1em">
		${main[data.main](data, env)}
	</div>
	<table>
		<thead>
			<td></td><td></td><td>Индекс</td><td>Макс</td>
		</thead>
		<tbody>
			${showSourceTr(data)}
			${showEntityTr(data)}
			${showPropTr(data)}
			${showSheetTr(data)}
			${showColTr(data)}
			
			${showRowTr(data)}
			${showCellTr(data)}
			${showKeyTr(data)}
		</tbody>
	</table>
	
	
`
const showSourceTr = (data, env, source = data.source) => !source ? '' : `
	<tr>
		<td>Источник</td>
		<td><a href="source/${source.source_id}">${source.source_title}</a></td>
		<td></td><td></td>
	</tr>
`
const showEntityTr = (data, env, entity = data.entity) => !entity ? '' : `
	<tr>
		<td>Сущность</td>
		<td><a href="entity/${entity.entity_id}">${entity.entity_title}</a></td>
		<td></td><td></td>
	</tr>
`
const showPropTr = (data, env, prop = data.prop) => !prop ? '' : `
	<tr>
		<td>Свойство</td>
		<td><a href="prop/${prop.prop_id}">${prop.prop_title} (${prop.type})</a></td>
		<td></td>
		<td></td>
	</tr>
`
const showKeyTr = (data, env, key = data.key, row = data.row) => !key ? '' : `
	<tr>
		<td>Ключ строки</td>
		<td>${key.value_title}</td>
		<td>${row?.repeat_index}</td><td>${row?.repeat_index_max}</td>
	</tr>
`
const showRowTr = (data, env, key = data.key, row = data.row) => !row ? '' : `
	<tr>
		<td>Строка</td>
		<td></td>
		<td>${row?.row_index}</td><td>${row?.row_index_max}</td>
	</tr>
`
const showCellTr = (data, env, cell = data.cell) => !cell ? '' : `
	<tr>
		<td>Ячейка</td>
		<td>${cell.text}</td>
		<td>${cell.multi_index}</td><td>${cell.multi_index_max}</td>
	</tr>
`

const showColTr = (data, env, col = data.col) => !col ? '' : `
	<tr>
		<td>Колонка</td>
		<td>${col.col_title}</td>
		<td>${col.col_index}</td><td>${col.col_index_max}</td>
	</tr>
`
const showSheetTr = (data, env, sheet = data.sheet) => !sheet ? '' : `
	<tr>
		<td>Лист</td>
		<td><a href="sheet?source_id=${sheet.source_id}&sheet_index=${sheet.sheet_index}">${sheet.sheet_title}</a></td>
		<td>${sheet.sheet_index}</td><td>${sheet.sheet_index_max}</td>
	</tr>
`