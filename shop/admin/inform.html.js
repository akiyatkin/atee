import err from "/-controller/err.html.js"
import ddd from "/-words/date.html.js"
import field from "/-dialog/field.html.js"
import svg from "/-sources/svg.html.js"


export const ROOT = (data, env) => err(data, env) || `
	
	<h1>Актуальность</h1>
	<p><a href="${data.root_path}/group/${data.root_nick}?m=cena=empty">Каталог</a></p>
	<table>
		<thead>
			<tr style="font-size: 1.2rem;">
				<td>Бренды</td>
				<td>Дата прайса</td>
				<td>Количество позиций</td>			
				<td>Без цен</td>
				<td>Добавлений в корзину</td>
				<td>Заказов</td>
				<td>Комментарий</td>
			</tr>
		</thead>
		<tbody>
			${data.brands.sort((a, b) => new Date(b.date_cost) - new Date(a.date_cost)).map(brand => showInformRow(data, env, brand)).join('')}
		</tbody>
	</table>
`
const showInformRow = (data, env, brand) => `
	<tr>
		<td>
			<a style="font-size: 1.2rem" href="${data.root_path}/group/${data.root_nick}?m=brend.${brand.brand_nick}=1">${brand.brand_title}</a></td>
		<td>${ddd.dm(brand.date_cost)}</td>
		<td>${brand.poscount}</td>
		<td><a href="${data.root_path}/group/${data.root_nick}?m=cena=empty:brend.${brand.brand_nick}=1">${brand.poscount - brand.withcost}</a></td>
		<td>${brand.basketcount}</td>
		<td>${brand.ordercount}</td>
		<td>
			<div style="float:right; position: relative; clear:both;">
				${field.prompt({
					cls: 'a mute',
					type: 'area',
					name: 'comment',
					label: 'Комментарий',
					value: svg.edit(), 
					action: '/-shop/admin/set-brand-comment',
					args: {brand_nick: brand.brand_nick},
					reloaddiv: env.layer.div,
					input: brand.comment
				})}
			</div>
			<div style="white-space: pre; font-style: italic; margin-right:2em">${brand.comment || ''}</div>
		</td>	
	</tr>
`
const ftrBrands = (data, env, brand) => `

`