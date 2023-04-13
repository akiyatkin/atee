import { UTMS } from "/-form/layout.html.js"

const tpl = {}
export default tpl

tpl.tocheck_subject = (data) => `Заказ с сайта ${data.vars.host}`
tpl.tocheck = (data) => `
	<p>Заказ ${data.order.order_nick}</p>

	${tpl.footer(data.vars)}
`

tpl.footer = vars => `
	<p>
		IP: ${vars.ip} (<a href="https://ip2geolocation.com/?ip=${vars.ip}">GEO</a>)
	</p>
	${vars.utms.length ? UTMS(vars.utms) : ''}
`