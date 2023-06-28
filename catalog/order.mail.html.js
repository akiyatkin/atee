import { UTMS } from "/-form/layout.html.js"
import common from "/-catalog/common.html.js"
export const MAIL = (user) => `
	<p>
		Телефон: ${user.phone || ''}<br>
		Email: ${user.email || ''}<br>
		Код партнёра: ${user.partner?.key || ''} ${user.partner?.discount ? '('+user.partner?.discount + '%)' : ''}<br>
		Модель: <a href="https://${user.host}/catalog/${user.model.brand_nick}/${user.model.model_nick}">${user.model.brand_title} ${user.model.model_title}</a>
		${user.model.Цена ? showCost(user) : ''}
	</p>
	<pre>${user.text}</pre>
	${ip(user.ip)}
	${false && user.utms.length ? UTMS(user.utms) : ''}
`
const ip = (ip) => `
	<p>
		IP: ${ip} (<a href="https://ip2geolocation.com/?ip=${ip}">GEO</a>)
	</p>
`
const showCost = (user) => `
	<br>Цена: ${user.model.Цена}${common.unit()}
`