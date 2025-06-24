export const css = ['/-sources/revscroll.css']
import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
import print from "/-words/print.html.js"
import svg from "/-sources/svg.html.js"
const showParent = (data, env) => `
	<a href="groups/${data.group?.parent_nick || ''}">${data.group?.parent_title || 'Группы'}</a>
`
const showEdit = (data, env, group) => `
	${group.group_title} ${field.prompt({
		value: svg.edit(), 
		name: 'group_title',
		input: group.group_title,
		ok: 'ОК', 
		label: 'Укажите название', 
		descr: '',
		cls: 'a mute',
		type: 'text', 
		action: '/-bed/set-group-title', 
		args: {group_nick: group.group_nick},
		go: "groups/",
		goid: "group_nick",
		goreplace: true
	})}

`
const showRed = (nick) => `
	<span style="color:red">${nick}</span>
`
const showValue = (data, env, group, mark) => !mark.value_nick ? '' : `
	<div>
		${mark.value_title || showRed(mark.value_nick)}
		${field.button({
			cls: 'transparent mute',
			label: svg.cross(), 
			confirm: 'Удалить занчение?',
			action: '/-bed/set-group-mark-value-delete',
			reloaddiv: env.layer.div,
			args: {
				prop_nick: mark.prop_nick, 
				group_nick: group.group_nick, 
				value_nick: mark.value_nick
			},
			reloaddiv: env.layer.div
		})}
	</div>
`
const descrPropValue = (data, env, group, prop) => `
	Выберите значение критерия 
	<b>${prop.prop_title}</b> 
	для попадания позиций в группу
`
// ${prop.type != 'number' ? '' : field.prompt({
// 	cls: 'a',
// 	value: 'Добавить',
// 	heading: "Укажите значение",
// 	descr: descrPropNumber(data, env, group, marks[0]),
// 	label: 'Укажите значение', 
// 	type: 'number',
// 	name: 'value_nick',
// 	find: 'value_nick',
// 	action: '/-bed/set-sample-prop-value',
// 	args: { sample_id, prop_nick: marks[0].prop_nick},
// 	reloaddiv: env.layer.div
// })}
// <script>
// 	(async div => {
// 		for (const button of div.getElementsByTagName('button')) {
// 			button.addEventListener('click', () => {
// 				const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
// 				Dialog.hide()
// 			})
// 		}
		
		
// 	})(document.currentScript.parentElement)
// </script>

