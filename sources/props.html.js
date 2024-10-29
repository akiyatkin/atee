import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"

export const ROOT = (data, env) => err(data, env) || `
	<h1>Свойства</h1>
	<table draggable="false" class="list">
		<thead>
			<tr>
				<td>Свойство</td>
				<td>Тип</td>
				<td>Значений</td>
				<td>Известное</td>
				<td>Опубликовано</td>
			</tr>
		</thead>
		<tbody draggable="false">
			${data.list.map(prop => showTr(data, env, prop)).join('')}
		</tbody>
	</table>
	${showScriptDrag(data, env)}
	<div style="margin:2em 0; display: flex; flex-wrap:wrap; gap: 1em; justify-content: flex-end">
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
const showSources = (data, env, entity) => `
	<button class="a">${entity.stat.sources.length}</button>
	<script>
		(btn => {
			const sources = ${JSON.stringify(entity.stat.sources)}
			btn.addEventListener('click', async () => {
				const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
				

				Dialog.open({
					tpl:'${env.layer.tpl}',
					sub:'SOURCES',
					data: {sources}
				})

			})
		})(document.currentScript.previousElementSibling)
	</script>
`
export const SOURCES = (data, env) => `
	<div style="display: grid; gap: 0.25em">
		${data.sources.map(row => sourceItem(data, env, row))}
	</div>
`
const sourceItem = (data, env, source) => `
	<div><a href="source/${source.source_id}">${source.source_title}</a></div>
`
const showScriptDrag = (data, env) => `
	<script>
		(async table => {
			const list = table.tBodies[0]
			const Drag = await import('/-note/theory/Drag.js').then(r => r.default)
			Drag.make(list, async ({id, next_id}) => {
				const senditmsg = await import('/-dialog/senditmsg.js').then(r => r.default)
				const ans = await senditmsg(list, '/-sources/set-entity-ordain', {id, next_id})
			})
		})(document.currentScript.previousElementSibling)
	</script>
`