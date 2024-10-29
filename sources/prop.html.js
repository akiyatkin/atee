import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"

export const ROOT = (data, env, entity = data.entity) => err(data, env, ["PROP"]) || `
	<div id="PROP"></div>
`
export const PROP = (data, env, prop = data.prop) => !data.result ? '' : `
	<h1>${prop.prop_title}</h1>
	<table style="margin: 2em 0">
		<tr>
			<td>
				Опубликовано
			</td>
			<td>
				${field.switch({
					action: '/-sources/set-prop-switch-prop', 
					value: prop.represent_prop, 
					values: {"":"Нет", "1":"Да"},
					args: {prop_id: prop.prop_id, propprop: 'represent_prop'}
				})}
			</td>
		</tr>
		<tr>
			<td>
				Сущность
			</td>
			<td>
				<a href="entity/${prop.entity_id}">${prop.entity_title}</a>
			</td>
		</tr>
	</table>
	<div style="max-width: 600px;">
		${showComment(data, env, prop)}
		<div style="display: flex; flex-wrap: wrap; gap: 0.5em 1em">
			<div style="flex-grow:1">
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
		</div>
		
		
		<div style="margin:2em 0; display: flex; flex-wrap:wrap; gap: 1em; justify-content: flex-end">
			${field.button({
				label: 'Удалить', 
				confirm: 'Удалить сущность со всеми упоминаниями, связями?',
				action: '/-sources/set-prop-delete',
				reloaddiv: env.layer.div,
				args: {prop_id: prop.prop_id},
				go: 'props'
			})}
		</div>
	</div>
`
const showComment = (data, env, prop) => `
	<div style="margin: 1em 0">
		${field.area({
			name: 'comment', 
			label: 'Комментарий', 
			action: '/-sources/set-prop-comment', 
			args: {prop_id: prop.entity_id},
			value: prop.comment
		})}
	</div>
`