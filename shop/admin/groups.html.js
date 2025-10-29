export const css = ['/-sources/revscroll.css']
import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
import print from "/-words/print.html.js"
import words from "/-words/words.html.js"
import svg from "/-sources/svg.html.js"
import ddd from "/-words/date.html.js"
import addget from "/-sources/addget.js"

const spancount = (data = {}) => `
	<span title="Моделей ${data.modcount || 0}, позиций ${data.poscount || 0}, ">${data.poscount || 0}</span>
`
// const showGroupNick = (data, env) => `
// 	<tr>
// 		<td>group_nick</td><td>${data.group.group_nick}</td>
// 	</tr>
// `
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
	
		${env.scope} .red {
			color: FireBrick ;
			
		}
		${env.scope} table thead td {
			font-weight: normal;
		}
		${env.scope} .green {
			color: green;
			
		}
	</style>
	${data.group ? showParent(data, env) : ''}
	<h1>${data.group?.group_title || '<i>Корень</i>'}</h1>
	<p>
		Позиций:${spancount(data)}
	</p>
	
	${showGroups(data, env)}
	${data.group ? showGroupPositions(data, env) : ''}
	${data.group ? showGroupOptions(data, env) : ''}
	${data.group ? showGroupActions(data, env) : ''}
	<a href="brief${data.group?.group_id ? '/' + data.group.group_id : ''}">Статистика</a>

		<a href="poss?count=25${data.group?.group_id ? '&group_id=' + data.group.group_id : ''}">Позиции</a>

	${data.group?.group_title ? '' : showHelp(data, env)}
	<script>
		(div => {
			for (const block of div.querySelectorAll('.block')) {
				const title = block.querySelector('.title')
				const name = 'shop_blocks_' + title.innerText;
				const body = block.querySelector('.body')
				if (sessionStorage.getItem(name)) block.classList.add('show')
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
const showHelp = (data, env) => `
	<p style="max-width:700px">
		Из <a href="/@atee/sources">источников</a> все позиции, у которых указаны БрендАрт и БрендМодель, попадают в нераспределённые позиции в Корень. В группах надо указать выборки согласно, которым нераспределённые позиции будут выбираться в эти группы.
	</p>
`
// const showGroupStats = (data, env) => `
// 	<a href="brief${data.group?.group_id ? '/' + data.group.group_id : ''}">Статистика</a>
// `
// const showGroupStats2 = (data, env) => `
// 	<div class="block${globalThis.sessionStorage?.getItem('shop_blocks_Статистика') ? ' show' : ''}">
// 		<div class="title">Статистика</div>
// 		<div class="body">

// 			<div class="revscroll" style="margin:1em 0">
// 				<table>
// 					<thead>
// 						<tr>
// 							<th>Год</th>
// 							<th>Месяц</th>
// 							${showStatHead(data,env)}
// 						</tr>
// 					</thead>
// 					<tbody>
// 						${(data.stats || []).map(row => showRow(data, env, data.group, row)).join('')}
// 					</tbody>
// 				</table>
// 			</div>

// 		</div>
// 	</div>
// `
// const showRow = (data, env, group, stat) => `
// 	<tr>
// 		<th>${stat.year}</th>
// 		<th>${MONTH[stat.month]}</th>
// 		${showStatTds(data, env, group, stat)}
// 	</tr>
// `
const showGroupPositions = (data, env) => `
	<div class="block${globalThis.sessionStorage?.getItem('shop_blocks_Позиции') ? ' show' : ''}">
		<div class="title">Позиции</div>
		<div class="body">
			<p>Нераспределённые позиции этой группы: ${spancount(data.myfreetable)}</p>
			${showFree(data, env, data.myfreetable)}
		</div>
	</div>
`
const showGroupActions = (data, env) => `
	<div class="block${globalThis.sessionStorage?.getItem('shop_blocks_Действия') ? ' show' : ''}">
		<div class="title">Действия</div>
		<div class="body">
			<p>
				${field.search({
					cls: 'a',
					search:'/-shop/admin/get-group-search',
					value: 'Перенести',
					heading: "Перенос группы",
					descr: "Выберите куда перенести группу <b>" + data.group.group_title + "</b>.",
					label: 'Новая родительская группа', 
					type: 'text',
					name: 'group_nick',
					find: 'group_nick',
					action: '/-shop/admin/set-group-move',
					args: {group_id: data.group.group_id},
					global: 'check'
				})}, 
				${field.search({
					cls: 'a',
					search:'/-shop/admin/get-group-search',
					value: 'Копировать',
					heading: "Копирование группы",
					descr: "Выберите куда скопировать выборки, название и настройки группы <b>" + data.group.group_title + "</b>.",
					label: 'Новая родительская группа', 
					type: 'text',
					name: 'group_nick',
					find: 'group_nick',
					action: '/-shop/admin/set-group-copy',
					args: {group_id: data.group.group_id},
					goid: 'group_id',
					go: 'groups/'
				})},
				${field.button({
					cls: 'a',
					label: 'Удалить', 
					confirm: 'Удалить группу?',
					action: '/-shop/admin/set-group-delete',
					args: {group_nick: data.group.group_nick},
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
							action: '/-shop/admin/set-group-title', 
							args: {group_id: data.group.group_id},
							global: 'check'
						})}
					</td>
				</tr>
				<tr>
					<td>Изменить ник</td>
					<td>
						${field.prompt({
							value: data.group.group_nick, 
							name: 'next_nick',
							input: data.group.group_nick,
							ok: 'ОК', 
							label: 'Укажите никнейм', 
							descr: '',
							cls: 'a',
							type: 'text', 
							action: '/-shop/admin/set-group-nick', 
							args: {group_id: data.group.group_id},
							global: 'check'
						})}
					</td>
				</tr>
				<tr>
					<td>SEO image_src</td>
					<td>
						${field.prompt({
							value: data.group.image_src || 'указать путь', 
							name: 'image_src',
							input: data.group.image_src,
							ok: 'ОК', 
							label: 'Путь до картинки с http', 
							descr: '',
							cls: 'a',
							type: 'text', 
							action: '/-shop/admin/set-group-image_src', 
							args: {group_id: data.group.group_id}
						})}
					</td>
				</tr>
				<tr>
					<td>SEO description</td>
					<td>
						<div style="float:right; position: relative; clear:both">
							${field.prompt({
								cls: 'a mute',
								type: 'area',
								name: 'description', 
								label: 'Описание (description)',
								value: svg.edit(), 
								action: '/-shop/admin/set-group-description', 
								args: {group_id: data.group.group_id},
								reloaddiv: env.layer.div,
								input: data.group.description
							})}
						</div>
						<div style="font-style: italic; margin-right:2em">${data.group.description}</div>
						
					</td>
				</tr>
			</table>				
			
			

		</div>
	</div>
`

const showGroupOptions = (data, env) => `
	
	${showGroupSamples(data, env)}
	<div class="block${globalThis.sessionStorage?.getItem('shop_blocks_Фильтры') ? ' show' : ''}">
		<div class="title">Фильтры</div>
		<div class="body">
			<p>
				${field.setpop({
					heading:'Фильтры в группе',
					cls: 'a',
					value: data.group.self_filters,
					name: 'bit',
					action: '/-shop/admin/set-group-self_filters', 
					values: {"":"Фильтры наследуются", "1":"Свои фильтры"},
					args: {group_id: data.group.group_id},
					global: 'check'
				})}
			</p>
			${data.group.self_filters ? showGroupFilters(data, env) : ''}
		</div>
	</div>
	<div class="block${globalThis.sessionStorage?.getItem('shop_blocks_Карточка') ? ' show' : ''}">
		<div class="title">Карточка</div>
		<div class="body">
			<p>${!data.group.self_cards ? field.setpop({
				heading:'Cвойства на карточках',
				cls: 'a',
				value: data.group.self_cards,
				name: 'bit',
				action: '/-shop/admin/set-group-self_cards', 
				values: {"":"Свойства на карточках наследуются", "1":"Свои свойства на карточках"},
				args: {group_id: data.group.group_id},
				global: 'check'
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
			search:'/-shop/admin/get-group-filter-prop-search',
			value: 'Добавить фильтр',
			heading: "Добавить фильтр",
			descr: "Выберите свойство по которому можно будет фильтровать позиций в группе <b>" + data.group.group_title + "</b>",
			label: 'Выберите свойство', 
			type: 'text',
			name: 'prop_nick',
			find: 'prop_nick',
			action: '/-shop/admin/set-group-filter',
			args: {group_id: data.group.group_id},
			global: 'check'
		})}
	</p>
`
const showCards = (data, env) => `
	${data.cards?.length ? showTableCards(data, env) : ''}
	<p>
		${field.search({
			cls: 'a',
			search:'/-shop/admin/get-group-card-prop-search',
			value: 'Добавить свойство',
			heading: "Добавить свойство",
			descr: "Выберите свойство, которое показать на карточке в группе <b>" + data.group.group_title + "</b>",
			label: 'Выберите свойство', 
			type: 'text',
			name: 'prop_nick',
			find: 'prop_nick',
			action: '/-shop/admin/set-group-card',
			args: {group_id: data.group.group_id},
			global: 'check'
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
		${mark.value_title || (mark.number / 10 ** mark.scale) || showRed(mark.value_nick)}
		${field.button({
			cls: 'transparent mute',
			label: svg.cross(), 
			confirm: 'Удалить занчение?',
			action: '/-shop/admin/set-sample-prop-value-delete',
			global: 'check',
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
// 	action: '/-shop/admin/set-sample-prop-value-create',
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
				action: '/-shop/admin/set-sample-prop-delete',
				global: 'check',
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
					search: '/-shop/admin/get-prop-value-search?type=samplevalue&prop_nick=' + props[0].prop_nick + '&group_id=' + data.group.group_id,
					value: 'Добавить значение',
					heading: "Выберите значение",
					descr: descrPropValue(data, env, props[0]),
					label: 'Выберите значение', 
					type: 'text',
					name: 'nick',
					find: 'nick',
					action: '/-shop/admin/set-sample-prop-value-create',
					args: { sample_id, prop_nick: props[0].prop_nick},
					global: 'check'
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
				const ans = await senditmsg(list, '/-shop/admin/set-card-ordain', {group_id : "${data.group.group_id}", prop_nick: id, next_nick: next_id})
				const Client = await window.getClient()
				Client.global('check')
			})
		})(document.currentScript.previousElementSibling)
	</script>
`
const showCard = (data, env, card) => `
	<tr data-id="${card.prop_nick}" style="white-space: nowrap;" class="item">
		<td>
			<a href="poss?group_id=${data.group.group_id}&m=:${card.prop_nick}=empty">${card.prop_title || showRed(card.prop_nick)}</a>
			
		</td>
		<td>
			${field.button({
				cls: 'transparent mute',
				label: svg.cross(), 
				confirm: 'Удалить свойство?',
				action: '/-shop/admin/set-card-delete',
				args: {
					prop_nick: card.prop_nick, 
					group_id: data.group.group_id
				},
				global: 'check'
			})}			
		</td>
	</tr>
`
const showFilter = (data, env, filter) => `
	<tr data-id="${filter.prop_nick}" style="white-space: nowrap;" class="item">
		<td>
			<a href="poss?group_id=${data.group.group_id}&m=:${filter.prop_nick}=empty">${filter.prop_title || showRed(filter.prop_nick)}</a>
		</td>
		<td>
			${field.button({
				cls: 'transparent mute',
				label: svg.cross(), 
				confirm: 'Удалить занчение?',
				action: '/-shop/admin/set-filter-delete',
				args: {
					prop_nick: filter.prop_nick, 
					group_id: data.group.group_id, 
				},
				global: 'check'
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
				search:'/-shop/admin/get-sample-prop-search?type=sampleprop',
				value: 'Добавить критерий',
				heading: "Добавить критерий",
				descr: "Выберите свойство-критерий для попадания позиций в группу <b>" + data.group.group_title + "</b>. Подходят value, number.",
				label: 'Выберите свойство', 
				type: 'text',
				name: 'prop_nick',
				find: 'prop_nick',
				action: '/-shop/admin/set-sample-prop-create',
				args: {sample_id},
				global: 'check'
			})}
			${field.button({
				cls: 'transparent mute',
				label: svg.cross(), 
				confirm: 'Удалить всю выборку?',
				action: '/-shop/admin/set-sample-delete',
				global: 'check',
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

const showGroupSamples = (data, env) => `
	<div class="block${globalThis.sessionStorage?.getItem('shop_blocks_Выборки') ? ' show' : ''}">
		<div class="title">Выборки</div>
		<div class="body">
			${Object.keys(data.samples || {}).length ? showTableSamples(data, env) : ''}
			${field.search({
				cls: 'a',
				search:'/-shop/admin/get-sample-prop-search?type=sample',
				value: 'Добавить выборку',
				heading: "Добавить критерий",
				descr: "Выберите свойство-критерий для попадания позиций в группу <b>" + data.group.group_title + "</b>.",
				label: 'Выберите свойство', 
				type: 'text',
				name: 'prop_nick',
				find: 'prop_nick',
				action: '/-shop/admin/set-sample-create',
				args: {group_id: data.group.group_id},
				global: 'check'
			})}
			<!-- <p>В группу выбрано <span title="Моделей ${data.modcount}, позиций ${data.poscount}">${data.poscount}</span> ${words(data.poscount, 'позиция', 'позиции', 'позиций')}</p> -->
			<p>Нераспределённые позиции в родительской группе: ${spancount(data.freetable)}</p>
			${showFree(data, env, data.freetable, true)}
		</div>
	</div>
`


const showGroups = (data, env) => `
	
	${data.childs?.length ? showTableGroups(data, env, data.group) : ''}	
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
			action: '/-shop/admin/set-group-create', 
			args: {group_nick: data.group?.group_nick ?? null},
			goid:'group_id',
			go:'groups/'
		})}
	</p>
	
	
