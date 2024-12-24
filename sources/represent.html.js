import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
import words from "/-words/words.js"
import svg from "/-sources/svg.html.js"
export const css = ['/-sources/represent.css']
const main = {}
main.prop = (data, env) => ``
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
	<div>${!cell.winner && cell.represent ? 'Значение заменено другим подходящим значением' : ''}</div>
	<div>${cell.text === null ? 'Значение не указано (null), не влияет на другие значения' : ''}</div>
	<div>${cell.text === '' ? 'Указана пустая строка, затирает другие значения' : ''}</div>
	<div style="color:darkgreen">${cell.winner ? 'Значение попадает в итоговые данные' : ''}</div>
	
	<div>${prop ? showTypeStat(data, env, prop, cell) : 'Тип не определён'}</div>
	<div style="background: ${cell.winner ? '#eaf7d1': '#f5e6e6'}; padding:1em; margin: 1em 0">
		${prop?.type == 'text' ? cell.text : (cell.number ?? '') + (cell.date ?? '') + (cell.value_title ?? '')}
	</div>
	${data.cell ? showSummary(data, env) : ''}
	
`
main.sheet = (data, env) => `Выбран лист`
main.source = (data, env) => ``
main.wtf = (data, env) => `Ошибочный выбор`
main.entity = (data, env) => ``
main.item = (data, env) => `
	<table>
		${data.item.cells.map(variants => showItemVariants(data, env, variants)).join('')}
	</table>
	<script>
		(table => {
			table.addEventListener('click', async e => {
				const btn = e.target.closest('button')
				if (!btn) return
				const td = btn.parentElement
				const tr = td.parentElement
				const index = Array.from(tr.children).indexOf(td)
				if (!index) return
				const {multi_index} = btn.dataset
				const {source_id, sheet_index, row_index, col_index} = tr.dataset
				const represent = await import('/-sources/represent.js').then(r => r.default)

				represent.popup({source_id, sheet_index, col_index, row_index, multi_index}, '${env.layer.div}')
			})
		})(document.currentScript.previousElementSibling)
	</script>
`
const showItemVariants = (data, env, variants) => `
	${variants.map(variant => showItemVariantTr(data, env, variant)).join('')}
`
const showItemVariantTr = (data, env, variant) => `
	<tr data-source_id="${variant[0].source_id}" 
		data-sheet_index="${variant[0].sheet_index}" 
		data-row_index="${variant[0].row_index}" 
		data-col_index="${variant[0].col_index}" 
		style="${variant[0].winner ? '' : 'opacity:0.5'}">
		<td>${variant[0].prop_title}</td>
		<td>${variant.map(val => showItemVal(data, env, val)).join(', ')}</td>
	</tr>
`
const showItemVal = (data, env, cell) => `
	<button class="transparent" data-multi_index="${cell.multi_index}" style="${cell.pruning ? 'color:red':''}">${cell.text}</span>
