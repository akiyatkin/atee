export const css = ['/-sources/revscroll.css']
import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
import print from "/-words/print.html.js"
import words from "/-words/words.html.js"
import svg from "/-sources/svg.html.js"

export const ROOT = (data, env) => err(data, env, []) || `
	<style>
		${env.scope} table.list {
			 margin: 1em 0
		}
		${env.scope} thead {
			font-weight: normal;
		}
		${env.scope} .block {
			margin: 1em 0; 
			/*border:1px dashed #ccc;*/
			/*border-bottom: 1px dashed #ccc;*/
		}
		${env.scope} .block .title {
			/*margin: 1em;*/
			font-weight: bold;
		}
		${env.scope} .block .body {
			margin: 1em 0 2em 0;
		}
	</style>
	${data.group ? showParent(data, env) : ''}
	<h1>${data.group ? showEdit(data, env, data.group) : 'Группы'}<span style="font-size:12px"></h1>
	
	${data.group ? showActions(data, env) : ''}
	${showGroups(data, env)}
	${data.group ? showSamples(data, env) : ''}
	${data.group ? showGroupOptions(data, env) : ''}
	${data.freetable ? showFree(data, env, data.group) : ''}
`
const showActions = (data, env) => `
	${field.search({
		cls: 'a',
		search:'/-bed/get-group-search',
		value: 'Перенести',
		heading: "Перенос группы",
		descr: "Выберите куда перенести группу <b>" + data.group.group_title + "</b>.",
		label: 'Новая родительская группа', 
		type: 'text',
		name: 'group_nick',
		find: 'group_nick',
		action: '/-bed/set-group-move',
		args: {group_id: data.group.group_id},
		reloaddiv: env.layer.div
	})}, 
	${field.search({
		cls: 'a',
		search:'/-bed/get-group-search',
		value: 'Копировать',
		heading: "Копирование группы",
		descr: "Выберите куда скопировать выборки, название и настройки группы <b>" + data.group.group_title + "</b>.",
		label: 'Новая родительская группа', 
		type: 'text',
		name: 'group_nick',
		find: 'group_nick',
		action: '/-bed/set-group-copy',
		args: {group_id: data.group.group_id},
		goid: 'group_id',
		go: 'groups/'
	})},
	${field.button({
		cls: 'a',
		label: 'Удалить', 
		confirm: 'Удалить группу?',
		action: '/-bed/set-group-delete',
		args: {group_nick: data.group.group_nick},
		reloaddiv: env.layer.div,
		goid: 'parent_id',
		go: 'groups/'
	})}
`
const showGroupOptions = (data, env) => `
	<div class="block">
		<div class="title">Фильтры</div>
		<div class="body">
			${field.setpop({
				heading:'Фильтры в группе',
				value: data.group.self_filters,
				name: 'bit',
				action: '/-bed/set-group-self_filters', 
				values: {"":"Фильтры наследуются", "1":"Свои фильтры"},
				args: {group_id: data.group.group_id},
				reloaddiv: env.layer.div
			})}
			${data.group.self_filters ? showFilters(data, env) : ''}
		</div>
	</div>
	<div class="block">
		<div class="title">Свойства на карточках</div>
		<div class="body">
			${!data.group.self_cards ? field.setpop({
				heading:'Cвойства на карточках',
				value: data.group.self_cards,
				name: 'bit',
				action: '/-bed/set-group-self_cards', 
				values: {"":"Свойства на карточках наследуются", "1":"Свои свойства на карточках"},
				args: {group_id: data.group.group_id},
				reloaddiv: env.layer.div
			}) : ''}
			${data.group.self_cards ? showCards(data, env) : ''}
		</div>
	</div>
`
const showFilters = (data, env) => `
	${data.filters?.length ? showTableFilters(data, env) : ''}
	<p>
		${field.search({
			cls: 'a',
			search:'/-bed/get-group-filter-prop-search',
			value: 'Добавить фильтр',
			heading: "Добавить фильтр",
			descr: "Выберите свойство по которому можно будет фильтровать позиций в группе <b>" + data.group.group_title + "</b>",
			label: 'Выберите свойство', 
			type: 'text',
			name: 'prop_nick',
			find: 'prop_nick',
			action: '/-bed/set-group-filter',
			args: {group_id: data.group.group_id},
			reloaddiv: env.layer.div
		})}
	</p>
`
const showCards = (data, env) => `
	${data.cards?.length ? showTableCards(data, env) : ''}
	<p>
		${field.search({
			cls: 'a',
			search:'/-bed/get-group-card-prop-search',
			value: 'Добавить свойство',
			heading: "Добавить свойство",
			descr: "Выберите свойство, которое показать на карточке в группе <b>" + data.group.group_title + "</b>",
			label: 'Выберите свойство', 
			type: 'text',
			name: 'prop_nick',
			find: 'prop_nick',
			action: '/-bed/set-group-card',
			args: {group_id: data.group.group_id},
			reloaddiv: env.layer.div
		})}
	</p>
`
const showParent = (data, env) => `
	<a href="groups/${data.group?.parent_id || ''}">${data.group?.parent_title || '<i>Корень</i>'}</a>
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
		reloaddiv: env.layer.div
	})}

`
const showRed = (nick) => `
	<span style="color:red">${nick}</span>
`
const showValue = (data, env, mark) => !mark.value_nick ? '' : `
	<div>
		${mark.value_title || showRed(mark.value_nick)}
		${field.button({
			cls: 'transparent mute',
			label: svg.cross(), 
			confirm: 'Удалить занчение?',
			action: '/-bed/set-sample-prop-value-delete',
			reloaddiv: env.layer.div,
			args: {
				prop_nick: mark.prop_nick, 
				group_nick: data.group.group_nick, 
				value_nick: mark.value_nick
			}
		})}
	</div>
`
const descrPropValue = (data, env, prop) => `
	Выберите значение критерия 
	<b>${prop.prop_title || prop.prop_nick}</b> 
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
// 	action: '/-bed/set-sample-prop-value-create',
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

const showProp = (data, env, sample_id, props, prop = props[0]) => !prop.prop_nick ? '' : `
	<tr>
		<td>
			${props[0].prop_title || showRed(props[0].prop_nick)}
			${field.button({
				cls: 'transparent mute',
				label: svg.cross(), 
				confirm: 'Удалить критерий?',
				action: '/-bed/set-sample-prop-delete',
				reloaddiv: env.layer.div,
				args: {
					prop_nick: props[0].prop_nick, 
					sample_id
				}
			})}
		</td>
		<td>
			${prop.spec != 'any' ? '' : '<i>Любое значение</i>'}
			${prop.spec != 'empty' ? '' : '<i>Без значения</i>'}
			${prop.spec != 'exactly' ? '' : props.map(mark => showValue(data, env, mark)).join('')}
			<div>
				${field.search({
					cls: 'a',
					search: '/-bed/get-prop-value-search?type=samplevalue&prop_nick=' + props[0].prop_nick + '&group_nick=' + data.group.group_nick,
					value: 'Добавить значение',
					heading: "Выберите значение",
					descr: descrPropValue(data, env, props[0]),
					label: 'Выберите значение', 
					type: 'text',
					name: 'value_nick',
					find: 'value_nick',
					action: '/-bed/set-sample-prop-value-create',
					args: { sample_id, prop_nick: props[0].prop_nick},
					reloaddiv: env.layer.div
				})}
				
				
			</div>
		</td>
	</tr>