`
const showFree = (data, env, freetable, addcheckbox = false) => !freetable.rows.length ? '' : `
	
	<div>
		<form style="display: flex; margin: 1em 0; gap: 1em">
			<div class="float-label">
				<input id="freeinp" name="search" type="search" placeholder="Поиск" value="${env.bread.get.query ?? ''}">
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
						const addget = await import('/-sources/addget.js').then(r => r.default)
						const search = addget(Client.bread.get, {query: input.value},['count', 'query'])
						Client.go('groups${data.group ? '/' + data.group.group_id : ''}'+search, false)
					})
				})(document.currentScript.parentElement)
			</script>
		</form>

		
		<div class="revscroll">
			<table>
				<thead>
					${showTr(data, env, freetable?.head || [], freetable?.indexes, addcheckbox)}
				</thead>
				<tbody>
					${(freetable?.rows || []).map(row => showTr(data, env, row, freetable?.indexes, addcheckbox)).join('')}
				</tbody>
			</table>
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
		</div>
		${addcheckbox ? resumeCheckBox(data, env) : ''}
		${!env.bread.get.count && freetable.poscount > freetable?.rows.length ? linkMore(data, env) : ''}
		${env.bread.get.count ? linkLess(data, env) : ''}
	</div>
`
const resumeCheckBox = (data, env) => `
	
	<button class="resume" style="margin:1em 0; display: none;">Добавить выбранные</button>
		
	<script>
		(div => {

			const resume = div.querySelector('.resume')
			const thead = div.querySelector('thead')
			const tbody = div.querySelector('tbody')
			const boxes = tbody.querySelectorAll('input')
			const bos = thead.querySelector('input')
			const check = () => {
				let isany = false
				for (const box of boxes) {
					isany = isany || box.checked
					if (isany) break
				}
				resume.style.display = isany ? 'block' : 'none'
			}

			bos.addEventListener('click', () => {
				for (const box of boxes) box.checked = bos.checked
				check()
			})
			for (const box of boxes) {
				box.addEventListener('click', () => {
					bos.checked = false
					let isall = true
					for (const box of boxes) isall = isall && box.checked
					bos.checked = isall
					check()
				})
			}
			resume.addEventListener('click', async () => {
				const Client = await window.getClient()
				const nicks = []
				const nicked = await import('/-nicked').then(r => r.default)
				for (const box of boxes) if (box.checked) nicks.push(nicked(box.value))
				const senditmsg = await import('/-dialog/senditmsg.js').then(r => r.default)
				const group_id = ${data.group.group_id || null}
				const ans = await senditmsg(resume, '/-shop/admin/set-sample-boxes', {group_id, nicks})
				Client.global('check')
			})

		})(document.currentScript.parentElement)
	</script>
