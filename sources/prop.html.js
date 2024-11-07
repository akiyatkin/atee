import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"

export const ROOT = (data, env, entity = data.entity) => err(data, env, ["PROP"]) || `
	<div id="PROP"></div>
`
export const PROP = (data, env, prop = data.prop) => !data.result ? '' : `
	<div style="opacity:0.5; float:right">Свойство</div>
	<h1>${prop.prop_title}</h1>
	<table style="margin: 2em 0">
		<tr>
			<td>
				Сущность
			</td>
			<td>
				<a href="entity/${prop.entity_id}">${prop.entity_title}</a>
			</td>
			<td>Чтобы изменить сущность, создайте свойство у нужной сущности.</td>
		</tr>
		
		<tr>
			<td>
				Опубликовано
			</td>
			<td>
				${field.switch({
					action: '/-sources/set-prop-switch-prop', 
					value: prop.represent_prop, 
					values: {"":"Нет", "1":"Да"},
					args: {prop_id: prop.prop_id, propprop: 'represent_prop'}
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
					args: {prop_id: prop.prop_id, propprop: 'multi'}
				})}
			</td>
			<td>Несколько значений могут быть разделены запятой или считаться одним значением.</td>
		</tr>
		
		<tr>
			<td>Учтено</td>
			<td>
				${field.switch({
					action: '/-sources/set-prop-switch-prop', 
					value: prop.known, 
					values: {"":"Нет", "1":"Да"},
					args: {prop_id: prop.prop_id, propprop: 'known'}
				})}
			</td>
			<td>Старое название column. Учтённые свойства имеют своё специальное предназначение и в массив more не попадают.</td>
		</tr>
	</table>
	
	${showComment(data, env, prop)}
	<div style="display: flex; flex-wrap: wrap; gap: 0.5em 1em">
		<div style="flex-grow:1">
			${field.select({
				name: 'type',
				action: '/-sources/set-prop-type', 
				vname: 'type',
				tname: 'type',
				options: [{type:'value'},{type:'number'},{type:'date'},{type:'text'}],
				selected: prop,
				label:'Тип',
				args: {prop_id: prop.prop_id}
			})}
		</div>
		<div style="flex-grow:1">
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
	<p>
		Тип определяет способ хранения значений свойства для дальнейшей быстрой выборки. Самый оптимальный number, далее volume или date и самый затратный text.
	</p>
	
	
	<div style="margin:2em 0; display: flex; flex-wrap:wrap; gap: 1em; justify-content: flex-end">
		${field.button({
			label: 'Удалить', 
			confirm: 'Удалить свойство если нет данных с ним?',
			action: '/-sources/set-prop-delete',
			reloaddiv: env.layer.div,
			args: {prop_id: prop.prop_id},
			go: 'props/' + prop.entity_id
		})}
	</div>
	
`
const showComment = (data, env, prop) => `
	<div style="margin: 1em 0">
		${field.area({
			name: 'comment', 
			label: 'Комментарий', 
			action: '/-sources/set-prop-comment', 
			args: {prop_id: prop.prop_id},
			value: prop.comment
		})}
	</div>
`