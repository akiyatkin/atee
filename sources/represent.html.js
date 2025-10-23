import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
import words from "/-words/words.js"
import svg from "/-sources/svg.html.js"
import date from "/-words/date.html.js"
export const css = ['/-sources/represent.css','/-sources/revscroll.css']

//Обновление через check этим не пользуемся reloaddiv: env.layer.conf.reloaddiv
const main = {}
const tpl = main
main.head = {}
main.head.prop = (data, env) => ``
main.head.col = (data, env, col = data.col, entity = data.entity, prop = data.prop, source = data.source) => `
	Колонке <b>${col.col_title}</b> соответствует 
	<b>${field.search({
		cls: 'a',
		search:'/-sources/get-col-prop-search',
		value: prop.prop_title || 'Не указано',
		heading:"Свойство колонки",
		descr: "Имя колонки <b>" + col.col_title + "</b>",
		label: 'Выберите свойство', 
		type: 'text',
		name: 'prop_id',
		find: 'prop_id',
		action: '/-sources/set-col-prop',
		args: {source_id: source.source_id, sheet_index: col.sheet_index, col_index: col.col_index},
		global: 'check'
	})}</b>
	${prop ? showReadyProp(data, env, prop) : showFastProp(data, env)}
	
	<!-- <script>
		(div => {
			const fields = div.getElementsByClassName('field')
			for (const field of fields) {
				field.addEventListener('field-saved', async e => {
					const represent = await import('/-sources/represent.js').then(r => r.default)
		 			represent.reload()
				})
			}
		})(document.currentScript.parentElement)
	</script> -->
`
const showReadyProp = (data, env, prop) => `
	<div>
		${showType(data, env, prop)}
	</div>
	<div style="margin: 1em 0; white-space: pre; font-style: italic;">${prop.comment}</div>
`
const showFastProp = (data, env) => `
	<div style="margin-top:0.5em">
		<button>text</button>
		<button>value</button>
		<button>date</button>
		<button>number</button>
	</div>
	<script>
		(div => {
			for (const btn of div.getElementsByTagName('button')) {
				btn.addEventListener('click', async () => {
					const senditmsg = await import('/-dialog/senditmsg.js').then(r => r.default)
					const ans = await senditmsg(btn, '/-sources/set-col-prop-create', {
						source_id: ${data.source.source_id},
						sheet_index: ${data.sheet.sheet_index},
						col_index: ${data.col.col_index},
						type: btn.innerText,
						query: "${data.col.col_title}"
					})
					if (ans.result && !ans.msg) {
						const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
						Dialog.hide()
					}
				})
			}
		})(document.currentScript.previousElementSibling)
	</script>
`
const showScale = (data, env, prop) => `
	знаков после запятой ${field.prompt({
		heading:'Точность',
		value: prop.scale,
		input: prop.scale,
		cls: 'a',
		name: 'scale',
		label: 'Точность',
		type: 'number',
		descr: 'Сколько знаков после запятой для типа number',
		action: '/-sources/set-prop-scale', 
		args: {prop_id: prop.prop_id},
		global: 'check'
	})}, 
`
const showType = (data, env, prop) => !prop ? '' : `
	Тип ${field.setpop({
		heading:'Тип',
		cls: 'a',
		value: prop.type,
		name: 'type',
		descr: 'Тип определяет способ хранения значений для дальнейшей быстрой выборки. Самый оптимальный <b>number</b>, далее <b>date</b>, затем <b>volume</b> если повторяется и короче <b>127 символов</b>. И последний оригинальный вариант <b>text</b>. Для ключей и связей подходит только value.',
		action: '/-sources/set-prop-type', 
		values: {"number":"number", "date":"date", "value":"value", "text":"text"},
		args: {prop_id: prop.prop_id},
		global: 'check'
	})}, ${prop.type == 'number' ? showScale(data, env, prop) : ''}значений ${field.setpop({
		heading:'Значений',
		cls: 'a',
		value: prop.multi,
		name: 'bit',
		descr: 'Несколько значений могут быть разделены запятой с пробелом. При внесении данных запятую в значении можно заменить на <code>&amp;#44;</code> чтобы избежать разделения. Но при использовании данных надо выполнять обратную замену.',
		action: '/-sources/set-prop-prop', 
		values: {"":"одно", "1":"несколько"},
		args: {prop_id: prop.prop_id, propprop: 'multi'},
		global: 'check'
	})}, обработка ${field.setpop({
		heading:'Обработка свойства',
		cls: 'a',
		value: prop.known,
		name: 'known',
		descr: '<b>more</b> означает, что у свойства нет специальной обработки и оно покажется вместе со всеми такими свойствами в общем списке. Свойство со специальной обработкой <b>column</b> покажется только там, где его покажет программист, по умолчанию в интерфейсе нигде не покажется, но придёт с данными. Свойство <b>system</b> даже с данными не придёт и может быть использовано для технических обработок, например быть критерием групп.',
		action: '/-sources/set-known', 
		values: {"system":"🛡️ system", "more":"🟡 more", "column":"✅ column"},
		args: {prop_id: prop.prop_id},
		global: 'check'
	})}.
`
main.showRelations = (data, env) => `
	<!-- <table style="margin:1em 0">
		<tr><td>entity_id</td><td>prop_id</td><td>key_id</td></tr>
		<tr><td>БрендАрт</td><td>Категория</td><td>Ecola FC5310ECB</td></tr>
	</table> -->

	<table class="compact" style="margin:1em 0">
		<tr><td>Сущность</td><td>${data.entity?.prop_title || ''}</td><td>${data.entity?.prop_id || ''}</td></tr>
		<tr><td>Ключ</td><td>${data.key?.value_title || ''}</td><td>${data.key?.value_id || ''}</td></tr>
		<tr><td>Свойство</td><td>${data.prop?.prop_title || ''}</td><td>${data.prop?.prop_id || ''}</td></tr>
	</table>
	
	<table class="compact" style="margin:1em 0">
		<thead>
			<tr>
				<td>Источник</td>
				<td title="source_ordain"></td>
				<td>Лист</td>
				<td title="sheet_index"></td>
				<td title="row_index"></td>
				<td>Колонка</td>
				<td title="col_index"></td>
				<td>text</td>
			</tr>
		</thead>
		<tbody>
			${data.rels.map(rel => tpl.showRelTr(data, env, rel)).join('')}
		</tbody>	
	</table>
`
tpl.showRelTr = (data, env, rel) => `
	<tr style="${rel.winner ? 'background-color: #eaf7d1;': ''} ${rel.choice ? 'font-weight:bold;' : ''}">
		<td class="${rel.represent_source ? '' : 'mute'}">${rel.source_title}</td>
		<td class="${rel.represent_source ? '' : 'mute'}" title="ordain">${rel.ordain}</td>
		<td class="${rel.represent_sheet ? '' : 'mute'}"><a href="sheet?keyfilter=all&sheet_index=${rel.sheet_index}&search=${data.key ? data.key.value_nick : data.cell.text}&source_id=${rel.source_id}">${rel.sheet_title}</a></td>
		<td class="${rel.represent_sheet ? '' : 'mute'}" title="sheet_index">${rel.sheet_index}</td>
		<td class="${rel.represent_source && rel.represent_sheet ? '' : 'mute'}" title="row_index">${rel.row_index}</td>
		<td class="${rel.represent_col ? '' : 'mute'}">${rel.col_title}</td>
		<td class="${rel.represent_col ? '' : 'mute'}" title="col_index">${rel.col_index}</td>
		<td class="${rel.represent_source && rel.represent_col && rel.represent_sheet ? '' : 'mute'}">${rel.text}</td>
	</tr>
`
main.showOrig = (cell) => `
	<xmp readonly class="mute" style="white-space: pre-wrap; font-family: inherit; padding:1em; margin: 1em 0">${cell.text}</xmp>
`

