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
			width: fit-content;
			border-bottom: dashed 1px gray;
			cursor: pointer;
		}
		${env.scope} .block .body {
			interpolate-size: allow-keywords;
			transition: height 0.3s;
			overflow:hidden;
			height: 0;
		}
		${env.scope} .block.show .body {
			height: auto;
		}
	</style>
	${data.group ? showParent(data, env) : ''}
	<h1>${data.group?.group_title || '<i>Корень</i>'}</h1>
	
	${showGroups(data, env)}
	${data.group ? showGroupActions(data, env) : ''}
	${data.group ? showGroupOptions(data, env) : ''}
	${data.freetable ? showFree(data, env, data.group) : ''}
	<script>
		(div => {
			for (const block of div.querySelectorAll('.block')) {
				const title = block.querySelector('.title')
				const name = 'shop_blocks_' + title.innerText;
				const body = block.querySelector('.body')
				if (sessionStorage.getItem(name)) block.classList.toggle('show')
				title.addEventListener('click', () => {
					block.classList.toggle('show')
					const is = block.classList.contains('show')
					if (is) sessionStorage.setItem(name, 1)
					else sessionStorage.removeItem(name)
				})
			}
		})(document.currentScript.parentElement)
	</script>
`
const showGroupActions = (data, env) => `
	<div class="block">
		<div class="title">Действия</div>
		<div class="body">
			<p>
				${field.search({
					cls: 'a',
					search:'/-shop/get-group-search',
					value: 'Перенести',
					heading: "Перенос группы",
					descr: "Выберите куда перенести группу <b>" + data.group.group_title + "</b>.",
					label: 'Новая родительская группа', 
					type: 'text',
					name: 'group_nick',
					find: 'group_nick',
					action: '/-shop/set-group-move',
					args: {group_id: data.group.group_id},
					reloaddiv: env.layer.div
				})}, 
				${field.search({
					cls: 'a',
					search:'/-shop/get-group-search',
					value: 'Копировать',
					heading: "Копирование группы",
					descr: "Выберите куда скопировать выборки, название и настройки группы <b>" + data.group.group_title + "</b>.",
					label: 'Новая родительская группа', 
					type: 'text',
					name: 'group_nick',
					find: 'group_nick',
					action: '/-shop/set-group-copy',
					args: {group_id: data.group.group_id},
					goid: 'group_id',
					go: 'groups/'
				})},
				${field.button({
					cls: 'a',
					label: 'Удалить', 
					confirm: 'Удалить группу?',
					action: '/-shop/set-group-delete',
					args: {group_nick: data.group.group_nick},
					reloaddiv: env.layer.div,
					goid: 'parent_id',
					go: 'groups/'
				})}
			
			<table>
				<tr>
					<td>Изменить имя</td>
					<td>
						${field.prompt({
							value: data.group.group_title, 
							name: 'group_title',
							input: data.group.group_title,
							ok: 'ОК', 
							label: 'Укажите название', 
							descr: '',
							cls: 'a',
							type: 'text', 
							action: '/-shop/set-group-title', 
							args: {group_id: data.group.group_id},
							reloaddiv2: env.layer.div
						})}
					</td>
				</tr>
				<tr>
					<td>Изменить ник</td>
					<td>
						${field.prompt({
							value: data.group.group_nick, 
							name: 'group_nick',
							input: data.group.group_nick,
							ok: 'ОК', 
							label: 'Укажите никнейм', 
							descr: '',
							cls: 'a',
							type: 'text', 
							action: '/-shop/set-group-nick', 
							args: {group_id: data.group.group_id},
							reloaddiv2: env.layer.div
						})}
					</td>
				</tr>
			</table>
			
		</div>
	</div>
`

const showGroupOptions = (data, env) => `
	
	${showGroupSamples(data, env)}
	<div class="block">
		<div class="title">Фильтры в группе</div>
		<div class="body">
			<p>
				${field.setpop({
					heading:'Фильтры в группе',
					value: data.group.self_filters,
					name: 'bit',
					action: '/-shop/set-group-self_filters', 
					values: {"":"Фильтры наследуются", "1":"Свои фильтры"},
					args: {group_id: data.group.group_id},
					reloaddiv: env.layer.div
				})}
			</p>
			${data.group.self_filters ? showGroupFilters(data, env) : ''}
		</div>
	</div>
	<div class="block">
		<div class="title">Свойства на карточках</div>
		<div class="body">
			<p>${!data.group.self_cards ? field.setpop({
				heading:'Cвойства на карточках',
				value: data.group.self_cards,
				name: 'bit',
				action: '/-shop/set-group-self_cards', 
				values: {"":"Свойства на карточках наследуются", "1":"Свои свойства на карточках"},
				args: {group_id: data.group.group_id},
				reloaddiv: env.layer.div
			}) : ''}</p>
			${data.group.self_cards ? showCards(data, env) : ''}
		</div>
	</div>
`
const showGroupFilters = (data, env) => `
	${data.filters?.length ? showTableFilters(data, env) : ''}
	<p>
		${field.search({
			cls: 'a',
			search:'/-shop/get-group-filter-prop-search',
			value: 'Добавить фильтр',
			heading: "Добавить фильтр",
			descr: "Выберите свойство по которому можно будет фильтровать позиций в группе <b>" + data.group.group_title + "</b>",
			label: 'Выберите свойство', 
			type: 'text',
			name: 'prop_nick',
			find: 'prop_nick',
			action: '/-shop/set-group-filter',
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
			search:'/-shop/get-group-card-prop-search',
			value: 'Добавить свойство',
			heading: "Добавить свойство",
			descr: "Выберите свойство, которое показать на карточке в группе <b>" + data.group.group_title + "</b>",
			label: 'Выберите свойство', 
			type: 'text',
			name: 'prop_nick',
			find: 'prop_nick',
			action: '/-shop/set-group-card',
			args: {group_id: data.group.group_id},
			reloaddiv: env.layer.div
		})}
	</p>
