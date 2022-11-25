import { UTMS } from "/-form/layout.html.js"

const tpl = {}
export default tpl 
tpl.CALLBACK = user => `
	<p>
		Телефон: ${user.phone}<br>
	</p>

	${signature(user)}
`

tpl.CONTACTS = user => `
	<p>
		Имя: ${user.name}<br>
		Организация: ${user.org}<br>
		Email: ${user.email}<br>
		Телефон: ${user.phone}
	</p>

	<pre>${user.text}</pre>

	${signature(user)}
`

const signature = user => `
	<p>
		IP: ${user.ip} (<a href="https://ip2geolocation.com/?ip=${user.ip}">GEO</a>)
	</p>
	${user.utms.length ? UTMS(user.utms) : ''}
`