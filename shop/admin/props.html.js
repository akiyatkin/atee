export const css = ['/-sources/revscroll.css']
import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
import print from "/-words/print.html.js"
import words from "/-words/words.html.js"
import svg from "/-sources/svg.html.js"

export const ROOT = (data, env) => `
	<h1>Свойства</h1>
	${showProps(data, env)}
`

const showProps = (data, env) => `
	<p>
		${field.search({
			cls: 'a',
			search:'/-shop/admin/get-prop-search',
			value: 'Добавить свойство',
			heading: "Добавить свойство",
			descr: "Выберите свойство",
			label: 'Выберите свойство', 
			type: 'text',
			name: 'prop_nick',
			find: 'prop_nick',
			action: '/-shop/admin/set-prop-create',
			args: {},
			reloaddiv: env.layer.div
		})}
	</p>
	<div class="revscroll" style="margin: 2em 0">
		<table draggable="false" class="list">
			<thead>
				<td>Свойство</td>
				<td>Тип</td>
				<td>Значений</td>
				<td>Карточка</td>
				<td>Фильтр</td>
				<td>Выбор</td>
				<td>Обработка</td>
				<td>Комментарий</td>
				<td></td>
			</thead>
			<tbody>
				${data.props.map(row => showTr(data, env, row)).join('')}
			</tbody>
		</table>
		${showScriptDrag(data, env)}
	</div>
`
const showRed = (nick) => `
	<span style="color:red">${nick}</span>
`
const showLink = (data, env, prop) => `
	<a href="/@atee/sources/prop/${prop.prop_id}">${prop.prop_title}</a>
`
const showTr = (data, env, prop) => `
	<tr class="item" data-id="${prop.prop_id || ''}" style="white-space: nowrap;">
		<td>${prop.prop_title ? showLink(data, env, prop) : showRed(prop.prop_nick)}</td>
		<td>${prop.type || ''}</td>
		<td>${({"":"Одно", "1":"Несколько"})[prop.multi || '']}</td>
		<td>
			${field.search({
				cls: 'a',
				search: '/-shop/admin/get-tpl-sub?type=card',
				value: prop.card_tpl,
				heading: "Шаблон для карточки",
				descr: '',
				label: "Шаблон для карточки", 
				type: 'text',
				name: 'sub',
				find: 'left',
				action: '/-shop/admin/set-tpl-sub?type=card',
				args: { prop_nick: prop.prop_nick}
			})}
		</td>
		<td>
			${field.search({
				cls: 'a',
				search: '/-shop/admin/get-tpl-sub?type=filter',
				value: prop.filter_tpl,
				heading: "Шаблон для фильтра",
				descr: '',
				label: 'Шаблон для фильтра', 
				type: 'text',
				name: 'sub',
				find: 'left',
				action: '/-shop/admin/set-tpl-sub?type=filter',
				args: { prop_nick: prop.prop_nick}
			})}
		</td>
		<td>
			${field.setpop({
				heading:'Выбор в фильтре',
				cls: 'a',
				value: prop.singlechoice,
				name: 'bit',
				action: '/-shop/admin/set-prop-singlechoice', 
				values: {"":"Несколько", "1":"Один"},
				args: { prop_nick: prop.prop_nick}
			})}
		</td>
		<td>
			${!prop.known ? '<i>&mdash;</i>' : field.setpop({
				heading:'Обработка свойства',
				cls: 'a',
				value: prop.known,
				name: 'known',
				descr: '<b>more</b> означает, что у свойства нет специальной обработки и оно покажется вместе со всеми такими свойствами в общем списке. Свойство со специальной обработкой <b>column</b> покажется только там, где его покажет программист, по умолчанию в интерфейсе нигде не покажется, но придёт с данными. Свойство <b>system</b> даже с данными не придёт и может быть использовано для технических обработок, например быть критерием групп.',
				action: '/-sources/set-known', 
				values: {"system":"🛡️ system", "more":"🟡 more", "column":"✅ column"},
				args: {prop_id: prop.prop_id}
			})}
		</td>
		<td>
			${prop.prop_id ? field.areamin({
				name: 'comment', 
				label: 'Комментарий', 
				action: '/-sources/set-prop-comment', 
				args: {prop_id: prop.prop_id},
				value: prop.comment
			}) : '<i>&mdash;</i>'}
		</td>
		<td>
			${field.button({
				cls: 'transparent mute',
				label: svg.cross(), 
				confirm: 'Удалить настройки свойства?',
				action: '/-shop/admin/set-prop-delete',
				reloaddiv: env.layer.div,
				args: {prop_nick: prop.prop_nick},
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