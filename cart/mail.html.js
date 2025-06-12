import words from "/-words/words.js"
import common from "/-catalog/common.html.js"
import cost from "/-words/cost.js"

const tpl = {}
export default tpl


tpl.TITLES = {
	"wait":"Оформить заказ",
	"check":"Заказ оформлен",
	"complete":"Заказ выполнен",
	"cancel":"Заказ отменён",
	"empty":"В заказе нет товаров",
	"pay":"Заказ ожидает оплату"
}

const getv = (mod, prop_title) => mod[prop_title] ?? mod.more[prop_title] ?? ''
const prefixif = (prefix, val, postfix = '') => val ? prefix + val + postfix : ''

tpl.tocheck_subject = (data) => `Заказ с сайта ${data.vars.host}`
tpl.tocheck = (data) => !data.order ? `<h1>Корзина пуста</h1>` : `
	<h1>${tpl.TITLES[data.order.status]} № ${data.order.order_nick}</h1>
	<div style="margin-bottom:1rem">
		ФИО: ${data.order.name}<br>
		Email: ${data.order.email}<br>
		Телефон: ${data.order.phone}
		${prefixif('<br>Ключ партнёра: <b>', data.order.partner?.title,'</b>')}
		${prefixif('<br>Адрес: ', data.order.address)}
	</div>
	<pre style="font-style: italic; margin-bottom:1rem">${data.order.commentuser}</pre>
	<div style="margin-bottom:1rem">${data.list.length} ${words(data.list.length, 'позиция', 'позиции', 'позиций')}</div>
	<div style="font-family: monospace; font-size: 0.9rem; margin-bottom: 1rem">
		${data.list.map(pos => tpl.showPos(pos, data)).join('')}
	</div>
	<div>
		Стоимость заказа <b>${cost(data.list.reduce((val, pos) => val + pos.sum, 0))}${common.unit()}</b>
	</div>
	${tpl.footer(data)}
`

tpl.showPos = (pos, data) => `
	<div style="margin-bottom:1rem">
		<div>${pos.brand_title} ${pos.model_title}${prefixif(' (', getv(pos,'Позиция') || getv(pos,'Арт'), ')')}</div>
		<div>${pos.modification || ''}</div>
		<div><b>${pos.count}</b> по <b>${cost(pos.Цена)}${common.unit()}</b> = <b>${cost(pos.count * pos.Цена)}${common.unit()}</b></div>
	</div>
`
tpl.footer = (data) => `
	<p>
		Поддержка: <a href="https://${data.vars.host}/contacts">${data.vars.host}/contacts</a>
	</p>
`