`.trim()

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
	
	<h1>Видимость</h1>
	
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
	
	
	<script>
		(async div => {
			const represent = await import('/-sources/represent.js').then(r => r.default)
			const source_id = ${data.source?.source_id}
			const entity_id = ${data.entity?.entity_id}
			const key_id = ${data.item?.key_id ?? data.row?.key_id}
			const prop_id = ${data.prop?.prop_id}
			const value_id = ${data.value?.value_id}
			const sheet_title = ${JSON.stringify(data.sheet?.sheet_title)}
			const col_title = ${JSON.stringify(data.col?.col_title)}
			const multi_index = ${data.cell?.multi_index}
			const repeat_index = ${data.row?.repeat_index}
			for (const btn of div.getElementsByClassName('eye')) {
				btn.addEventListener('click', async () => {
					const name = btn.dataset.name
					if (!name) return
					const senditmsg = await import('/-dialog/senditmsg.js').then(r => r.default)

					let args
					if (name == 'represent_sheet') args = {source_id, sheet_title}
					else if (name == 'represent_sheets') args = {source_id}
					else if (name == 'represent_cols') args = {source_id}
					else if (name == 'represent_rows') args = {source_id}
					else if (name == 'represent_cells') args = {source_id}
					else if (name == 'represent_source') args = {source_id}
					else if (name == 'represent_col') args = {source_id, sheet_title, col_title}
					else if (name == 'represent_row') args = {source_id, sheet_title, key_id, repeat_index}
					else if (name == 'represent_cell') args = {source_id, sheet_title, col_title, key_id, repeat_index, multi_index}
					else if (name == 'represent_row_key') args = {source_id, sheet_title, key_id, repeat_index}
					else if (name == 'represent_entity') args = {entity_id}
					else if (name == 'represent_props') args = {entity_id}
					else if (name == 'represent_items') args = {entity_id}
					else if (name == 'represent_values') args = {entity_id}
					else if (name == 'represent_prop') args = {prop_id}
					else if (name == 'represent_item') args = {key_id, entity_id}
					else if (name == 'represent_value') args = {prop_id, value_id}
					else if (name == 'represent_item_key') args = {entity_id, key_id}
					else return alert('Нет обработчика')
					
					const data = await represent.set(btn, name, args)
					if (!data.result) return
					represent.reload()
				})
			}
		})(document.currentScript.parentElement)
	</script>
	<div style="max-width:500px">
		По умолчанию что-то скрывается у сомнительных источников (прайсов), когда нужно только что-то конкретное. Если по умолчанию всё показано, значит этот источник c надёжными данными.
	</div>
`
const representStatus = (bit) => `${bit ? '<span style="color:green">Показано</span>' : '<span style="color:red">Скрыто</span>'}`
const showSummary = (data, env) => `
	
	<table>
		<!-- <tr><td>Как значение свойства</td><td>${representStatus(data.cell.represent_text_summary)}</td><td>represent_text_summary</td></tr>
		<tr><td>Как значение ячейки</td><td>${representStatus(data.cell.represent_cell_summary)}</td><td>represent_cell_summary</td></tr> -->
		<tr><td>Видимость</td><td>${representStatus(data.cell.represent)}</td><td>represent</td></tr>
		<tr><td>Преимущество</td><td>${representStatus(data.cell.winner)}</td><td>winner</td></tr>
	</table>
`
const showItemKeyRepresentTr = (data, env) => `
	<tr><td>
			<button title="Изменить видимость значения ключа у позиции" 
			data-name="represent_item_key" class="eye transparent ${data.item.keycls?.main} ${data.item.keycls?.custom}">${svg.eye()}</button>
		</td><td>Ключ позиции</td><td>${data.item.value_title}</td>
		
		<td>represent_item_key</td>
	</tr>
`
const showRowRepresentTr = (data, env) => `
	<tr>
		<td>
			<button title="Изменить видимость строки" 
			data-name="represent_row" class="eye transparent ${data.row.cls?.main} ${data.row.cls?.custom}">${svg.eye()}</button>
		</td>
		<td>Строка <small>(${data.row.row_index}/${data.row.row_index_max})</small></td><td>${data.row.value_title || '<span style="color:red">Нет ключа</span>'}${data.row.repeat_index ? ' <small>(' + data.row.repeat_index + ')</small>' : ''}</td>
		
		<td>represent_row</td>
	</tr>
`
const showItemRepresentTr = (data, env) => `
	<tr>
		<td>
			<button title="Изменить видимость позиции" 
			data-name="represent_item" class="eye transparent ${data.item.cls?.main} ${data.item.cls?.custom}">${svg.eye()}</button>
		</td>
		<td>Позиция</td><td>${data.item.value_title} <small>(${data.item.key_id})</small></td>
		
		<td>represent_item</td>
	</tr>
`
const showValueRepresentTr = (data, env) => `
	<tr>
		<td>
			<button title="Изменить видимость всех таких значений" 
			data-name="represent_value" class="eye transparent ${data.value.cls?.main} ${data.value.cls?.custom}">${svg.eye()}</button>
		</td>
		<td>Значение</td><td>${data.value.value_title}</td>
		
		<td>represent_value</td>
	</tr>
`
const showPropRepresentTr = (data, env) => `
	<tr>
		<td>
			<button title="Изменить видимость свойства" 
			data-name="represent_prop" class="eye transparent ${data.prop.cls?.main} ${data.prop.cls?.custom}">${svg.eye()}</button>
		</td>
		<td>Свойство</td><td>${data.prop.prop_title}</td>
		
		<td>represent_prop</td>		
	</tr>
`
const showRowKeyRepresentTr = (data, env) => `
	<tr>
		<td>
			<button title="Изменить видимость ячейки с ключом строки" 
			data-name="represent_row_key" class="eye transparent ${data.row.key.cls?.main} ${data.row.key.cls?.custom}">${svg.eye()}</button>
		</td>
		<td>Ключ строки <small>(${data.sheet.key_index ?? '-'}/${data.col.col_index_max})</td><td>${data.row.key.value_title}${data.row.repeat_index ? ' <small>(' + data.row.repeat_index + ')</small>' : ''}</td>
		
		<td>represent_row_key</td>		
	</tr>
`
const showCellRepresentTr = (data, env) => `
	<tr>
		<td>
			<button title="Изменить видимость колонки" 
			data-name="represent_cell" class="eye transparent ${data.cell.cls?.main} ${data.cell.cls?.custom}">${svg.eye()}</button>
		</td>
		<td>Ячейка <small>(${data.col.col_index}/${data.col.col_index_max})</small></td><td>${data.cell.full_text}</td>
		
		<td>represent_cell</td>
	</tr>
`
const showColRepresentTr = (data, env) => `
	<tr>
		<td>
			<button title="Изменить видимость колонки" 
			data-name="represent_col" class="eye transparent ${data.col.cls.main} ${data.col.cls.custom}">${svg.eye()}</button>
		</td>
		<td>Колонка</td><td>${data.col.col_title}${!data.col.prop_title || data.col.col_title == data.col.prop_title ? '' : '(' + data.col.prop_title +')'}</a></td>
		
		<td>represent_col</td>
	</tr>
`
const showSheetRepresentTr = (data, env) => `
	<tr>
		<td>
			<button title="Изменить видимость листа" 
			data-name="represent_sheet" class="eye transparent ${data.sheet.cls.main} ${data.sheet.cls.custom}">${svg.eye()}</button>
		</td>
		<td>Лист</td><td><a href="sheet?source_id=${data.sheet.source_id}&sheet_index=${data.sheet.sheet_index}">${data.sheet.sheet_title}</a></td>
		
		<td>represent_sheet</td>
	</tr>
`
const showEntityRepresentTr = (data, env) => `
	<tr>
		<td>
			<button title="Изменить видимость сущности" data-name="represent_entity" 
			class="eye transparent represent-1 ${defcustom(data.entity.represent_entity)}">${svg.eye()}</button>
		</td>
		<td>Сущность</td><td><a href="source/${data.entity.entity_id}">${data.entity.entity_title}</a></td>
		<td>represent_entity</td>
	</tr>
	<tr>
		<td><button title="Видимость свойств по умолчанию" data-name="represent_props" 
			class="eye transparent ${represent(data.entity, ['entity'])} ${defcustom(data.entity.represent_props)}">${svg.eye()}</button></td>
		<td>Свойства</td><td>По умолчанию</td>
		
		<td>represent_props</td>
	</tr>
	<tr>
		<td><button title="Видимость позиций по умолчанию" data-name="represent_items" 
			class="eye transparent ${represent(data.entity, ['entity'])} ${defcustom(data.entity.represent_items)}">${svg.eye()}</button></td>
		<td>Позиции</td><td>По умолчанию</td>
		<td>represent_items</td>
	</tr>
	<tr>
		<td><button title="Видимость значений по умолчанию" data-name="represent_values" 
			class="eye transparent ${represent(data.entity, ['entity'])} ${defcustom(data.entity.represent_values)}">${svg.eye()}</button></td>
		<td>Значения</td><td>По умолчанию</td>		
		<td>represent_values</td>
	</tr>
`
const showSourceRepresentsTr = (data, env) => `
	<tr>
		<td>
			<button title="Изменить видимость источника" data-name="represent_source" 
			class="eye transparent represent-1 ${defcustom(data.source.represent_source)}">${svg.eye()}</button>
		</td>
		<td>Источник</td><td><a href="source/${data.source.source_id}">${data.source.source_title}</a></td>
		
		<td>represent_source</td>
	</tr>
	<tr>
		<td><button title="Видимость листов по умолчанию" data-name="represent_sheets" 
			class="eye transparent ${represent(data.source, ['source'])} ${defcustom(data.source.represent_sheets)}">${svg.eye()}</button></td>
		<td>Листы</td><td>По умолчанию</td>
		
		<td>represent_sheets</td>
	</tr>
	<tr>
		<td><button title="Видимость колонок по умолчанию" data-name="represent_cols" 
			class="eye transparent ${represent(data.source, ['source'])} ${defcustom(data.source.represent_cols)}">${svg.eye()}</button></td>
		<td>Колонки</td><td>По умолчанию</td>
		<td>represent_cols</td>
	</tr>
	<tr>
		<td><button title="Видимость строк по умолчанию" data-name="represent_rows" 
			class="eye transparent ${represent(data.source, ['source'])} ${defcustom(data.source.represent_rows)}">${svg.eye()}</button></td>
		<td>Строки</td><td>По умолчанию</td>
		<td>represent_rows</td>
	</tr>
	<tr>
		<td><button title="Видимость ячеек по умолчанию" data-name="represent_cells" 
			class="eye transparent ${represent(data.source, ['source'])} ${defcustom(data.source.represent_cells)}">${svg.eye()}</button></td>
		<td>Ячейки</td><td>По умолчанию</td>
		<td>represent_cells</td>
	</tr>
`