const showProp = (data, env, group, sample_id, props, prop = props[0]) => !prop.prop_nick ? '' : `
	<tr>
		<td>
			${props[0].prop_title || showRed(props[0].prop_nick)}
		</td>
		<td>
			${prop.spec != 'any' ? '' : '<i>Любое значение</i>'}
			${prop.spec != 'empty' ? '' : '<i>Без значения</i>'}
			${prop.spec != 'exactly' ? '' : props.map(mark => showValue(data, env, group, mark)).join('')}
			<div>
				${prop.type != 'value' ? '' : field.search({
					cls: 'a',
					search: '/-bed/get-prop-value-search?spec&prop_nick=' + props[0].prop_nick + '&group_nick=' + data.group.group_nick,
					value: 'Добавить',
					heading: "Выберите значение",
					descr: descrPropValue(data, env, group, props[0]),
					label: 'Выберите значение', 
					type: 'text',
					name: 'value_nick',
					find: 'value_nick',
					action: '/-bed/set-sample-prop-value',
					args: { sample_id, prop_nick: props[0].prop_nick},
					reloaddiv: env.layer.div
				})}
				
				${prop.value_nick ? '' : field.button({
					cls: 'transparent mute',
					label: svg.cross(), 
					confirm: 'Удалить критерий?',
					action: '/-bed/set-sample-prop-delete',
					reloaddiv: env.layer.div,
					args: {
						prop_nick: props[0].prop_nick, 
						sample_id
					},
					reloaddiv: env.layer.div
				})}
			</div>
		</td>
	</tr>
`.trim()
const showFilter = (data, env, group, filter) => `
	<tr data-id="${filter.prop_nick}" style="white-space: nowrap;" class="item">
		<td>
			${filter.prop_title || showRed(filter.prop_nick)}
		</td>
		<td>
			${field.button({
				cls: 'transparent mute',
				label: svg.cross(), 
				confirm: 'Удалить занчение?',
				action: '/-bed/set-filter-delete',
				args: {
					prop_nick: filter.prop_nick, 
					group_nick: group.group_nick, 
				},
				reloaddiv: env.layer.div
			})}			
		</td>
	</tr>
`
const showTableSamples = (data, env, group) => `
	${Object.entries(data.samples).map(([sample_id, props]) => showTableSampleProps(data, env, group, sample_id, props)).join('')}
`
const showTableSampleProps = (data, env, group, sample_id, props) => `
	<table style="margin-top:2em">
		${Object.entries(props).map(([prop_nick, props]) => showProp(data, env, group, sample_id, props)).join('')}
		<tr><td colspan="2">
			${field.search({
				cls: 'a',
				search:'/-bed/get-sample-prop-search',
				value: 'Добавить критерий',
				heading: "Добавить критерий",
				descr: "Выберите свойство-критерий для попадания позиций в группу <b>" + data.group.group_title + "</b>",
				label: 'Выберите свойство', 
				type: 'text',
				name: 'prop_nick',
				find: 'prop_nick',
				action: '/-bed/set-sample-prop-create',
				args: {sample_id},
				reloaddiv: env.layer.div
			})}
			${Object.entries(props).length ? '' : field.button({
				cls: 'transparent mute',
				label: svg.cross(), 
				confirm: 'Удалить всю выборку?',
				action: '/-bed/set-sample-delete',
				reloaddiv: env.layer.div,
				args: {sample_id}
			})}	
		</td></tr>
	</table>
`
const showTableFilters = (data, env, group) => `
	<h2>Фильтры</h2>
	<table draggable="false" class="list" style="margin: 2em 0 1em">
		${data.filters.map(filter => showFilter(data, env, group, filter)).join('')}
	</table>
	${showScriptDragFilters(data, env)}
	<p>
		${field.search({
			cls: 'a',
			search:'/-bed/get-filter-prop-search',
			value: 'Добавить фильтр',
			heading: "Добавить фильтр",
			descr: "Выберите свойство по которому можно будет фильтровать позиций в группе <b>" + data.group.group_title + "</b>",
			label: 'Выберите свойство', 
			type: 'text',
			name: 'prop_nick',
			find: 'prop_nick',
			action: '/-bed/set-group-filter',
			args: {group_nick: data.group.group_nick},
			reloaddiv: env.layer.div
		})}
	</p>
	
`
const showTableGroups = (data, env, group) => `
	<table draggable="false" class="list" style="margin: 2em 0 1em">
		<thead>
			<tr>
				<th>${data.group ? 'Подгруппа' : 'Группа'}</th>
				<th>Позиций</th>
				<th>Моделей</th>
				<th>Подгрупп</th>
				<td></td>
			</tr>
		</thead>
		<tbody draggable="false">
			${data.childs.map(group => showGroup(data, env, group)).join('')}
		</tbody>
	</table>
	${showScriptDragGroups(data, env)}
`
const showSamples = (data, env, group) => `
	<h2>Выбрано <span title="Позиций ${data.poscount}, моделей ${data.modcount}">(${data.poscount})</span></h2>
	${Object.keys(data.samples).length ? showTableSamples(data, env, group) : ''}
	<p>
		${field.search({
			cls: 'a',
			search:'/-bed/get-sample-prop-search',
			value: 'Добавить выборку',
			heading: "Добавить критерий",
			descr: "Выберите свойство-критерий для попадания позиций в группу <b>" + data.group.group_title + "</b>",
			label: 'Выберите свойство', 
			type: 'text',
			name: 'prop_nick',
			find: 'prop_nick',
			action: '/-bed/set-sample-create',
			args: {group_nick: data.group.group_nick},
			reloaddiv: env.layer.div
		})}
	</p>
`

