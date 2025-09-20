import cards from "/-shop/cards.html.js"
import words from "/-words/words.js"
import cost from "/-words/cost.js"

const tpl = {}
export default tpl


tpl.MAIL = (params) => {
	const gain = (name) => cards.getSomeTitle(params, params.item, name)
	return `
		<p>
			Телефон: ${params.phone || ''}
			<br>Email: ${params.email || ''}
			${params.partner ? tpl.showPartner(params) : ''}
			<br>Модель: <a href="https://${params.host}${params.conf.root_path}/item/${params.item.brendmodel[0]}/${params.item.art?.[0] || params.item.brendart[0]}">${gain('brendmodel')}</a>
			${params.item.cena ? tpl.showCost(params) : ''}
		</p>
		<pre>${params.text}</pre>
		${tpl.ip(params.ip)}
	`
}
tpl.ip = (ip) => `
	<p>
		IP: ${ip} (<a href="https://ip2geolocation.com/?ip=${ip}">GEO</a>)
	</p>
`
tpl.showPartner = (params) => `
	<br>Код партнёра: ${params.partner?.key || ''} ${params.partner?.discount ? '('+params.partner?.discount + '%)' : ''}
`
tpl.showCost = (params) => `
	<br>Цена: ${cards.cost(params.item)}
`
tpl.showAddress = (params) => `
	<br>Адрес: ${params.address}
`


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
		${data.order.partner ? tpl.showPartner(data.order) : ''}
		${data.order.address ? tpl.showAddress(data.order) : ''}
	</div>
	<pre style="font-style: italic; margin-bottom:1rem">${data.order.commentuser}</pre>
	<div style="margin-bottom:1rem">${data.list.length} ${words(data.list.length, 'позиция', 'позиции', 'позиций')}</div>
	<div style="font-family: monospace; font-size: 0.9rem; margin-bottom: 1rem">
		${data.list.map(pos => tpl.showPos(pos, data)).join('')}
	</div>
	<div>
		Стоимость заказа: <b>${cost(data.list.reduce((val, pos) => val + pos.sum, 0))}${cards.unit()}</b>
	</div>
	${tpl.footer(data)}
`

tpl.showPos = (pos, data) => {
	const gain = name => cards.getSomeTitle(data, pos.item, name)
	const naimenovanie = gain('naimenovanie')
	return `
		<div style="margin-bottom:1rem">
			<div>${gain('brendart')}</div>
			<div>${pos.modification || ''}</div>
			<div><b>${pos.quantity}</b> по <b>${cards.cost(pos.item)}</b> = <b>${cost(pos.quantity * pos.item.cena[0])}${cards.unit()}</b></div>
		</div>
	`
}
tpl.footer = (data) => `
	<p>
		Поддержка: <a href="https://${data.vars.host}/contacts">${data.vars.host}/contacts</a>
	</p>
`