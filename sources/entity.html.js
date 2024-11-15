import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
import svg from "/-sources/svg.html.js"

export const ROOT = (data, env, entity = data.entity) => err(data, env, ["ENTITY"]) || `
	<div id="ENTITY"></div>
`
export const ENTITY = (data, env, entity = data.entity) => !data.result ? '' : `
	<div style="opacity:0.5; float:right">Сущность</div>
	<h1>${entity.entity_title}</h1>
	<table style="margin: 2em 0">
		
		<tr>
			<td>Ключевое свойство</td>
			<td>
				${field.search({
					cls: 'a',
					search:'/-sources/get-entity-prop-search',
					value: entity.prop_title || 'Не указано',
					label: 'Ключ сущности', 
					type: 'text',
					name: 'prop_id',
					find: 'prop_id',
					action: '/-sources/set-entity-prop',
					args: {entity_id: entity.entity_id}
				})}
			</td>
		</tr>
		<tr>
			<td>Подключена в</td>
			<td>
				${data.i_am_being_used.map(entity => showEntityLink(data, env, entity)).join(", ") || "Нет"}
			</td>
		</tr>
	</table>

	
	<table>
		<thead>
			<tr>
				<td>Подключает</td><td>Свойство</td><td></td>
			</tr>
		</thead>
		<tbody>
			${data.i_am_using.map(inter => showTrInter(data, env, entity, inter)).join('')}
		</tbody>
	</table>
	<div style="margin:2em 0 4em; display: flex; flex-wrap:wrap; gap: 1em; justify-content: flex-end">
		${field.search({
			search:'/-sources/get-entity-search',
			value: 'Добавить подкючение', 
			label: 'Выберите сущность', 
			type: 'text',
			name: 'entity_id',
			find: 'entity_id',
			action: '/-sources/set-entity-intersection',
			args: {id: entity.entity_id},
			reloaddiv: env.layer.div
		})}
	</div>
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
	<div style="margin: 1em 0; display: grid; gap: 0.25em;">
		<div>
			Сущности ${field.switch({
				action: '/-sources/set-entity-switch-prop', 
				value: entity.represent_entity, 
				values: {"":"скрыты", "1":"опубликованы"},
				args: {entity_id: entity.entity_id, entityprop: 'represent_entity'}
			})}.<br>
			По умолчанию позиции ${field.switch({
				action: '/-sources/set-entity-switch-prop', 
				value: entity.represent_items, 
				values: {"":"скрыты", "1":"опубликованы"},
				args: {entity_id: entity.entity_id, entityprop: 'represent_items'}
			})}.
			<br>
			По умолчанию свойства ${field.switch({
				action: '/-sources/set-entity-switch-prop', 
				value: entity.represent_props, 
				values: {"":"скрыты", "1":"опубликованы"},
				args: {entity_id: entity.entity_id, entityprop: 'represent_props'}
			})}.
			<br>
			По умолчанию значения ${field.switch({
				action: '/-sources/set-entity-switch-prop', 
				value: entity.represent_values, 
				values: {"":"скрыты", "1":"опубликованы"},
				args: {entity_id: entity.entity_id, entityprop: 'represent_values'}
			})}.
			

			
		</div>
	</div>

`
const showTrInter = (data, env, entity, inter) => `
	<tr>
		<td><a href="entity/${inter.entity_id}">${inter.entity_title}</a></td>
		<td>
			${field.search({
				cls: 'a',
				search:'/-sources/get-inter-prop-search',
				value: showInterProp(inter), 
				label: 'Свойство с ключём', 
				type: 'text',
				name: 'prop_id',
				find: 'prop_id',
				action: '/-sources/set-inter-prop',
				args: {entity_id: inter.entity_id, id: entity.entity_id}
			})}
		</td>
		<td>
			${field.button({
				cls:"a",
				label: svg.cross(), 
				confirm: 'Удалить связь с дополнением?',
				action: '/-sources/set-inter-delete',
				reloaddiv: env.layer.div,
				args: {entity_id: inter.entity_id, id: entity.entity_id}
			})}
		</td>
	</tr>
`
const showEntityLink = (data, env, entity) => `<a href="entity/${entity.entity_id}">${entity.entity_title}</a>`
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
export const showInterProp = (entity) => `
	${entity.prop_title} ${entity.multi ? '(несколько значений)' : '(одно значение)'}
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