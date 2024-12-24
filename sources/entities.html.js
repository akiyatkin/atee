import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
export const css = ['/-sources/revscroll.css']
export const ROOT = (data, env) => err(data, env) || `
	<h1>Сущности</h1>
	<div class="revscroll">
		<table draggable="false" class="list">
			<thead>
				<tr>
					<td>Сущности</td>
					<td>Ключ</td>
					<td>Источников</td>
					<td>Записей</td>
					<td>Опубликовано</td>
				</tr>
			</thead>
			<tbody draggable="false">
				${data.list.map(source => showTr(data, env, source)).join('')}
			</tbody>
		</table>
		${showScriptDrag(data, env)}
	</div>
	
	<div style="margin:2em 0; display: flex; flex-wrap:wrap; gap: 1em; justify-content: flex-end">
		${field.prompt({
			value: 'Создать сущность', 
			name: 'title',
			input: '',
			label: 'Название в ед.числе', 
			type: 'text', 
			action: '/-sources/set-entity-add', 
			go: 'entity/',
			goid: 'entity_id'
		})}
	</div>
`
const showTr = (data, env, entity) => `
	<tr class="item" data-id="${entity.entity_id}" style="white-space: nowrap;">
		<td>
			<a href="entity/${entity.entity_id}">${entity.entity_plural}</a>
		</td>
		<td>
			${entity.prop_title || ''}
		</td>
		<td>
			${entity.stat.sources.length && showSources(data, env, entity)}
		</td>
		<td>
			<a href="positions/${entity.entity_id}">${entity.stat.count_items}</a>
		</td>
		<td>
			${entity.stat.count_represent}
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