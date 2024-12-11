import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
import words from "/-words/words.js"
import svg from "/-sources/svg.html.js"
export const css = ['/-sources/represent.css']
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
	${prop.prop_title}: ${prop.type}${prop.multi ? ', multi' : ''}${cell.multi_index_max > 0 ? ', указано ещё ' + cell.multi_index_max + ' ' + words(cell.multi_index_max, 'значение', 'значения', 'значений'): ''}
`
const represent = (source, list) => {
	if (list.some(name => {
		const rep = 'represent_' + name
		return !source[rep]
	})) {
		return 'represent-0'
	} else {

		return 'represent-1'
	}
}
const defcustom = (value) => {
	if (value) return 'represent-def-1'
	else return 'represent-custom-0'
}
export const POPUP = (data, env) => err(data, env, []) || `
	<div style="margin-bottom:1em">
		${main[data.main](data, env)}
	</div>
	<div style="display: grid">
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
		<h2>Видимость</h2>
		<table>
			<tbody>
				${data.source ? showSourceRepresentsTr(data, env) : ''}
				${data.sheet ? showSheetRepresentTr(data, env) : ''}
				${data.col ? showColRepresentTr(data, env) : ''}
				${data.row ? showRowRepresentTr(data, env) : ''}
				${data.cell ? showCellRepresentTr(data, env) : ''}
				${data.row?.key ? showRowKeyRepresentTr(data, env) : ''}
				${data.entity ? showEntityRepresentTr(data, env) : ''}
				${data.prop ? showPropRepresentTr(data, env) : ''}
				${data.item ? showItemRepresentTr(data, env) : ''}
				${data.value ? showValueRepresentTr(data, env) : ''}
				${data.item ? showItemKeyRepresentTr(data, env) : ''}
				
				
			</tbody>
		</table>
		${data.cell ? showSummary(data, env) : ''}
		
		<script>
			(async div => {
				const represent = await import('/-sources/represent.js').then(r => r.default)
				const source_id = ${data.source?.source_id}
				const entity_id = ${data.entity?.entity_id}
				const key_id = ${data.item?.key_id}
				const prop_id = ${data.prop?.prop_id}
				const value_id = ${data.value?.value_id}
				const sheet_index = ${data.sheet?.sheet_index}
				const col_index = ${data.col?.col_index}
				const row_index = ${data.row?.row_index}
				const multi_index = ${data.cell?.multi_index}
				for (const btn of div.getElementsByClassName('eye')) {
					btn.addEventListener('click', async () => {
						const name = btn.dataset.name
						if (!name) return
						const senditmsg = await import('/-dialog/senditmsg.js').then(r => r.default)

						let args
						if (name == 'represent_sheet') args = {source_id, sheet_index}
						else if (name == 'represent_sheets') args = {source_id}
						else if (name == 'represent_cols') args = {source_id}
						else if (name == 'represent_rows') args = {source_id}
						else if (name == 'represent_cells') args = {source_id}
						else if (name == 'represent_source') args = {source_id}
						else if (name == 'represent_col') args = {source_id, sheet_index, col_index}
						else if (name == 'represent_row') args = {source_id, sheet_index, row_index}
						else if (name == 'represent_cell') args = {source_id, sheet_index, col_index, row_index, multi_index}
						else if (name == 'represent_row_key') args = {source_id, sheet_index, row_index}
						else if (name == 'represent_entity') args = {entity_id}
						else if (name == 'represent_props') args = {entity_id}
						else if (name == 'represent_items') args = {entity_id}
						else if (name == 'represent_values') args = {entity_id}
						else if (name == 'represent_prop') args = {prop_id}
						else if (name == 'represent_item') args = {key_id, entity_id}
						else if (name == 'represent_value') args = {prop_id, value_id}
						else if (name == 'represent_item_key') args = {entity_id, key_id}
						else return alert('Нет обработчика')
						
						const data = await senditmsg(btn, '/-sources/set-' + name, args) 
						if (!data.result) return
						btn.classList.remove('represent-1', 'represent-0', 'represent-custom-1', 'represent-custom-0', 'represent-def-0', 'represent-def-1')
						btn.classList.add(data.cls.main, data.cls.custom)
						
						represent.reload()
					})
				}
			})(document.currentScript.parentElement)
		</script>
	</div>
	
