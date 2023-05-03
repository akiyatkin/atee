import words from "/-words/words.js"
import common from "/-catalog/common.html.js"
import cost from "/-words/cost.js"

const tpl = {}
export default tpl
const prefixif = (prefix, val) => val ? prefix + '' + val : ''
tpl.tocheck_subject = (data) => `Заказ с сайта ${data.vars.host}`
tpl.tocheck = (data) => `
	<h1>Заказ № ${data.order.order_nick}</h1>
	<div style="margin-bottom:1rem">
		ФИО: ${data.order.name}<br>
		Email: ${data.order.email}<br>
		Телефон: ${data.order.phone}
		${prefixif('<br>Адрес: ', data.order.address)}
	</div>
	<pre style="font-style: italic; margin-bottom:1rem">${data.order.commentuser}</pre>
	<div style="margin-bottom:1rem">${data.order.count} ${words(data.order.count, 'позиция', 'позиции', 'позиций')}</div>
	<div style="font-family: monospace; font-size: 0.9rem; margin-bottom: 1rem">
		${data.list.map(pos => tpl.showPos(pos, data)).join('')}
	</div>
	<div>
		Стоимость заказа <b>${cost(data.order.sum)}${common.unit()}</b>
	</div>
`

tpl.showPos = (pos, data) => `
	<div style="margin-bottom:1rem">
		<div>${pos.brand_title} ${pos.model_title}</div>
		<div><b>${pos.count}</b> по <b>${cost(pos.Цена)}${common.unit()}</b> = <b>${cost(pos.count * pos.Цена)}${common.unit()}</b></div>
	</div>
`