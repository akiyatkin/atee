import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
import date from "/-words/date.html.js"


export const ROOT = (data, env, entity = data.entity) => err(data, env, ["PROP"]) || `
	<div id="PROP"></div>
`
export const PROP = (data, env, prop = data.prop) => !data.result ? '' : `
	<div style="opacity:0.5; float:right">Свойство</div>
	<h1>${prop.prop_title}</h1>
	<table style="margin: 0em 0">
		<tr>
			<td>
				Сущность
			</td>
			<td>
				<a href="entity/${prop.entity_id}">${prop.entity_title}</a>
			</td>
			<td>Изменить сущность нельзя, создайте новое свойство у нужной сущности.</td>
		</tr>
		
		<tr>
			<td>
				Видимость
			</td>
			<td>
				${field.switch({
					action: '/-sources/set-prop-switch-prop', 
					value: prop.represent_prop, 
					values: {"":"Скрыто", "1":"Показано"},
					args: {prop_id: prop.prop_id, propprop: 'represent_custom_prop'},
					reloaddiv: env.layer.div
				})}
			</td>
			<td>
				Попадает или нет это свойство в итоговую выборку.
			</td>
		</tr>
		<tr>
			<td>
				Значений
			</td>
			<td>
				${field.switch({
					action: '/-sources/set-prop-switch-prop', 
					value: prop.multi, 
					values: {"":"Одно", "1":"Несколько"},
					reloaddiv: env.layer.div,
					args: {prop_id: prop.prop_id, propprop: 'multi'}
				})}
			</td>
			<td>Несколько значений могут быть разделены запятой с пробелом.</td>
		</tr>
		<tr>
			<td>
				Тип
			</td>
			<td>
				${field.search({
					cls: 'a',
					search:'/-sources/get-prop-type-search',
					value: prop.type, 
					descr: 'Тип определяет способ хранения значений для дальнейшей быстрой выборки. Самый оптимальный <b>number</b>, далее <b>date</b>, затем <b>volume</b> если повторяется и короче 63 символов. Самый затратный <b>text</b>.',
					label: 'Свойство с ключём', 
					type: 'text',
					name: 'type',
					find: 'type',
					reloaddiv: env.layer.div,
					action: '/-sources/set-prop-type',
					args: {prop_id: prop.prop_id}
				})}
			</td>
			<td>Для ключей и связей подходит только value не длинней 63 символов, number и date оптимальны, в других случаях text.</td>
		</tr>
		
		<tr>
			<td>Обработка</td>
			<td>
				${field.switch({
					action: '/-sources/set-prop-switch-prop', 
					value: prop.known, 
					values: {"":"Авто", "1":"Спец"},
					args: {prop_id: prop.prop_id, propprop: 'known'}
				})}
			</td>
			<td>Специальные свойства имеют своё предназначение и в массив more для автоматической обработки не попадают. Старое название column. </td>
		</tr>
	</table>
	<div style="display: flex; flex-wrap: wrap; gap:1em; align-items: center;">
		<div style="flex-grow:1">
			${showComment(data, env, prop)}
		</div>
		<div>
			${field.textok({
				value: prop.prop_title,
				type: 'text',
				name: 'title',
				label: 'Изменить регистр', 
				action: '/-sources/set-prop-title',
				reloaddiv: env.layer.div,
				args: {prop_id: prop.prop_id}
			})}
		</div>
	</div>

	<table>
		<thead>
			<tr>
				<td>Значение</td>
				<td>Видимость</td>
				<td>Перезаписано</td>
				<td>Количество</td>
				<td>date</td>
				<td>number</td>
				<td>value_title</td>
				<td>value_nick</td>
				<td>value_id</td>
			</tr>
		</thead>
		<tbody>
			${data.list.map(row => showValueTr(data, env, row)).join('')}
		</tbody>
	</table>
	<p>
		Всего: <b>${data.count}</b>, показано <b>${data.count > 1000 ? 1000 : data.count}</b>.
	</p>
`
const showValueTr = (data, env, row) => `
	<tr style="${row.pruning ? 'background: hsl(0, 100%, 97%)' : ''}">
		<td>${row.text}</td>
		<td>${row.represent ? '': 'Скрыто'}</td>
		<td>${row.winner ? '' : 'Перезаписано'}</td>
		<td>${row.count}</td>
		<td><nobr>${date.sdmyhi(row.date)}</nobr></td>
		<td>${parseFloat(row.number)}</td>
		<td>${row.value_title ?? ''}</td>
		<td>${row.value_nick ?? ''}</td>
		<td>${row.value_id ?? ''}</td>
	</tr>
`
const showComment = (data, env, prop) => `
	<div style="margin: 1em 0">
		${field.text({
			name: 'comment', 
			label: 'Комментарий', 
			action: '/-sources/set-prop-comment', 
			args: {prop_id: prop.prop_id},
			value: prop.comment
		})}
	</div>
`