`
const representStatus = (bit) => `${bit ? '<span style="color:green">Показано</span>' : '<span style="color:red">Скрыто</span>'}`
const showSummary = (data, env) => `
	<h3>Итого значение</h3>
	${data.cell.text}
	<table style='margin-top:1em'>
		<tr><td>У свойства</td><td>${representStatus(data.cell.represent_text_summary)}</td><td>represent_text_summary</td></tr>
		<tr><td>В ячейке</td><td>${representStatus(data.cell.represent_cell_summary)}</td><td>represent_cell_summary</td></tr>
		<tr><td>Итого</td><td>${representStatus(data.cell.represent)}</td><td>represent</td></tr>
		<tr><td>Преимущество</td><th>${representStatus(data.cell.winner)}</th><td>winner</td></tr>
	</table>
`
const showItemKeyRepresentTr = (data, env) => `
	<tr><td>Ключ позиции</td><td>${data.item.value_title}</td>
		<td>
			<button title="Изменить видимость значения ключа у позиции" 
			data-name="represent_item_key" class="eye transparent ${data.item.keycls?.main} ${data.item.keycls?.custom}">${svg.eye()}</button>
		</td>
		<td>represent_item_key</td>
	</tr>
`
const showRowRepresentTr = (data, env) => `
	<tr>
		<td>Строка <small>(${data.row.row_index}/${data.row.row_index_max})</small></td><td>${data.row.value_title}${data.row.repeat_index ? ' <small>(' + data.row.repeat_index + ')</small>' : ''}</td>
		<td>
			<button title="Изменить видимость строки" 
			data-name="represent_row" class="eye transparent ${data.row.cls?.main} ${data.row.cls?.custom}">${svg.eye()}</button>
		</td>
		<td>represent_row</td>
	</tr>
`
const showItemRepresentTr = (data, env) => `
	<tr>
		<td>Позиция</td><td>${data.item.value_title} <small>(${data.item.key_id})</small></td>
		<td>
			<button title="Изменить видимость позиции" 
			data-name="represent_item" class="eye transparent ${data.item.cls?.main} ${data.item.cls?.custom}">${svg.eye()}</button>
		</td>
		<td>represent_item</td>
	</tr>
`
const showValueRepresentTr = (data, env) => `
	<tr>
		<td>Значение</td><td>${data.value.value_title}</td>
		<td>
			<button title="Изменить видимость всех таких значений" 
			data-name="represent_value" class="eye transparent ${data.value.cls?.main} ${data.value.cls?.custom}">${svg.eye()}</button>
		</td>
		<td>represent_value</td>
	</tr>
`
const showPropRepresentTr = (data, env) => `
	<tr>
		<td>Свойство</td><td>${data.prop.prop_title}</td>
		<td>
			<button title="Изменить видимость свойства" 
			data-name="represent_prop" class="eye transparent ${data.prop.cls?.main} ${data.prop.cls?.custom}">${svg.eye()}</button>
		</td>
		<td>represent_prop</td>		
	</tr>
`
const showRowKeyRepresentTr = (data, env) => `
	<tr>
		<td>Ключ строки <small>(${data.sheet.key_index ?? '-'}/${data.col.col_index_max})</td><td>${data.row.key.value_title}${data.row.repeat_index ? ' <small>(' + data.row.repeat_index + ')</small>' : ''}</td>
		<td>
			<button title="Изменить видимость ячейки с ключом строки" 
			data-name="represent_row_key" class="eye transparent ${data.row.key.cls?.main} ${data.row.key.cls?.custom}">${svg.eye()}</button>
		</td>
		<td>represent_row_key</td>		
	</tr>
`
const showCellRepresentTr = (data, env) => `
	<tr>
		<td>Ячейка <small>(${data.col.col_index}/${data.col.col_index_max})</small></td><td>${data.cell.full_text}</td>
		<td>
			<button title="Изменить видимость колонки" 
			data-name="represent_cell" class="eye transparent ${data.cell.cls?.main} ${data.cell.cls?.custom}">${svg.eye()}</button>
		</td>
		<td>represent_cell</td>
	</tr>
`
const showColRepresentTr = (data, env) => `
	<tr>
		<td>Колонка</td><td>${data.col.col_title}${!data.col.prop_title || data.col.col_title == data.col.prop_title ? '' : '(' + data.col.prop_title +')'}</a></td>
		<td>
			<button title="Изменить видимость колонки" 
			data-name="represent_col" class="eye transparent ${data.col.cls.main} ${data.col.cls.custom}">${svg.eye()}</button>
		</td>
		<td>represent_col</td>
	</tr>