export const ROOT = (data, env) => err(data, env, []) || `
	${data.group ? showParent(data, env) : ''}
	<h1>${data.group ? showEdit(data, env, data.group) : 'Группы'}<span style="font-size:12px"></h1>
	<!-- <pre>${data.sql}</pre> -->

	
	
	
	${!data.group ? '' : showSamples(data, env, data.group)}
	${showGroups(data, env, data.group)}
	${data.filters?.length ? showTableFilters(data, env, data.group) : ''}
	${!data.freetable ? '' : showFree(data, env, data.group)}
	
`
const showGroups = (data, env, group) => `
	<!-- <h2>${data.group ? 'Подгруппы' : 'Группы'}</h2> -->
	${data.childs.length ? showTableGroups(data, env, data.group) : ''}	
	<p>
		${field.prompt({
			value: data.group ? 'Добавить подгруппу' : 'Добавить группу', 
			name: 'group_title',
			input: '',
			ok: 'ОК', 
			label: 'Укажите название', 
			descr: '',
			cls: 'a',
			type: 'text', 
			action: '/-bed/set-group-create', 
			args: {group_nick: data.group?.group_nick ?? null},
			reloaddiv: env.layer.div
		})}
	</p>
	
`
const showFree = (data, env) => `
	<h2 title="Нераспределённые позиции в родительской группе">Свободные позиции <span title="Позиций ${data.freetable?.poscount || 0}, моделей ${data.freetable?.modcount || 0}">(${data.freetable?.poscount || 0})</span></h2>
	<div class="revscroll">
		<table>
			<thead>
				${showTr(data, env, data.freetable.head)}
			</thead>
			<tbody>
				${data.freetable.rows.map(row => showTr(data, env, row)).join('')}
			</tbody>
		</table>
	</div>
`
const showTr = (data, env, row) => `
	<tr>
		${row.map(title => showTd(data, env, title)).join('')}
	</tr>
`
const showTd = (data, env, title) => `
	<td>${title}</td>
`

const showScriptDragGroups = (data, env) => `
	<script>
		(async table => {
			const list = table.tBodies[0]
			if (!list) return
			const Drag = await import('/-note/theory/Drag.js').then(r => r.default)
			Drag.make(list, async ({id, next_id}) => {
				const senditmsg = await import('/-dialog/senditmsg.js').then(r => r.default)
				const ans = await senditmsg(list, '/-bed/set-group-ordain', {id, next_id})
			})
		})(document.currentScript.previousElementSibling)
	</script>
`
const showScriptDragFilters = (data, env) => `
	<script>
		(async table => {
			const list = table.tBodies[0]
			if (!list) return
			const Drag = await import('/-note/theory/Drag.js').then(r => r.default)
			Drag.make(list, async ({id, next_id}) => {
				const senditmsg = await import('/-dialog/senditmsg.js').then(r => r.default)
				const ans = await senditmsg(list, '/-bed/set-filter-ordain', {group_nick : "${data.group.group_nick}", prop_nick: id, next_nick: next_id})
			})
		})(document.currentScript.previousElementSibling)
	</script>
`
const showGroup = (data, env, group) => `
	<tr data-id="${group.group_id}" style="white-space: nowrap;" class="item">
		<td>
			<a href="groups/${group.group_nick}">${group.group_title}</a>
		</td>
		
		<td>${group.poscount}</td>
		<td>${group.modcount}</td>
		<td>${group.childs}</td>
		<td>
			${field.button({
				cls: 'transparent mute',
				label: svg.cross(), 
				confirm: 'Удалить группу?',
				action: '/-bed/set-group-delete',
				reloaddiv: env.layer.div,
				args: {group_nick: group.group_nick},
				reloaddiv: env.layer.div
			})}
		</td>
	</tr>
`
