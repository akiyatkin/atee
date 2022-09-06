import cards from "/-catalog/cards.html.js"
export const ROOT = (data, env, { model } = data) => `
	<h1>${cards.name(model)}</h1>
	<div>Бренд: ${model.brand_title}</div>
	<div>Модель: ${model.model_title}</div>
	<div>Группа: <a href="${env.bread.crumbs[1]}/${model.group_nick}">${model.group_title}</a></div>
	<p>
		${model.Описание}
	</p>
`