`
const linkMore = (data, env) => `<a href="groups${data.group ? '/' + data.group.group_id : ''}${addget(env.bread,{count:10000},['count','query'])}">Показать всё</a>`
const linkLess = (data, env) => `<a href="groups${data.group ? '/' + data.group.group_id : ''}${addget(env.bread,{count:null},['count','query'])}">Скрыть всё</a>`
const showTr = (data, env, row, indexes, addcheckbox) => `
	<tr>
		${addcheckbox ? showCheckTd(data, env, row, indexes) : ''}
		${row.map(title => showTd(data, env, title)).join('')}
	</tr>
`
const showCheckTd = (data, env, row, indexes) => `
	<td><input value="${row[indexes.brendmodel]}" type="checkbox"></td>
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
				const ans = await senditmsg(list, '/-shop/admin/set-group-ordain', {id, next_id})
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
				const ans = await senditmsg(list, '/-shop/admin/set-filter-ordain', {group_id : "${data.group.group_id}", prop_nick: id, next_nick: next_id})
			})
		})(document.currentScript.previousElementSibling)
	</script>
`
const showTableGroups = (data, env, group) => `
	
	<!-- <div class="revscroll"> -->
		<table draggable="false" class="list">
			<thead>
				<tr>
					<td></td>
					${showStatHead(data, env)}
					<td></td>
				</tr>
			</thead>
			<tbody draggable="false">
				${data.childs.map(group => showGroup(data, env, group)).join('')}
			</tbody>
		</table>
		${showScriptDragGroups(data, env)}
		<script>
			(async div => { //revscroll
				const name = 'revscroll_shop_groups_${data.group?.group_id || ""}'
				div.scrollLeft = window.sessionStorage.getItem(name) || 0
				div.addEventListener('scroll', e => {
					window.sessionStorage.setItem(name, div.scrollLeft)
				}, {passive: true})

			})(document.currentScript.parentElement)
		</script>
	<!-- </div> -->