`.trim()

const showTableCards = (data, env) => `
	<table draggable="false" class="list">
		${data.cards.map(filter => showCard(data, env, filter)).join('')}
	</table>
	${showScriptDragCards(data, env)}
`
const showScriptDragCards = (data, env) => `
	<script>
		(async table => {
			const list = table.tBodies[0]
			if (!list) return
			const Drag = await import('/-note/theory/Drag.js').then(r => r.default)
			Drag.make(list, async ({id, next_id}) => {
				const senditmsg = await import('/-dialog/senditmsg.js').then(r => r.default)
				const ans = await senditmsg(list, '/-bed/set-card-ordain', {group_id : "${data.group.group_id}", prop_nick: id, next_nick: next_id})
			})
		})(document.currentScript.previousElementSibling)
	</script>
`
const showCard = (data, env, card) => `
	<tr data-id="${card.prop_nick}" style="white-space: nowrap;" class="item">
		<td>
			${card.prop_title || showRed(card.prop_nick)}
		</td>
		<td>
			${field.button({
				cls: 'transparent mute',
				label: svg.cross(), 
				confirm: 'Удалить свойство?',
				action: '/-bed/set-card-delete',
				args: {
					prop_nick: card.prop_nick, 
					group_id: data.group.group_id
				},
				reloaddiv: env.layer.div
			})}			
		</td>
	</tr>
