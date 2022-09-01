export const ROOT = (data, env) => `
	<h1>Модель ${env.child}</h1>
	<p>
		${data.model?showmodel(data.model):''}
	</p>
`
const showmodel = (mod) => `
	<div><b>Модель</b>: ${mod.model_title}</div>
	<div><b>Бренд</b>: ${mod.brand_title}</div>
	<div><b>Группа</b>: ${mod.group_title}</div>

	<div style="border-top:dotted 1px gray; padding-top:1rem; margin-top:1rem">
		${mod.props.map(showprop).join('')}
	</div>
`
const showprop = (prop) => `
	<div><b>${prop.prop_title}</b>: ${prop.value_title ?? prop.number ?? prop.text}</div>
`