`

const percentTd = (stat, sum = stat.poscount ? Math.round(stat.withall / stat.poscount * 100) : 0) => `
	<td class="${sum == 100 ? 'green' : 'red'}" title="${stat.poscount - stat.withall}">${sum}%</td>
`

const showGroup = (data, env, row) => `
	<tr data-id="${row.group.group_id}" style="white-space: nowrap;" class="item">
		<td>
			<a href="groups/${row.group.group_id}">${row.group.group_title}</a>
		</td>
		${showStatTds(data, env, row, row.group)}
		<td>
			${field.button({
				cls: 'transparent mute',
				label: svg.cross(), 
				confirm: 'Удалить группу?',
				action: '/-shop/admin/set-group-delete',
				args: {group_nick: row.group.group_nick},
				global: 'check'
			})}
		</td>
	</tr>
`
const showStatHead = (data, env) => `
	<td>Подгрупп</td>
	<td title="Не распределённых по группам">Нерасп</td>
	<td title="Распределённых по группам">Распред</td>
	<td>Позиций</td>
	<td>Фильтров</td>
	<td>На&nbsp;карточке</td>
	<td></td>
`
const showStatTds = (data, env, row, group) => `
	<td>${group.child_ids.length ?? '&mdash;'}</td>
	<td class="${group.child_ids.length && row.freeposcount ? 'red' : ''}">${row.freeposcount ?? '&mdash;'}</td>
	<td>${row.busyposcount ?? '&mdash;'}</td>
	<td><a href="poss?group_id=${group.group_id}">${row.poscount ?? '&mdash;'}</a></td>
	
	<td>${group.filter_nicks.length ?? '&mdash;'}</td>
	<td>${group.card_nicks.length ?? '&mdash;'}</td>
	<td><a class="mute" href="brief/${group.group_id}">Статистика</a></th>
	
`

const redTd = (data, group, stat, name, filter_prop_nick, sum = stat.poscount - stat[name]) => filter_prop_nick ? (
	group ? `
	<td><a target="about:blank" style="opacity:0.5" class="${sum ? 'red' : 'green'}" href="poss?group_id=${group.group_id}&m=:${filter_prop_nick}=empty">${sum || '✓'}</a></td>
	` : `
		<td><span style="opacity:0.5" class="${sum ? 'red' : 'green'}">${sum || '✓'}</span></td>
	`) : `
	<td style="opacity:0.5" class="${sum ? 'red' : 'green'}">${sum || '✓'}</td>
`
const MONTH = {
	"1":"Январь",
	"2":"Февраль",
	"3":"Март",
	"4":"Апрель",
	"5":"Май",
	"6":"Июнь",
	"7":"Июль",
	"8":"Август",
	"9":"Сентябрь",
	"10":"Октябрь",
	"11":"Ноябрь",
	"12":"Декабрь"
}