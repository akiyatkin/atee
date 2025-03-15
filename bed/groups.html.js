export const css = ['/-sources/revscroll.css']
import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
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
const showValue = (data, env, group, mark) => `
	<div>
		${mark.value_title || showRed(mark.value_nick)}
		${!mark.value_title ? '' : field.button({
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
const showMark = (data, env, group, marks) => `
	<tr>
		<td>
			${marks[0].prop_title || showRed(marks[0].prop_nick)}
		</td>
		<td>
			${marks.map(mark => showValue(data, env, group, mark)).join('')}
			<div>
				${field.search({
					cls: 'a mute',
					search: '/-bed/get-prop-value-search?prop_nick='+marks[0].prop_nick+'&group_nick=' + data.group.group_nick,
					value: 'Добавить',
					heading: "Выберите значение",
					descr: "Выберите значение критерия <b>" + marks[0].prop_title + "</b> для попадания позиций в группу <b>" + group.group_title + "</b>",
					label: 'Выберите значение', 
					type: 'text',
					name: 'value_nick',
					find: 'value_nick',
					action: '/-bed/set-group-mark-value',
					args: {group_nick: group.group_nick, prop_nick: marks[0].prop_nick},
					reloaddiv: env.layer.div
				})}
				${marks[0].value_nick ? '' : field.button({
					cls: 'transparent mute',
					label: svg.cross(), 
					confirm: 'Удалить занчение?',
					action: '/-bed/set-group-mark-value-delete',
					reloaddiv: env.layer.div,
					args: {
						prop_nick: marks[0].prop_nick, 
						group_nick: group.group_nick, 
						value_nick: ''
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
				reloaddiv: env.layer.div,
				args: {
					prop_nick: filter.prop_nick, 
					group_nick: group.group_nick, 
				},
				reloaddiv: env.layer.div
			})}			
		</td>
	</tr>
`
const showTableMarks = (data, env, group) => `
	<table style="margin-top:2em">
		${Object.entries(group.marks).map(([prop_nick, marks]) => showMark(data, env, group, marks)).join('')}
	</table>
`
const showTableFilters = (data, env, group) => `
	<h2>Фильтры</h2>
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
	<table draggable="false" class="list" style="margin: 2em 0 1em">
		${data.group.filters.map(filter => showFilter(data, env, group, filter)).join('')}
	</table>
	${showScriptDragFilters(data, env)}
	
`
const showTableGroups = (data, env, group) => `
	<table draggable="false" class="list" style="margin: 2em 0 1em">
		<thead>
			<tr>
				<th>${data.group ? 'Подгруппа' : 'Группа'}</th>
				<th>Моделей</th>
				<th>Позиций</th>
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
const showMarks = (data, env, group) => `
	<h2>Выборка</h2>
	<p>
		${field.search({
			cls: 'a',
			search:'/-bed/get-mark-prop-search',
			value: 'Добавить выборку',
			heading: "Добавить критерий",
			descr: "Выберите свойство-критерий для попадания позиций в группу <b>" + data.group.group_title + "</b>",
			label: 'Выберите свойство', 
			type: 'text',
			name: 'prop_nick',
			find: 'prop_nick',
			action: '/-bed/set-group-mark',
			args: {group_nick: data.group.group_nick},
			reloaddiv: env.layer.div
		})}
	</p>
	<p>
		${field.search({
			cls: 'a',
			search:'/-bed/get-mark-prop-search',
			value: 'Добавить критерий',
			heading: "Добавить критерий",
			descr: "Выберите свойство-критерий для попадания позиций в группу <b>" + data.group.group_title + "</b>",
			label: 'Выберите свойство', 
			type: 'text',
			name: 'prop_nick',
			find: 'prop_nick',
			action: '/-bed/set-group-mark',
			args: {group_nick: data.group.group_nick},
			reloaddiv: env.layer.div
		})}
	</p>
	${Object.keys(data.group.marks).length ? showTableMarks(data, env, group) : ''}
	
`

export const ROOT = (data, env) => err(data, env, []) || `
	${data.group ? showParent(data, env) : ''}
	<h1>${data.group ? showEdit(data, env, data.group) : 'Группы'}</h1>
	<!-- <pre>${data.sql}</pre> -->
	<table>
		<tr><td>Моделей</td><td>${data.modcount}</td></tr>
		<tr><td>Позиций</td><td>${data.poscount}</td></tr>
	</table>
	${showGroups(data, env, data.group)}
	${data.group?.filters?.length ? showTableFilters(data, env, data.group) : ''}
	${!data.group ? '' : showMarks(data, env, data.group)}
	${!data.freetable ? '' : showFree(data, env, data.group)}
	
`
const showGroups = (data, env, group) => `
	<!-- <h2>${data.group ? 'Подгруппы' : 'Группы'}</h2> -->
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
	${data.childs.length ? showTableGroups(data, env, data.group) : ''}	
	
`
const showFree = (data, env) => `
	<h2>Свободные позиции (${data.freetable?.count || 0})</h2>
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
		
		
		<td>${group.modcount}</td>
		<td>${group.poscount}</td>
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