`
const showFilter = (data, env, filter) => `
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
					group_nick: data.group.group_nick, 
				},
				reloaddiv: env.layer.div
			})}			
		</td>
	</tr>
`
const showTableSamples = (data, env) => `
	${Object.entries(data.samples).map(([sample_id, props]) => showTableSampleProps(data, env, sample_id, props)).join('')}
`
const showTableSampleProps = (data, env, sample_id, props) => `
	<table style="margin-top:1em">
		${Object.entries(props).map(([prop_nick, props]) => showProp(data, env, sample_id, props)).join('')}
		<tr><td colspan="2">
			${field.search({
				cls: 'a',
				search:'/-bed/get-sample-prop-search?type=sampleprop',
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
			${field.button({
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
const showTableFilters = (data, env) => `
	
	<table draggable="false" class="list">
		${data.filters.map(filter => showFilter(data, env, filter)).join('')}
	</table>
	${showScriptDragFilters(data, env)}
`
const showTableGroups = (data, env, group) => `
	<table draggable="false" class="list">
		<thead>
			<tr>
				<td>${data.group ? 'Подгруппа' : 'Группа'}</td>
				<td>Позиций</td>
				<td>Подгрупп</td>
				<td></td>
			</tr>
		</thead>
		<tbody draggable="false">
			${data.childs.map(group => showGroup(data, env, group)).join('')}
		</tbody>
	</table>
	${showScriptDragGroups(data, env)}
`
const showSamples = (data, env) => `
	<div class="block">
		<div class="title">Выборки</div>
		<div class="body">
			${Object.keys(data.samples).length ? showTableSamples(data, env) : ''}
			${field.search({
				cls: 'a',
				search:'/-bed/get-sample-prop-search?type=sample',
				value: 'Добавить выборку',
				heading: "Добавить критерий",
				descr: "Выберите свойство-критерий для попадания позиций в группу <b>" + data.group.group_title + "</b>.",
				label: 'Выберите свойство', 
				type: 'text',
				name: 'prop_nick',
				find: 'prop_nick',
				action: '/-bed/set-sample-create',
				args: {group_nick: data.group.group_nick},
				reloaddiv: env.layer.div
			})}
			<p>В группу выбрано <span title="Позиций ${data.poscount}, моделей ${data.modcount}">${data.poscount}</span> ${words(data.poscount, 'позиция', 'позиции', 'позиций')}</p>
		</div>
	</div>
`


const showGroups = (data, env) => `
	<div class="block">
		<div class="title">${data.group ? 'Подгруппы' : 'Группы'}</div>
		<div class="body">
			${data.childs.length ? showTableGroups(data, env, data.group) : ''}	
			<p>
				${field.prompt({
					value: 'Добавить ' + (data.group ? 'подгруппу' : 'группу'), 
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
		</div>
	</div>
	
`
const showFree = (data, env) => `
	<h2 title="Нераспределённые позиции в родительской группе">Свободные позиции <span title="Позиций ${data.freetable?.poscount || 0}, моделей ${data.freetable?.modcount || 0}">${data.freetable?.poscount || 0}</span></h2>
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
				const ans = await senditmsg(list, '/-bed/set-filter-ordain', {group_id : "${data.group.group_id}", prop_nick: id, next_nick: next_id})
			})
		})(document.currentScript.previousElementSibling)
	</script>
`
const showGroup = (data, env, group) => `
	<tr data-id="${group.group_id}" style="white-space: nowrap;" class="item">
		<td>
			<a href="groups/${group.group_id}">${group.group_title}</a>
		</td>
		
		<td title="Позиций ${data.poscount}, моделей ${data.modcount}">${group.poscount}</td>
		<td>${group.childs}</td>
		<td>
			${field.button({
				cls: 'transparent mute',
				label: svg.cross(), 
				confirm: 'Удалить группу?',
				action: '/-bed/set-group-delete',
				args: {group_nick: group.group_nick},
				reloaddiv: env.layer.div
			})}
		</td>
	</tr>
`
