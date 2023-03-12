import { UTMS } from "/-form/layout.html.js"
const tpl = {}
export default tpl

tpl.signup_subject = user => `Подтвердите ваш аккаут на {host}`
tpl.signup = user => `

	<p>Добрый день!</p>
	<p>Перед тем, как Вам будут доступны все функции сайта, нужно подтвердить email. 
	Для этого перейдите по следующей ссылке.</p>

	<p><a href="{path}/user/confirmkey/{email}/{key}">{path}/user/confirmkey/{email}/{key}</a></p>

	${footer(user)}
`


tpl.footer = user => `
	<p>
		С уважением, <a href="{host}">{host}</a><br>
		Поддержка: <a href="{path}{conf.support}">{path}{conf.support}</a>
	</p>
`

tpl.signature = user => `
	<p>
		IP: ${user.ip} (<a href="https://ip2geolocation.com/?ip=${user.ip}">GEO</a>)
	</p>
	${user.utms.length ? UTMS(user.utms) : ''}
`

tpl.ORDER = user => `
	<p>
		Имя: ${user.name}<br>
		Телефон: ${user.phone}<br>
		Смена: ${user.direction}<br>
		Способ связи: ${user.userway}
	</p>
	${signature(user)}
`
tpl.CONT = user => `
	<p>
		Имя: ${user.name}<br>
		Телефон: ${user.phone}<br>
		Способ связи: ${user.userway}
	</p>
	${signature(user)}
`
tpl.QUEST = user => `
	<p>
		Email: ${user.email}<br>
		<pre>${user.question}</pre>
	</p>
	${signature(user)}
`

const signature = (user) => `
	<p>
		IP: ${user.ip} (<a href="https://ip2geolocation.com/?ip=${user.ip}">GEO</a>)
	</p>
	${user.utms.length ? UTMS(user.utms) : ''}
`