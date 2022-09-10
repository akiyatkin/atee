import { UTMS } from "/-form/layout.html.js"
export const MAIL = (user) => `
	<p>
		Телефон: ${user.phone}<br>
		Email: ${user.email}<br>
		Партнёр: ${user.partner}<br>
		Модель: <a href="https://${user.host}/catalog/${user.model.brand_nick}/${user.model.model_nick}">${user.model.brand_title} ${user.model.model_title}</a>
	</p>
	<pre>${user.text}</pre>
	${ip(user.ip)}
	${user.utms.length ? UTMS(user.utms) : ''}
`
const ip = (ip) => `
	<p>
		IP: ${ip} (<a href="https://ip2geolocation.com/?ip=${ip}">GEO</a>)
	</p>
`