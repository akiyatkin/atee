import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
import svg from "/-sources/svg.html.js"

export const ROOT = (data, env, entity = data.entity) => err(data, env, ["ENTITY"]) || `
	<div id="ENTITY"></div>
`
export const ENTITY = (data, env, entity = data.entity) => !data.result ? '' : `
	<div style="opacity:0.5; float:right">Сущность</div>
	<h1>${entity.entity_plural}</h1>
	<table style="margin: 2em 0">
		
		<tr>
			<td>Ключ</td>
			<td>
				${field.search({
					cls: 'a',
					search:'/-sources/get-entity-prop-search?entity_id=' + entity.entity_id,
					value: entity.prop_title || 'Не указано',
					label: 'Ключ сущности', 
					type: 'text',
					name: 'prop_id',
					find: 'prop_id',
					action: '/-sources/set-entity-prop',
					args: {entity_id: entity.entity_id},
					reloaddiv:'PROPS'
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
	${showInters(data, env, entity)}
`
const showInters = (data, env, entity) => {
	const masters = data.i_am_being_used.map(entity => showEntityLink(data, env, entity)).join(", ")
	return `
		<h2>Подключения</h2>
		<p>
			Какие сущности подключаются по каким-то свойствам, указывается как справочная информация.
			${masters ? entity.entity_plural + " подключены к <i>" + masters + "</i>" : "Другие сущности " + entity.entity_plural + " не подключают."}
		</p>
		<table>
			<thead>
				<tr>
					<td>По свойству</td>
					<td>Подключается</td>
					<td></td>
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
	`
}
const showTrInter = (data, env, entity, inter) => `
	<tr>
		
		<td>
			${field.search({
				cls: 'a',
				search:'/-sources/get-inter-prop-search?entity_id=' + entity.entity_id,
				value: showInterProp(inter), 
				label: 'Свойство с ключём', 
				type: 'text',
				name: 'prop_id',
				find: 'prop_id',
				action: '/-sources/set-inter-prop',
				args: {entity_id: inter.entity_id, id: entity.entity_id, old_id: inter.prop_id}
			})}
		</td>
		<td><a href="entity/${inter.entity_id}">${inter.entity_title}</a></td>
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
	<style>
		${env.scope} .ellipsis {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			max-width: 300px;
		}
	</style>
	<table draggable="false" class="list" style="margin: 2em 0">
		<thead>
			<tr>
				<td>Свойство</td>
				<td>Тип</td>
				<td>Значений</td>
				<td>Обработка</td>
				<td>Видимость</td>
				<td>Комментарий</td>
				<td></td>
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
			reloaddiv: 'PROPS',
			goid: 'prop_id'
		})}
	</div>
</p>
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
		<td style="${data.entity.prop_id == prop.prop_id ? 'font-weight:bold' : ''}">
			<a href="prop/${prop.prop_id}">${prop.prop_title}</a>
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
				action: '/-sources/set-prop-type',
				args: {prop_id: prop.prop_id}
			})}
			
		</td>
		<td>
			${field.switch({
				action: '/-sources/set-prop-switch-prop', 
				value: prop.multi, 
				values: {"":"Одно", "1":"Несколько"},
				args: {prop_id: prop.prop_id, propprop: 'multi'}
			})}
		</td>
		<td>
			${field.switch({
				action: '/-sources/set-prop-switch-prop', 
				value: prop.known, 
				values: {"":"Авто", "1":"Спец"},
				args: {prop_id: prop.prop_id, propprop: 'known'}
			})}
		</td>
		<td>
			${field.switch({
				action: '/-sources/set-prop-switch-prop', 
				value: prop.represent_prop, 
				values: {"":"Скрыто", "1":"Показано"},
				args: {prop_id: prop.prop_id, propprop: 'represent_custom_prop'}
			})}
		</td>
		<td>
			${field.prompt({
				cls: 'a ellipsis',
				name: 'comment', 
				type: 'text',
				label: 'Комментарий', 
				action: '/-sources/set-prop-comment', 
				args: {prop_id: prop.prop_id},
				input: prop.comment,
				value: prop.comment || '<span class="a mute">Написать</span>'
			})}
		</td>
		<td>
			${field.button({
				cls: 'transparent mute',
				label: svg.cross(), 
				confirm: 'Удалить свойство если нет данных с ним?',
				action: '/-sources/set-prop-delete',
				reloaddiv: env.layer.div,
				args: {prop_id: prop.prop_id},
				reloaddiv:'PROPS'
			})}
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