`
const showParent = (data, env) => `
	<a href="groups/${data.group?.parent_id || ''}">${data.group?.parent_title || '<i>Корень</i>'}</a>
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
			action: '/-shop/set-sample-prop-value-delete',
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
// 	action: '/-shop/set-sample-prop-value-create',
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
				action: '/-shop/set-sample-prop-delete',
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
					search: '/-shop/get-prop-value-search?type=samplevalue&prop_nick=' + props[0].prop_nick + '&group_nick=' + data.group.group_nick,
					value: 'Добавить значение',
					heading: "Выберите значение",
					descr: descrPropValue(data, env, props[0]),
					label: 'Выберите значение', 
					type: 'text',
					name: 'value_nick',
					find: 'value_nick',
					action: '/-shop/set-sample-prop-value-create',
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
				const ans = await senditmsg(list, '/-shop/set-card-ordain', {group_id : "${data.group.group_id}", prop_nick: id, next_nick: next_id})
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
				action: '/-shop/set-card-delete',
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
				action: '/-shop/set-filter-delete',
				args: {
					prop_nick: filter.prop_nick, 
					group_id: data.group.group_id, 
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
				search:'/-shop/get-sample-prop-search?type=sampleprop',
				value: 'Добавить критерий',
				heading: "Добавить критерий",
				descr: "Выберите свойство-критерий для попадания позиций в группу <b>" + data.group.group_title + "</b>. Подходят value, number.",
				label: 'Выберите свойство', 
				type: 'text',
				name: 'prop_nick',
				find: 'prop_nick',
				action: '/-shop/set-sample-prop-create',
				args: {sample_id},
				reloaddiv: env.layer.div
			})}
			${field.button({
				cls: 'transparent mute',
				label: svg.cross(), 
				confirm: 'Удалить всю выборку?',
				action: '/-shop/set-sample-delete',
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
				<td></td>
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
const showGroupSamples = (data, env) => `
	<div class="block">
		<div class="title">Выборки</div>
		<div class="body">
			${Object.keys(data.samples).length ? showTableSamples(data, env) : ''}
			${field.search({
				cls: 'a',
				search:'/-shop/get-sample-prop-search?type=sample',
				value: 'Добавить выборку',
				heading: "Добавить критерий",
				descr: "Выберите свойство-критерий для попадания позиций в группу <b>" + data.group.group_title + "</b>.",
				label: 'Выберите свойство', 
				type: 'text',
				name: 'prop_nick',
				find: 'prop_nick',
				action: '/-shop/set-sample-create',
				args: {group_nick: data.group.group_nick},
				reloaddiv: env.layer.div
			})}
			<p>В группу выбрано <span title="Моделей ${data.modcount}, позиций ${data.poscount}">${data.poscount}</span> ${words(data.poscount, 'позиция', 'позиции', 'позиций')}</p>
		</div>
	</div>
`


const showGroups = (data, env) => `
	
	${data.childs.length ? showTableGroups(data, env, data.group) : ''}	
	<p>
		${field.prompt({
			value: 'Добавить подгруппу', 
			name: 'group_title',
			input: '',
			ok: 'ОК', 
			label: 'Укажите название', 
			descr: '',
			cls: 'a',
			type: 'text', 
			action: '/-shop/set-group-create', 
			args: {group_nick: data.group?.group_nick ?? null},
			reloaddiv: env.layer.div
		})}
	</p>
	
	
`
const showFree = (data, env) => `
	<div class="block">
		<div class="title">
			Нераспределённые позиции 
			<span title="Моделей ${data.freetable?.modcount || 0}, позиций ${data.freetable?.poscount || 0}, ">${data.freetable?.poscount || 0}</span>
		</div>
		<div class="body">
			<form style="display: flex; margin: 1em 0">
				<div class="float-label">
					<input id="freeinp" name="search" type="text" placeholder="Поиск" value="${env.bread.get.search ?? ''}">
					<label for="freeinp">Поиск</label>
				</div>
				<button type="submit">Найти</button>
				<script>
					(form => {
						const btn = form.querySelector('button')
						const input = form.querySelector('input')
						form.addEventListener('submit', async (e) => {
							e.preventDefault()
							const Client = await window.getClient()
							Client.go('groups${data.group ? '/' + data.group.group_id : ''}?search=' + input.value, false)
						})
					})(document.currentScript.parentElement)
				</script>
			</form>

			
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
		</div>
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
				const ans = await senditmsg(list, '/-shop/set-group-ordain', {id, next_id})
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
				const ans = await senditmsg(list, '/-shop/set-filter-ordain', {group_id : "${data.group.group_id}", prop_nick: id, next_nick: next_id})
			})
		})(document.currentScript.previousElementSibling)
	</script>
`
const showGroup = (data, env, group) => `
	<tr data-id="${group.group_id}" style="white-space: nowrap;" class="item">
		<td>
			<a href="groups/${group.group_id}">${group.group_title}</a>
		</td>
		
		<td title="Моделей ${group.modcount}, позиций ${group.poscount}">${group.poscount}</td>
		<td>${group.childs}</td>
		<td>
			${field.button({
				cls: 'transparent mute',
				label: svg.cross(), 
				confirm: 'Удалить группу?',
				action: '/-shop/set-group-delete',
				args: {group_nick: group.group_nick},
				reloaddiv: env.layer.div
			})}
		</td>
	</tr>
`