main.head.row = (data, env, row = data.row) => `Строка ${row.row_index}`
main.head.cell = (data, env, cell = data.cell || {text: null}, prop = data.prop) => `
	<div style="color:red">${cell.pruning ? 'Значение в ячейке обрезано из-за выбранного типа' : ''}</div>
	<div>${!cell.represent ? 'Ячейка скрыта' : ''}</div>
	<div>${!cell.winner && cell.represent ? 'Значение заменено другим подходящим значением' : ''}</div>
	<div>${cell.text === null ? 'Значение не указано (null), не влияет на другие значения' : ''}</div>
	<div>${cell.text === '' ? 'Указана пустая строка, затирает другие значения' : ''}</div>
	<div style="color:darkgreen">${cell.winner ? 'Значение попадает в итоговые данные' : ''}</div>
	
	<div>${prop ? showTypeStat(data, env, prop, cell) : 'Не выбрано свойство колонки'}</div>
	${cell.pruning ? main.showOrig(cell) : ''}
	<div style="background: ${cell.winner ? '#eaf7d1': '#f5e6e6'}; padding:1em; margin: 1em 0" title="value_id: ${data.cell?.value_id || ''}">
		${!prop || prop.type == 'text' ? (cell.text ?? '') : (cell.number ? cell.number / 10 ** prop.scale : '') + (cell.date ?? '') + (cell.value_title ?? '')}
	</div>
	${data.cell ? main.showSummary(data, env) : ''}
	${data.rels ? main.showRelations(data, env) : ''}
	
`
main.head.sheet = (data, env) => `Выбран лист`
main.head.source = (data, env) => ``
main.head.wtf = (data, env) => `Ошибочный выбор`
main.head.entity = (data, env) => ``
main.head.item = (data, env) => `
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

// ${data.item ? showItemRepresentTr(data, env) : ''}
// ${data.row ? showRowRepresentTr(data, env) : ''}
// ${data.cell ? showCellRepresentTr(data, env) : ''}
// ${data.row?.key ? showRowKeyRepresentTr(data, env) : ''}
// ${data.value ? showValueRepresentTr(data, env) : ''}

export const POPUP = (data, env) => err(data, env, []) || `
	<div style="margin-bottom:1em">
		${main.head[data.main](data, env)}
	</div>
	
	<h1>Видимость</h1>
	
	<table>
		<tbody>

			${data.col ? showColRepresentTr(data, env) : ''}
			${data.prop ? showPropRepresentTr(data, env) : ''}
			${data.sheet ? showSheetRepresentTr(data, env) : ''}
			${data.entity ? showEntityRepresentTr(data, env) : ''}
			${data.source ? showSourceRepresentsTr(data, env) : ''}
			
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
			//const repeat_index = ${data.row?.repeat_index}
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
					//else if (name == 'represent_row') args = {source_id, sheet_title, key_id, repeat_index}
					//else if (name == 'represent_cell') args = {source_id, sheet_title, col_title, key_id, repeat_index, multi_index}
					//else if (name == 'represent_row_key') args = {source_id, sheet_title, key_id, repeat_index}
					else if (name == 'represent_entity') args = {entity_id}

					else if (name == 'represent_values') args = {entity_id}
					else if (name == 'represent_prop') args = {prop_id}
					else if (name == 'represent_item') args = {key_id, entity_id}
					else if (name == 'represent_value') args = {prop_id, value_id}
					
					else return alert('Нет обработчика')
					
					const data = await represent.set(btn, name, args)
					if (!data.result) return
					//represent.reload()
				})
			}
		})(document.currentScript.parentElement)
	</script>
	<div style="max-width:500px; margin-top:1em">
		Что-то скрывается у сомнительных источников. Например, всё скрыто и что-то выборочно показано или всё показано и что-то выборочно скрыто.
	</div>
