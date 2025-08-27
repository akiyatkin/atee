import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
import date from "/-words/date.html.js"
import svg from "/-sources/svg.html.js"
export const css = ['/-sources/represent.css','/-sources/revscroll.css']

export const ROOT = (data, env, entity = data.entity) => err(data, env, ["PROP"]) || `
	<div id="PROP"></div>
`
export const PROP = (data, env, prop = data.prop, entity = data.entity) => !data.result ? '' : `
	<div style="opacity:0.5; float:right"><a href="props">Свойства</a></div>
	<h1>${prop.name}&nbsp;<sup style="color:var(--primary)">${prop.unit}</sup></h1>
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
					descr: 'Если не будет одноимённого свойства, свойство для колонки попробует определиться по синонимам. Колонка "Вес" не имеет свойства <Вес>, но есть синоним |Вес| у свойства <Вес, кг>, по этому для колонки "Вес" будет назначено свойство <Вес, кг>. Если есть колонка "Вес, кг", то по прямоу совпадению ей тоже будет назначено свойство <Вес, кг>. Победит, то значение, которое будет в последнем свойстве, которое какбы перезапишет все предыдущие повторы.',
					type: 'text', 
					action: '/-sources/set-prop-synonym-create', 
					args: {prop_id: prop.prop_id},
					reloaddiv: env.layer.div
				})}
			</td>
		</tr>
		<tr>
			<td>
				Ед.изм
			</td>
			<td>
				${prop.unit || ''}
			</td>
		</tr>
	</table>
	
	${showComment(data, env, prop)}
		
	
	<div class="revscroll">
		<table style="table-layout: fixed">
			<thead>
				<tr>
					<td></td>
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
						//Client.reloaddiv('${env.layer.div}')
					})
				}
			})(document.currentScript.parentElement)
		</script>
	</div>
	<p>
		Всего: <b>${data.count}</b>, показано <b>${data.count > 1000 ? 1000 : data.count}</b>.
	</p>
	<div>
		${field.text({
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
const showSynonym = (data, env, syn) => `
	<div>${syn.col_title}
			${field.button({
				cls: 'transparent mute',
				label: svg.cross(), 
				confirm: 'Удалить синоним, зависимые назначения свойств сбросятся?',
				action: '/-sources/set-prop-synonym-delete',
				reloaddiv: env.layer.div,
				args: {col_nick: syn.col_nick, prop_id: data.prop.prop_id},
				reloaddiv: env.layer.div
			})}</div>
`
const showValueTr = (data, env, row) => `
	<tr style="${row.pruning ? 'background: hsl(0, 100%, 97%)' : ''}">
		<td>
			<button data-value_id="${row.value_id}" class="represent_value eye transparent ${row.cls?.main} ${row.cls?.custom}">${svg.eye()}</button>
		</td>
		<td>${row.text}</td>
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
	<script>
		(div => {
			const field = div.querySelector('.field')
			if (!field) return
			const check = async () => {
				if (!div.closest('body')) return
				const data = await fetch('${env.layer.json}').then(r => r.json())
				if (!div.closest('body')) return
				if (data.prop.comment != field.innerHTML) {
					alert('Комментарий был изменён на другой вкладке или другим пользователем, обновите страницу!')
				}
				setTimeout(check, 30000)
			}
			setTimeout(check, 30000)	
		})(document.currentScript.previousElementSibling)
	</script>
`