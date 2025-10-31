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
		/*${env.scope} table .prop_column:before {
			content:"✅";
		}
		${env.scope} table .prop_more:before {
			content:"🟡";
		}
		${env.scope} table .prop_system:before {
			content:"🛡️";
		}*/
	</style>
	<form style="display: flex; margin: 1em 0; gap: 1em; flex-wrap: wrap">
		<div class="float-label">
			<input id="freeinp" name="query" type="search" placeholder="Поиск" value="${env.bread.get.query ?? ''}">
			<label for="freeinp">Поиск</label>
		</div>
		<div style="display: flex; justify-content: space-between; flex-grow: 1; gap: 1em;">
			<button type="submit">Найти</button>
			${field.prompt({
				cls: 'a',
				value: 'Добавить свойство', 
				name: 'title',
				input: '',
				label: 'Название свойства', 
				type: 'text', 
				action: '/-sources/set-prop-create', 
				args: {entity_id: data.entity_id},
				global: 'check'
			})}
		</div>
		<script>
			(form => {
				const btn = form.querySelector('button')
				const input = form.querySelector('input')
				input.focus()
				input.setSelectionRange(input.value.length, input.value.length)
				form.addEventListener('submit', async (e) => {
					e.preventDefault()
					const Client = await window.getClient()
					Client.go('props?query=' + input.value, false)
					Client.reloaddiv("${env.layer.div}")
				})
			})(document.currentScript.parentElement)
		</script>
	</form>
	
	<div class="revscroll" style="margin: 2em 0">
		<table draggable="false" class="list">
			<thead>
				<tr>
					<td></td>
					<td></td>
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
			(async div => {
				const table = div.querySelector('table')
				table.addEventListener('click', (e) => {
					const old = table.querySelector('.clicked')
					if (old) old.classList.remove('clicked')
					const tr = e.target.closest('tr')
					if (!tr) return
					tr.classList.add('clicked')
				})
			})(document.currentScript.parentElement)
		</script>
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
						Client.global('check')
					})
				}
			})(document.currentScript.parentElement)
		</script>
	</div>
	
</p>
`
const showTr = (data, env, prop) => `
	<tr class="item" data-id="${prop.prop_id}" style="white-space: nowrap;">
		<td>
			<button title="Изменить видимость свойства" class="represent_prop eye transparent ${defcustom(prop.represent_prop)}">${svg.eye()}</button>
		</td>
		<td>
			${field.setpop({
				heading:'Обработка свойства',
				cls: 'transparent',
				value: prop.known,
				name: 'known',
				descr: '<b>more</b> означает, что у свойства нет специальной обработки и оно покажется вместе со всеми такими свойствами в общем списке. Свойство со специальной обработкой <b>column</b> покажется только там, где его покажет программист, по умолчанию в интерфейсе нигде не покажется, но придёт с данными. Свойство <b>system</b> даже с данными не придёт и может быть использовано для технических обработок, например быть критерием групп.',
				action: '/-sources/set-known', 
				values: {"system":"🛡️ system", "more":"🟡 more", "column":"✅ column"},
				args: {prop_id: prop.prop_id},
				global: 'check'
			})}
		</td>
		<td>
			<a href="prop/${prop.prop_id}">${prop.prop_title}</a>
		</td>
		<td>
			<!-- ${prop.type} -->
			${field.setpop({
				heading:'Тип',
				cls: 'a',
				value: prop.type,
				name: 'type',
				descr: 'Тип определяет способ хранения значений для дальнейшей быстрой выборки. Самый оптимальный <b>number</b>, далее <b>date</b>, затем <b>volume</b> если повторяется и короче <b>127 символов</b>. И последний оригинальный вариант <b>text</b>. Для ключей и связей подходит только value.',
				action: '/-sources/set-prop-type', 
				values: {"number":"number", "date":"date", "value":"value", "text":"text"},
				args: {prop_id: prop.prop_id},
				global: 'check'
			})}
		</td>
		<td>
			<!-- ${prop.multi ? "Несколько" : "Одно"} -->
			${field.setpop({
				heading:'Значений',
				cls: 'a',
				value: prop.multi,
				name: 'bit',
				descr: 'Несколько значений могут быть разделены запятой с пробелом. При внесении данных запятую в значении можно заменить на <code>&amp;#44;</code> чтобы избежать разделения. Но при использовании данных надо выполнять обратную замену.',
				action: '/-sources/set-prop-prop', 
				values: {"":"Одно", "1":"Несколько"},
				args: {prop_id: prop.prop_id, propprop: 'multi'},
				global: 'check'
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
				args: {prop_id: prop.prop_id},
				global: 'check'
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