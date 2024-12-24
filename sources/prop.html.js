import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
import date from "/-words/date.html.js"
import svg from "/-sources/svg.html.js"
export const css = ['/-sources/represent.css']

export const ROOT = (data, env, entity = data.entity) => err(data, env, ["PROP"]) || `
	<div id="PROP"></div>
`
export const PROP = (data, env, prop = data.prop, entity = data.entity) => !data.result ? '' : `
	<div style="opacity:0.5; float:right">Свойство у <a href="entity/${entity.entity_id}">${entity.entity_title}</a></div>
	<h1>${prop.prop_title}</h1>
	<p>
		
		<button class="a">Настроить видимость</button>
		<script>
			(btn => {
				btn.addEventListener('click', async () => {
					const represent = await import('/-sources/represent.js').then(r => r.default)
					represent.popup(${JSON.stringify({prop_id: prop.prop_id})}, '${env.layer.div}')
				})
			})(document.currentScript.previousElementSibling)
		</script>
	</p>
	<table style="margin: 0em 0">
		
		
		
		<tr>
			<td>
				Значений
			</td>
			<td>
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
		</tr>
		<tr>
			<td>
				Тип
			</td>
			<td>
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
		</tr>
		
		<tr>
			<td>Обработка</td>
			<td>
				${field.setpop({
					heading:'Обработка',
					value: prop.known, 
					name: 'bit',
					descr: 'Специальные свойства имеют своё предназначение и в массив more для автоматической обработки не попадают. Старое название column. ',
					action: '/-sources/set-prop-prop', 
					values: {"":"Авто", "1":"Спец"},
					args: {prop_id: prop.prop_id, propprop: 'known'}
				})}
			</td>
		</tr>
	</table>
	
	${showComment(data, env, prop)}
		
	

	<table style="table-layout: fixed">
		<thead>
			<tr>
				<td></td>
				<td>text</td>
				<td>Преимущество</td>
				<td>Всего</td>
				<td>number</td>
				<td>date</td>
				<td>value_id</td>
				<td>value_title</td>
				<td>value_nick</td>
			</tr>
		</thead>
		<tbody>
			${data.list.map(row => showValueTr(data, env, row)).join('')}
		</tbody>
	</table>
	<script>
		(div => {
			const name = 'represent_value'
			const prop_id = ${data.prop.prop_id}
			for (const btn of div.getElementsByClassName(name)) {
				btn.addEventListener('click', async () => {
					const value_id = btn.dataset.value_id
					const represent = await import('/-sources/represent.js').then(r => r.default)
					const data = await represent.set(btn, name, {prop_id, value_id})
					if (!data.result) return
					// const Client = await window.getClient()
					// Client.reloaddiv('${env.layer.div}')
				})
			}
		})(document.currentScript.parentElement)
	</script>
	<p>
		Всего: <b>${data.count}</b>, показано <b>${data.count > 1000 ? 1000 : data.count}</b>.
	</p>
	<div>
		${field.textok({
			value: prop.prop_title,
			type: 'text',
			name: 'title',
			label: 'Изменить регистр', 
			action: '/-sources/set-prop-title',
			reloaddiv: env.layer.div,
			args: {prop_id: prop.prop_id}
		})}
	</div>
`
const showValueTr = (data, env, row) => `
	<tr style="${row.pruning ? 'background: hsl(0, 100%, 97%)' : ''}">
		<td>
			<button data-value_id="${row.value_id}" class="represent_value eye transparent ${row.cls?.main} ${row.cls?.custom}">${svg.eye()}</button>
		</td>
		<td>${row.text}</td>
		<td>${row.winner ? 'Показано' : 'Скрыто'}</td>
		<td>${row.count}</td>
		<td>${row.number != null ? parseFloat(row.number) : ''}</td>
		<td><nobr>${date.sdmyhi(row.date)}</nobr></td>
		<td>${row.value_id ?? ''}</td>
		<td>${row.value_title ?? ''}</td>
		<td>${row.value_nick ?? ''}</td>
		
	</tr>
`
const showComment = (data, env, prop) => `
	<div style="margin: 1em 0">
		${field.area({
			name: 'comment', 
			label: 'Комментарий', 
			action: '/-sources/set-prop-comment', 
			args: {prop_id: prop.prop_id},
			value: prop.comment
		})}
	</div>
`