`
const representStatus = (bit) => `${bit ? '<span style="color:green">Показано</span>' : '<span style="color:red">Скрыто</span>'}`
main.showSummary = (data, env) => `
	<table>
		<!-- <tr><td>Как значение свойства</td><td>${representStatus(data.cell.represent_item_summary)}</td><td>represent_item_summary</td></tr>
		<tr><td>Как значение ячейки</td><td>${representStatus(data.cell.represent_cell_summary)}</td><td>represent_cell_summary</td></tr> -->
		<tr><td>Мастер</td><td>${representStatus(data.cell.master)}</td><td>master</td></tr>
		<tr><td>Видимость</td><td>${representStatus(data.source.represent_source && data.sheet.represent_sheet && data.col.represent_col && data.prop.represent_prop && data.entity.represent_prop)}</td><td>represent</td></tr>
		<tr><td>Преимущество</td><td>${representStatus(data.cell.winner)}</td><td>winner</td></tr>
	</table>
`

// const showRowRepresentTr = (data, env) => `
// 	<tr>
// 		<td>
// 			<button title="Изменить видимость строки" 
// 			data-name="represent_row" class="eye transparent ${data.row.cls?.main} ${data.row.cls?.custom}">${svg.eye()}</button>
// 		</td>
// 		<td>Строка <small title="Индекс строки / Макс индекс">(${data.row.row_index}/${data.row.row_index_max})</small></td><td>${data.row.value_title || '<span style="color:red">Нет ключа</span>'}${data.row.repeat_index ? ' <small>(' + data.row.repeat_index + ')</small>' : ''}</td>
		
