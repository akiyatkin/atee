import { mapobj } from '/-nicked/mapobj.js'
export const ROOT = (data, env) => `
	${data.model?showmodel(data.model):'<h1>Модель'+ env.crumb.name +' не найдена</h1>'}
	
`
const showmodel = (mod) => `
	<h1>${mod?.brand_title} ${mod?.model_title}</h1>

	<div><b>Группа</b>: ${mod.group_title}</div>
	${mapobj(mod.more, showprop).join('')}
	<div style="border-top:dotted 1px gray; padding-top:1rem; margin-top:1rem">
		${mod.items.map(showitem).join('')}
	</div>
`
const showitem = (item) => `
	<h1>${item.item_num}</h1>
	<p><b>Таблица</b>: ${item.table_title}</p>
	${mapobj(item.more, showprop).join('')}
`
const showprop = (prop, prop_titel) => `
	<div><b>${prop_titel}</b>: ${prop.value} <small>(${prop.type}${prop.price_title ? ', ' + prop.price_title : ''})</small></div>
`