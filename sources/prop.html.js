import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
import date from "/-words/date.html.js"
import svg from "/-sources/svg.html.js"
export const css = ['/-sources/represent.css','/-sources/revscroll.css']

export const ROOT = (data, env, prop = data.prop, entity = data.entity) => err(data, env, ["PROP"]) || `
	
	<div style="opacity:0.5; float:right"><a href="props">Свойства</a></div>
	<h1>${prop.name}&nbsp;<sup style="color:var(--primary)">${prop.unit}</sup></h1>
	<p>
		
		
	</p>
	<table style="margin: 0em 0">
		<tr>
			<td>
				Видимость
			</td>
			<td>
				<button class="a">Настроить</button>
				<script>
					(btn => {
						btn.addEventListener('click', async () => {
							const represent = await import('/-sources/represent.js').then(r => r.default)
							represent.popup(${JSON.stringify({prop_id: prop.prop_id})}, '${env.layer.div}')
						})
					})(document.currentScript.previousElementSibling)
				</script>
			</td>
		</tr>
		<tr>
			<td>
				Обработка
			</td>
			<td>
				${field.setpop({
					heading:'Обработка свойства',
					cls: 'a',
					value: prop.known,
					name: 'known',
					descr: '<b>more</b> означает, что у свойства нет специальной обработки и оно покажется вместе со всеми такими свойствами в общем списке. Свойство со специальной обработкой <b>column</b> покажется только там, где его покажет программист, по умолчанию в интерфейсе нигде не покажется, но придёт с данными. Свойство <b>secondary</b> не идентифицирует позицию. Такие свойства являются производными. Например свойство "Ширина кровати с боковинами" является производным от "Ширины кровати" и является вторичным. "Ширина кровати с боковинами" выбирать не нужно, чтобы определить позицию для заказа.',
					action: '/-sources/set-known', 
					values: {"system":"🛡️ system", "more":"🟡 more", "column":"✅ column", "secondary":"📋 secondary"},
					args: {prop_id: prop.prop_id}
				})}
			</td>
		</tr>
		<tr>
			<td>
				Значений
			</td>
			<td>
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
		</tr>
		<tr>
			<td>
				Тип
			</td>
			<td>
				${field.setpop({
					heading:'Тип',
					value: prop.type,
					cls: 'a',
					name: 'type',
					descr: 'Тип определяет способ хранения значений для дальнейшей быстрой выборки. Самый оптимальный <b>number</b>, далее <b>date</b>, затем <b>volume</b> если повторяется и короче <b>127 символов</b>. И последний оригинальный вариант <b>text</b>. Для ключей и связей подходит только value.',
					action: '/-sources/set-prop-type', 
					values: {"number":"number", "date":"date", "value":"value", "text":"text"},
					args: {prop_id: prop.prop_id},
					global: 'check'
				})}
			</td>
		</tr>
		<tr>
			<td>
				Точность
			</td>
			<td>
				${field.prompt({
					heading:'Точность',
					value: prop.scale,
					input: prop.scale,
					cls: 'a',
					name: 'scale',
					label: 'Точность',
					type: 'number',
					descr: 'Сколько знаков после запятой для типа number',
					action: '/-sources/set-prop-scale', 
					args: {prop_id: prop.prop_id},
					global: 'check'
				})}
			</td>
		</tr>
		<tr>
			<td>
				Регистр
			</td>
			<td>
				${field.setpop({
					heading:'Изменить регистр значений',
					cls: 'a',
					value: prop.lettercase,
					name: 'lettercase',
					descr: 'Одно значение может использоваться у разных свойств. Регистр значения будет изменён для всех свойств, где оно используется. <b>lower</b> &mdash; все прописные, <b>upper</b> &mdash; все заглавные, <b>firstup</b> &mdash; первая заглавная остальные прописные.',
					action: '/-sources/set-prop-lettercase', 
					values: {"ignore":"ignore", "lower":"lower", "upper":"upper", "firstup":"firstup"},
					args: {prop_id: prop.prop_id},
					global: 'check'
				})}
			</td>
		</tr>
		<tr>
			<td>
				prop_nick
			</td>
			<td>
				${prop.prop_nick}
			</td>
		</tr>
		<tr>
			<td>
				Синонимы
			</td>
			<td>
				<div style="display: grid; gap: 0.25em; margin-bottom: 0.25em">
					${data.synonyms.map(syn => showSynonym(data, env, syn)).join('')}
				</div>
				${field.prompt({
					edit: true,
					cls: 'a',
					value: 'Добавить', 
					name: 'col_title',
					input: '',
					ok: 'Добавить', 
					label: 'Укажите имя колонки', 
					descr: 'Если не будет одноимённого свойства, свойство для колонки попробует определиться по синонимам. Колонка "Вес" не имеет свойства <Вес>, но есть синоним |Вес| у свойства <Вес, кг>, по этому для колонки "Вес" будет назначено свойство <Вес, кг>. Если есть колонка "Вес, кг", то по прямому совпадению ей тоже будет назначено свойство <Вес, кг>. Победит, то значение, которое будет в последнем свойстве, которое какбы перезапишет все предыдущие повторы.',
					type: 'text', 
					action: '/-sources/set-prop-synonym-create', 
					args: {prop_id: prop.prop_id},
					global: 'check'
				})}
			</td>
		</tr>
		<tr>
			<td>
				Ед.изм
			</td>
			<td>
				${prop.unit || '<i>Может указываться в названии после запятой</i>'}
			</td>
		</tr>
		<tr>
			<td>
				Изменить регистр
			</td>
			<td>
				${field.areamin({
					value: prop.prop_title,
					cls: 'a',
					type: 'text',
					name: 'title',
					label: 'Изменить регистр', 
					action: '/-sources/set-prop-title',
					global: 'check',
					args: {prop_id: prop.prop_id}
				})}
			</td>
		</tr>
	</table>
	

	${showComment(data, env, prop)}
	<p>
		Всего: <b>${data.count}</b>.
	</p>
	${~['number','value'].indexOf(prop.type) ? showSearch(data, env, prop) : ''}
	
	<div class="revscroll">
		<table style="table-layout: fixed">
			<thead>
				<tr>

					<td>text</td>
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
						const Client = await window.getClient()
						Client.global('recalc')
					})
				}
			})(document.currentScript.parentElement)
		</script>
	</div>	
`
const showSearch = (data, env, prop) => `
	<form style="display: flex; margin: 1em 0; gap: 1em">
		<div class="float-label">
			<input id="freeinp" name="query" type="search" placeholder="Поиск" value="${env.bread.get.query ?? ''}">
			<label for="freeinp">Поиск</label>
		</div>
		<button type="submit">Найти</button>
		<script>
			(form => {
				const btn = form.querySelector('button')
				const input = form.querySelector('input')
				input.focus()
				input.setSelectionRange(input.value.length, input.value.length)
				form.addEventListener('submit', async (e) => {
					e.preventDefault()
					const Client = await window.getClient()
					Client.go('prop/${prop.prop_id}?query=' + input.value, false)
					Client.reloaddiv("${env.layer.div}")
				})
			})(document.currentScript.parentElement)
		</script>
	</form>
`
// <td></td>
const showSynonym = (data, env, syn) => `
	<div>${syn.col_title}
			${field.button({
				cls: 'transparent mute',
				label: svg.cross(), 
				confirm: 'Удалить синоним, зависимые назначения свойств сбросятся?',
				action: '/-sources/set-prop-synonym-delete',
				args: {col_nick: syn.col_nick, prop_id: data.prop.prop_id},
				global: 'check'
			})}</div>
`
// <td>
// 			<button data-value_id="${row.value_id}" class="represent_value eye transparent ${row.cls?.main} ${row.cls?.custom}">${svg.eye()}</button>
// 		</td>
const showValueTr = (data, env, row) => `
	<tr style="${row.pruning ? 'background: hsl(0, 100%, 97%)' : ''}">
		<td>${row.text}</td>
		<td>${row.count}</td>
		<td>${row.number != null ? row.number / 10 ** data.prop.scale : ''}</td>
		<td><nobr>${date.sdmyhi(row.date)}</nobr></td>
		<td>${row.value_id ?? ''}</td>
		<td>${row.value_title ? showValueTitle(data, env, row) : ''}</td>
		<td><a href="rows?query=${row.value_nick ?? ''}">${row.value_nick ?? ''}</a></td>
		
	</tr>
`
const showValueTitle = (data, env, row) => `
	
	${field.prompt({
		label:'Изменить регистр значения',
		cls: 'a',
		type: 'text',
		value: row.value_title,
		input: row.value_title,
		name: 'title',
		descr: '',
		action: '/-sources/set-value-title', 		
		args: {value_id: row.value_id}
	})}
`
const showComment = (data, env, prop) => `
	<div style="float:right;position: relative">
		${field.prompt({
			cls: 'a mute',
			type: 'area',
			name: 'comment', 
			label: 'Комментарий',
			value: svg.edit(), 
			action: '/-sources/set-prop-comment', 
			args: {prop_id: prop.prop_id},
			reloaddiv: env.layer.div,
			input: prop.comment
		})}
	</div>
	<pre style="font-style: italic;">${prop.comment}</pre>

	
`
// <div style="margin: 1em 0">
// 		${field.area({
// 			name: 'comment', 
// 			label: 'Комментарий', 
// 			action: '/-sources/set-prop-comment', 
// 			args: {prop_id: prop.prop_id},
// 			value: prop.comment
// 		})}
// 	</div>
// 	<script>
// 		(div => {
// 			const field = div.querySelector('.field')
// 			if (!field) return
// 			const check = async () => {
// 				if (!div.closest('body')) return
// 				const data = await fetch('${env.layer.json}').then(r => r.json())
// 				if (!div.closest('body')) return
// 				if (data.prop.comment != field.innerHTML) {
// 					alert('Комментарий был изменён на другой вкладке или другим пользователем, обновите страницу!')
// 				}
// 				setTimeout(check, 30000)
// 			}
// 			setTimeout(check, 30000)	
// 		})(document.currentScript.previousElementSibling)
// 	</script>