// 		<td>represent_row</td>
// 	</tr>
// `
// const showItemRepresentTr = (data, env) => `
// 	<tr>
// 		<td>
// 			<button title="Изменить видимость позиции" 
// 			data-name="represent_item" class="eye transparent ${data.item.cls?.main} ${data.item.cls?.custom}">${svg.eye()}</button>
// 		</td>
// 		<td>Позиция</td><td>${data.item.value_title} <small>(${data.item.key_id})</small></td>
		
// 		<td>represent_item</td>
// 	</tr>
// `
// const showValueRepresentTr = (data, env) => `
// 	<tr>
// 		<td>
// 			<button title="Изменить видимость всех таких значений" 
// 			data-name="represent_value" class="eye transparent ${data.value.cls?.main} ${data.value.cls?.custom}">${svg.eye()}</button>
// 		</td>
// 		<td>Значение</td><td>${data.value.value_title}</td>
		
// 		<td>represent_value</td>
// 	</tr>
// `
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
// const showRowKeyRepresentTr = (data, env) => `
// 	<tr>
// 		<td>
// 			<button title="Изменить видимость ячейки с ключом строки" 
// 			data-name="represent_row_key" class="eye transparent ${data.row.key.cls?.main} ${data.row.key.cls?.custom}">${svg.eye()}</button>
// 		</td>
// 		<td>Ключ строки <small title="Индекс колонки / Макс индекс">(${data.sheet.key_index ?? '-'}/${data.col.col_index_max})</td><td>${data.row.key.value_title}${data.row.repeat_index ? ' <small>(' + data.row.repeat_index + ')</small>' : ''}</td>
		
// 		<td>represent_row_key</td>		
// 	</tr>
// `
// const showCellRepresentTr = (data, env) => `
// 	<tr>
// 		<td>
// 			<button title="Изменить видимость колонки" 
// 			data-name="represent_cell" class="eye transparent ${data.cell.cls?.main} ${data.cell.cls?.custom}">${svg.eye()}</button>
// 		</td>
// 		<td>Ячейка <small title="Индекс колонки / Макс индекс">(${data.col.col_index}/${data.col.col_index_max})</small></td><td>${data.cell.full_text}</td>
		
// 		<td>represent_cell</td>
// 	</tr>
// `
const showColRepresentTr = (data, env) => `
	<tr>
		<td>
			<button title="Изменить видимость колонки" 
			data-name="represent_col" class="eye transparent ${data.col.cls.main} ${data.col.cls.custom}">${svg.eye()}</button>
		</td>
		<td>Колонка</td><td>
			${data.col.col_title}${!data.col.prop_title || data.col.col_title == data.col.prop_title ? '' : '(' + data.col.prop_title +')'}
			<div><code>${data.col.col_nick}</code></div>
		</td>
		
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
		<td>represent_prop</td>
	</tr>
	
	
`
// <tr>
// 		<td><button title="Видимость значений по умолчанию" data-name="represent_values" 
// 			class="eye transparent ${represent(data.entity, ['entity'])} ${defcustom(data.entity.represent_values)}">${svg.eye()}</button></td>
// 		<td>Значения</td><td>По умолчанию</td>		
// 		<td>represent_values</td>
// 	</tr>
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
	<!-- <tr>
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
	</tr> -->
`











