import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
import svg from "/-sources/svg.html.js"
export const css = ['/-sources/represent.css','/-sources/revscroll.css']
export const ROOT = (data, env, entity = data.entity) => err(data, env, ["ENTITY"]) || `
	<div id="ENTITY"></div>
`
export const ENTITY = (data, env, entity = data.entity) => !data.result ? '' : `
	<div style="opacity:0.5; float:right">Сущность</div>
	<h1>${entity.entity_title}</h1>
	<table style="margin: 2em 0">
		
		<tr>
			<td>Ключ</td>
			<td>
				${field.search({
					cls: 'a',
					search:'/-sources/get-entity-prop-search?entity_id=' + entity.entity_id,
					value: entity.prop_title || 'Не указано',
					label: 'Ключ сущности', 
					type: 'text',
					name: 'prop_id',
					find: 'prop_id',
					action: '/-sources/set-entity-prop',
					args: {entity_id: entity.entity_id},
					reloaddiv:env.layer.div
				})}
			</td>
		</tr>
		<tr>
			<td>Ник</td>
			<td>${entity.entity_nick}</td>
		</tr>
	</table>
	
	
	${showComment(data, env, entity)}


	<div id="PROPS"></div>

	
	<div style="display: flex; flex-wrap: wrap; gap: 0.5em 1em; margin:2em 0">
		<div style="flex-grow:1;">
			${field.text({
				value: entity.entity_title,
				type: 'text',
				name: 'title',
				label: 'Название ед.число', 
				action: '/-sources/set-entity-title',
				reloaddiv: env.layer.div,
				args: {entity_id: entity.entity_id}
			})}
		</div>
		<div style="flex-grow:1;">
			${field.text({
				value: entity.entity_plural,
				type: 'text',
				name: 'title',
				label: 'Название мн.число', 
				action: '/-sources/set-entity-plural',
				reloaddiv: env.layer.div,
				args: {entity_id: entity.entity_id}
			})}
		</div>
	</div>
	
	
	<div style="margin:2em 0; display: flex; flex-wrap:wrap; gap: 1em; justify-content: flex-end">
		${field.button({
			label: 'Удалить сущность', 
			confirm: 'Удалить сущность со всеми упоминаниями, связями?',
			action: '/-sources/set-entity-delete',
			reloaddiv: env.layer.div,
			args: {entity_id: entity.entity_id},
			go: 'entities'
		})}
	</div>
	<div style="margin: 1em 0; display: grid; gap: 0.25em;">
		<div>
			<button class="a">Настроить видимость</button>
			<script>
				(btn => {
					btn.addEventListener('click', async () => {
						const represent = await import('/-sources/represent.js').then(r => r.default)
						represent.popup(${JSON.stringify({entity_id: entity.entity_id})}, '${env.layer.div}')
					})
				})(document.currentScript.previousElementSibling)
			</script>
		</div>
	</div>
	${showInters(data, env, entity)}
`
const showInters = (data, env, entity) => {
	const masters = data.i_am_being_used.map(entity => showEntityLink(data, env, entity)).join(", ")
	return `
		<h2>Подключения</h2>
		<p>
			Какие сущности подключаются по каким-то свойствам, указывается как справочная информация.
			${masters ? entity.entity_plural + " подключены к <i>" + masters + "</i>" : "Другие сущности " + entity.entity_plural + " не подключают."}
		</p>
		<table>
			<thead>
				<tr>
					<td>Свойство</td>
					<td>Сущность</td>
					<td></td>
				</tr>
			</thead>
			<tbody>
				${data.i_am_using.map(inter => showTrInter(data, env, entity, inter)).join('')}
			</tbody>
		</table>
		<div style="margin:2em 0 4em; display: flex; flex-wrap:wrap; gap: 1em; justify-content: flex-end">
			${field.search({
				search:'/-sources/get-entity-search',
				value: 'Добавить подкючение', 
				label: 'Выберите сущность', 
				type: 'text',
				name: 'entity_id',
				find: 'entity_id',
				action: '/-sources/set-entity-intersection',
				args: {id: entity.entity_id},
				reloaddiv: env.layer.div
			})}
		</div>
	`
}
const showTrInter = (data, env, entity, inter) => `
	<tr>
		<td>
			${field.search({
				cls: 'a',
				search:'/-sources/get-inter-prop-search?entity_id=' + entity.entity_id,
				value: showInterProp(inter), 
				label: 'Свойство с ключём', 
				type: 'text',
				name: 'prop_id',
				find: 'prop_id',
				action: '/-sources/set-inter-prop',
				args: {entity_id: inter.entity_id, id: entity.entity_id, old_id: inter.prop_id}
			})}
		</td>
		<td><a href="entity/${inter.entity_id}">${inter.entity_title}</a></td>
		<td>
			${field.button({
				cls:"a",
				label: svg.cross(), 
				confirm: 'Удалить связь с дополнением?',
				action: '/-sources/set-inter-delete',
				reloaddiv: env.layer.div,
				args: {entity_id: inter.entity_id, id: entity.entity_id}
			})}
		</td>
	</tr>
`
const showEntityLink = (data, env, entity) => `<a href="entity/${entity.entity_id}">${entity.entity_title}</a>`
export const PROPS = (data, env) => !data.result ? '' : `
	<style>
		${env.scope} .ellipsis {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			max-width: 300px;
		}
	</style>
	<div class="revscroll" style="margin: 2em 0">
		<table draggable="false" class="list">
			<thead>
				<tr>
					<td>
						<button title="Изменить видимость сущности" class="represent_props eye transparent represent-${data.entity.represent_entity} ${defcustom(data.entity.represent_props)}">${svg.eye()}</button>
					</td>
					<td>Свойство</td>
					<td>Тип</td>
					<td>Значений</td>
					<td>Обработка</td>
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
			(div => {
				const name = 'represent_prop'
				const entity_id = ${data.entity.entity_id}
				for (const btn of div.getElementsByClassName(name)) {
					btn.addEventListener('click', async () => {
						const td = btn.closest('td')
						const tr = td.parentElement
						const prop_id = tr.dataset.id
						const represent = await import('/-sources/represent.js').then(r => r.default)
						const data = await represent.set(btn, name, {prop_id})
						if (!data.result) return
						const Client = await window.getClient()
						Client.reloaddiv('${env.layer.div}')
					})
				}
			})(document.currentScript.parentElement)
		</script>
		<script>
			(div => {
				const name = 'represent_props'
				const entity_id = ${data.entity.entity_id}
				const btn = div.getElementsByClassName(name)[0]
				btn.addEventListener('click', async () => {
					const represent = await import('/-sources/represent.js').then(r => r.default)
					const data = await represent.set(btn, name, {entity_id})
					if (!data.result) return
					const Client = await window.getClient()
					Client.reloaddiv('${env.layer.div}')
				})
			})(document.currentScript.parentElement)
		</script>
	</div>
	<div style="margin:2em 0 4em; display: flex; flex-wrap:wrap; gap: 1em; justify-content: flex-end">
		${field.prompt({
			value: 'Добавить свойство', 
			name: 'title',
			input: '',
			label: 'Название свойства', 
			type: 'text', 
			action: '/-sources/set-prop-create', 
			args: {entity_id: data.entity_id},
			reloaddiv: 'PROPS',
			goid: 'prop_id'
		})}
	</div>
</p>
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
const defcustom = (value) => {
	if (value) return 'represent-def-1'
	else return 'represent-custom-0'
}
const showTr = (data, env, prop) => `
	<tr class="item" data-id="${prop.prop_id}" style="white-space: nowrap;">
		<td>
			<button title="Изменить видимость свойства" class="represent_prop eye transparent ${prop.cls?.main} ${prop.cls?.custom}">${svg.eye()}</button>
		</td>
		<td style="${data.entity.prop_id == prop.prop_id ? 'font-weight:bold' : ''}">
			<a href="prop/${prop.prop_id}">${prop.prop_title}</a>
		</td>
		<td>
			<!-- ${prop.type} -->
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
		<td>
			<!-- ${prop.multi ? "Несколько" : "Одно"} -->
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
				reloaddiv: env.layer.div,
				args: {prop_id: prop.prop_id},
				reloaddiv:'PROPS'
			})}
		</td>
	</tr>
`
export const showInterProp = (entity) => `
	${entity.prop_title} ${entity.multi ? '(несколько значений)' : '(одно значение)'}
`
const showComment = (data, env, entity) => `
	<div style="margin: 1em 0">
		${field.area({
			name: 'comment', 
			label: 'Комментарий', 
			action: '/-sources/set-entity-comment', 
			args: {entity_id: entity.entity_id},
			value: entity.comment
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
				if (data.entity.comment != field.innerHTML) {
					alert('Комментарий был изменён на другой вкладке или другим пользователем, обновите страницу!')
				}
				setTimeout(check, 30000)
			}
			setTimeout(check, 30000)	
		})(document.currentScript.previousElementSibling)
	</script>
`