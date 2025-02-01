import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
import svg from "/-sources/svg.html.js"
export const css = ['/-sources/represent.css','/-sources/revscroll.css']
const defcustom = (value) => {
	if (value) return 'represent-def-1'
	else return 'represent-custom-0'
}
export const ROOT = (data, env) => `
	<h1>Свойства</h1>
	<div id="TABLE"></div>
`
export const TABLE = (data, env) => err(data, env) || `
	<style>
		${env.scope} .ellipsis {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			max-width: 300px;
		}
	</style>
	<div class="revscroll" style="margin: 2em 0">
		<table draggable="false" class="list">
			<thead>
				<tr>
					<td>
						
					</td>
					<td>Свойство</td>
					<td>Тип</td>
					<td>Значений</td>
					<td>Комментарий</td>
					<td></td>
				</tr>
			</thead>
			<tbody draggable="false">
				${data.list.map(prop => showTr(data, env, prop)).join('')}
			</tbody>
		</table>
		${showScriptDrag(data, env)}
		<script>
			(div => {
				const name = 'represent_prop'
				for (const btn of div.getElementsByClassName(name)) {
					btn.addEventListener('click', async () => {
						const td = btn.closest('td')
						const tr = td.parentElement
						const prop_id = tr.dataset.id
						const represent = await import('/-sources/represent.js').then(r => r.default)
						const data = await represent.set(btn, name, {prop_id})
						if (!data.result) return
						const Client = await window.getClient()
						Client.reloaddiv('${env.layer.div}')
					})
				}
			})(document.currentScript.parentElement)
		</script>
	</div>
	<div style="margin:2em 0 4em; display: flex; flex-wrap:wrap; gap: 1em; justify-content: flex-end">
		${field.prompt({
			value: 'Добавить свойство', 
			name: 'title',
			input: '',
			label: 'Название свойства', 
			type: 'text', 
			action: '/-sources/set-prop-create', 
			args: {entity_id: data.entity_id},
			reloaddiv: env.layer.div,
			goid: 'prop_id'
		})}
	</div>
</p>
`
const showTr = (data, env, prop) => `
	<tr class="item" data-id="${prop.prop_id}" style="white-space: nowrap;">
		<td>
			<button title="Изменить видимость свойства" class="represent_prop eye transparent ${defcustom(prop.represent_prop)}">${svg.eye()}</button>
		</td>
		<td>
			<a href="prop/${prop.prop_id}">${prop.prop_title}</a>
		</td>
		<td>
			<!-- ${prop.type} -->
			${field.setpop({
				heading:'Тип',
				value: prop.type,
				name: 'type',
				descr: 'Тип определяет способ хранения значений для дальнейшей быстрой выборки. Самый оптимальный <b>number</b>, далее <b>date</b>, затем <b>volume</b> если повторяется и короче 63 символов. Самый затратный <b>text</b>. Для ключей и связей подходит только value.',
				action: '/-sources/set-prop-type', 
				values: {"number":"number", "date":"date", "value":"value", "text":"text"},
				args: {prop_id: prop.prop_id},
				reloaddiv: env.layer.div
			})}
		</td>
		<td>
			<!-- ${prop.multi ? "Несколько" : "Одно"} -->
			${field.setpop({
				heading:'Значений',
				value: prop.multi,
				name: 'bit',
				descr: 'Несколько значений могут быть разделены запятой с пробелом. Значений?',
				action: '/-sources/set-prop-prop', 
				values: {"":"Одно", "1":"Несколько"},
				args: {prop_id: prop.prop_id, propprop: 'multi'},
				reloaddiv: env.layer.div
			})}
		</td>		
		<td class="ellipsis">
			${field.areamin({
				name: 'comment', 
				label: 'Комментарий', 
				action: '/-sources/set-prop-comment', 
				args: {prop_id: prop.prop_id},
				value: prop.comment
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
				reloaddiv: env.layer.div
			})}
		</td>
	</tr>
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