`
const showSheetRepresentTr = (data, env) => `
	<tr>
		<td>Лист</td><td><a href="sheet?source_id=${data.sheet.source_id}&sheet_index=${data.sheet.sheet_index}">${data.sheet.sheet_title}</a></td>
		<td>
			<button title="Изменить видимость листа" 
			data-name="represent_sheet" class="eye transparent ${data.sheet.cls.main} ${data.sheet.cls.custom}">${svg.eye()}</button>
		</td>
		<td>represent_sheet</td>
	</tr>
`
const showEntityRepresentTr = (data, env) => `
	<tr>
		<td>Сущность</td><td><a href="source/${data.entity.entity_id}">${data.entity.entity_title}</a></td>
		<td>
			<button title="Изменить видимость сущности" data-name="represent_entity" 
			class="eye transparent represent-1 ${defcustom(data.entity.represent_entity)}">${svg.eye()}</button>
		</td>
		<td>represent_entity</td>
	</tr>
	<tr>
		<td>Свойства</td><td>По умолчанию</td>
		<td><button title="Видимость свойств по умолчанию" data-name="represent_props" 
			class="eye transparent ${represent(data.entity, ['entity'])} ${defcustom(data.entity.represent_props)}">${svg.eye()}</button></td>
		<td>represent_props</td>
	</tr>
	<tr>
		<td>Позиции</td><td>По умолчанию</td>
		<td><button title="Видимость позиций по умолчанию" data-name="represent_items" 
			class="eye transparent ${represent(data.entity, ['entity'])} ${defcustom(data.entity.represent_items)}">${svg.eye()}</button></td>
		<td>represent_items</td>
	</tr>
	<tr>
		<td>Значения</td><td>По умолчанию</td>
		<td><button title="Видимость значений по умолчанию" data-name="represent_values" 
			class="eye transparent ${represent(data.entity, ['entity'])} ${defcustom(data.entity.represent_values)}">${svg.eye()}</button></td>
		<td>represent_values</td>
	</tr>
`
const showSourceRepresentsTr = (data, env) => `
	<tr>
		<td>Источник</td><td><a href="source/${data.source.source_id}">${data.source.source_title}</a></td>
		<td>
			<button title="Изменить видимость источника" data-name="represent_source" 
			class="eye transparent represent-1 ${defcustom(data.source.represent_source)}">${svg.eye()}</button>
		</td>
		<td>represent_source</td>
	</tr>
	<tr>
		<td>Листы</td><td>По умолчанию</td>
		<td><button title="Видимость листов по умолчанию" data-name="represent_sheets" 
			class="eye transparent ${represent(data.source, ['source'])} ${defcustom(data.source.represent_sheets)}">${svg.eye()}</button></td>
		<td>represent_sheets</td>
	</tr>
	<tr>
		<td>Колонки</td><td>По умолчанию</td>
		<td><button title="Видимость колонок по умолчанию" data-name="represent_cols" 
			class="eye transparent ${represent(data.source, ['source'])} ${defcustom(data.source.represent_cols)}">${svg.eye()}</button></td>
		<td>represent_cols</td>
	</tr>
	<tr>
		<td>Строки</td><td>По умолчанию</td>
		<td><button title="Видимость строк по умолчанию" data-name="represent_rows" 
			class="eye transparent ${represent(data.source, ['source'])} ${defcustom(data.source.represent_rows)}">${svg.eye()}</button></td>
		<td>represent_rows</td>
	</tr>
	<tr>
		<td>Ячейки</td><td>По умолчанию</td>
		<td><button title="Видимость ячеек по умолчанию" data-name="represent_cells" 
			class="eye transparent ${represent(data.source, ['source'])} ${defcustom(data.source.represent_cells)}">${svg.eye()}</button></td>
		<td>represent_cells</td>
	</tr>
`




const showSourceTr = (data, env, source = data.source) => !source ? '' : `
	<tr>
		<td>Источник</td>
		<td></td>
		<td></td>
		<td></td>
	</tr>
`
const showEntityTr = (data, env, entity = data.entity) => !entity ? '' : `
	<tr>
		<td>Сущность</td>
		<td><a href="entity/${entity.entity_id}">${entity.entity_title}</a></td>
		<td></td>
		<td></td>
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
const showKeyTr = (data, env, key = data.row.key, row = data.row) => !key ? '' : `
	<tr>
		<td>Ключ строки</small></td>
		<td>${key.value_title}</td>
		<td>${row?.repeat_index}</td>
		<td>${row?.repeat_index_max}</td>
	</tr>
`
const showRowTr = (data, env, key = data.row.key, row = data.row) => !row ? '' : `
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
		<td></td>
		<td>${sheet.sheet_index}</td><td>${sheet.sheet_index_max}</td>
	</tr>
`