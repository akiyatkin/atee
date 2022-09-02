export const ROOT = (data, env) => `
	
	${data.model?showmodel(data.model):'<h1>Модель'+ env.crumb.name +' не найдена</h1>'}
	
`
const showmodel = (mod) => `
	<h1>${mod?.brand_title} ${mod?.model_title}</h1>

	<div><b>Группа</b>: ${mod.group_title}</div>

	<div style="border-top:dotted 1px gray; padding-top:1rem; margin-top:1rem">
		${mod.items.map(showitem).join('')}
	</div>
`
const showitem = (item) => `
	<h1>${item.item_num}</h1>
	${item.props.map(showprop).join('')}
`
const showprop = (prop) => `
	<div><b>${prop.prop_title}</b>: ${prop.value_title ?? prop.number ?? prop.text}</div>
`