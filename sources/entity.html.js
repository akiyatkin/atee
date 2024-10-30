import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"

export const ROOT = (data, env, entity = data.entity) => err(data, env, ["ENTITY"]) || `
	<div id="ENTITY"></div>
`
export const ENTITY = (data, env, entity = data.entity) => !data.result ? '' : `
	<h1>Сущность: ${entity.entity_title}</h1>
	<table style="margin: 2em 0">
		<tr>
			<td>
				Опубликовано
			</td>
			<td>
				${field.switch({
					action: '/-sources/set-entity-switch-prop', 
					value: entity.represent_entity, 
					values: {"":"Нет", "1":"Да"},
					args: {entity_id: entity.entity_id, entityprop: 'represent_entity'}
				})}
			</td>
		</tr>
		<tr>
			<td>Ключевое свойство</td>
			<td>
				${field.search({
					cls: 'a',
					search:'/-sources/get-entity-prop-search',
					value: showProp(entity), 
					label: 'Ключ сущности', 
					type: 'text',
					name: 'prop_id',
					find: 'prop_id',
					action: '/-sources/set-entity-prop',
					args: {entity_id: entity.entity_id}
				})}
			</td>
		</tr>
		
	</table>
	${showComment(data, env, entity)}

	<div id="PROPS"></div>

	
	<div style="display: flex; flex-wrap: wrap; gap: 0.5em 1em; margin:2em 0">
		<div style="flex-grow:1;">
			${field.textok({
				value: entity.entity_title,
				type: 'text',
				name: 'title',
				label: 'Название ед.число', 
				action: '/-sources/set-entity-title',
				reloaddiv: env.layer.div,
				args: {entity_id: entity.entity_id}
			})}
		</div>
		<div style="flex-grow:1;">
			${field.textok({
				value: entity.entity_plural,
				type: 'text',
				name: 'title',
				label: 'Название мн.число', 
				action: '/-sources/set-entity-plural',
				reloaddiv: env.layer.div,
				args: {entity_id: entity.entity_id}
			})}
		</div>
	</div>
	
	
	<div style="margin:2em 0; display: flex; flex-wrap:wrap; gap: 1em; justify-content: flex-end">
		${field.button({
			label: 'Удалить сущность', 
			confirm: 'Удалить сущность со всеми упоминаниями, связями?',
			action: '/-sources/set-entity-delete',
			reloaddiv: env.layer.div,
			args: {entity_id: entity.entity_id},
			go: 'entities'
		})}
	</div>

`
export const PROPS = (data, env) => !data.result ? '' : `
	<table draggable="false" class="list" style="margin: 2em 0">
		<thead>
			<tr>
				<td>Свойство</td>
				<td>Тип</td>
				<td>Значений</td>
				<td>Учтено</td>
				<td>Опубликовано</td>
			</tr>
		</thead>
		<tbody draggable="false">
			${data.list.map(prop => showTr(data, env, prop)).join('')}
		</tbody>
	</table>
	${showScriptDrag(data, env)}
	<div style="margin:2em 0 4em; display: flex; flex-wrap:wrap; gap: 1em; justify-content: flex-end">
		${field.prompt({
			value: 'Создать свойство', 
			name: 'title',
			input: '',
			label: 'Название свойства', 
			type: 'text', 
			action: '/-sources/set-prop-create', 
			args: {entity_id: data.entity_id},
			go: 'prop/',
			goid: 'prop_id'
		})}
	</div>
`
const showScriptDrag = (data, env) => `
	<script>
		(async table => {
			const list = table.tBodies[0]
			const Drag = await import('/-note/theory/Drag.js').then(r => r.default)
			Drag.make(list, async ({id, next_id}) => {
				const senditmsg = await import('/-dialog/senditmsg.js').then(r => r.default)
				const ans = await senditmsg(list, '/-sources/set-prop-ordain', {id, next_id})
			})
		})(document.currentScript.previousElementSibling)
	</script>
`
const showTr = (data, env, prop) => `
	<tr class="item" data-id="${prop.prop_id}" style="white-space: nowrap;">
		<td>
			<a href="prop/${prop.prop_id}">${prop.prop_title}</a>
		</td>
		<td>
			${prop.type}
		</td>
		<td>
			${prop.multi ? 'Несколько' : 'Одно'}
		</td>
		<td>
			${prop.known ? 'Да' : 'Нет'}
		</td>
		<td>
			${prop.represent_prop ? 'Да' : 'Нет'}
		</td>
	</tr>
`
export const showProp = (entity) => !entity.prop_title ? 'Не указан' : `
	${entity.prop_title}
`
const showComment = (data, env, entity) => `
	<div style="margin: 1em 0">
		${field.area({
			name: 'comment', 
			label: 'Комментарий', 
			action: '/-sources/set-entity-comment', 
			args: {entity_id: entity.entity_id},
			value: entity.comment
		})}
	</div>
`