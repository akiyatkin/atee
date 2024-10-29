import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"

export const ROOT = (data, env, entity = data.entity) => err(data, env, ["ENTITY"]) || `
	<div id="ENTITY"></div>
`
export const ENTITY = (data, env, entity = data.entity) => !data.result ? '' : `
	<h1>${entity.entity_title}</h1>
	<div style="margin: 2em 0">
		<a href="props/${entity.entity_id}">Свойства</a>
	</div>
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
	
	<div style="max-width: 600px;">
		${showComment(data, env, entity)}
		<div style="display: flex; flex-wrap: wrap; gap: 0.5em 1em">
			<div style="flex-grow:1">
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
			<div style="flex-grow:1">
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
				label: 'Удалить', 
				confirm: 'Удалить сущность со всеми упоминаниями, связями?',
				action: '/-sources/set-entity-delete',
				reloaddiv: env.layer.div,
				args: {entity_id: entity.entity_id},
				go: 'entities'
			})}
		</div>
	</div>
`
export const showProp = (entity) => !entity.prop_title ? 'Не указан' : `
	${entity.prop_title} <span style="${entity.type == 'text' ? 'color:red' : ''}">(${entity.type})</span>
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