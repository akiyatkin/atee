import { UTMS } from "/-form/layout.html.js"

const tpl = {}
export default tpl 
tpl.CALLBACK = (user) => `
	<p>
		Телефон: ${user.phone}<br>
	</p>
	${ip(user.ip)}
	${user.utms.length ? UTMS(user.utms) : ''}
`
const ip = (ip) => `
	<p>
		IP: ${ip} (<a href="https://ip2geolocation.com/?ip=${ip}">GEO</a>)
	</p>
`