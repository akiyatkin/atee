const tpl = {}
export default tpl

tpl.sendup_subject = (data) => `Подтвердите ваш аккаут на ${data.vars.host}`
tpl.sendup = (data) => `

	<p>Добрый день!</p>
	<p>
		Перед тем, как Вам будут доступны все функции сайта, нужно подтвердить email. 
	</p>
	<p>
		Для этого перейдите по
		<b>
			<big>
				<a href="https://${data.vars.host}/-user/set-email-verified?email=${data.email}&code=${data.code_verify}&token=${data.user.user_id}-${data.user.token}">
					ссылке
				</a>
			</big>
		</b>
	</p>

	${tpl.footer(data)}
`

tpl.sendin_subject = (data) => `Вход на ${data.vars.host}`
tpl.sendin = (data) => `

	<p>Добрый день!</p>
	<p>Для входа на сайт используйте следующую ссылку.</p>
	<p>
		<b>
			<big>
				<a href="https://${data.vars.host}/-user/set-signin-token?token=${data.user.user_id}-${data.user.token}">
					Войти
				</a>
			</big>
		</b>
	</p>

	${tpl.footer(data)}
`

tpl.footer = (data) => `
	<p>
		С уважением, <a href="https://${data.vars.host}">${data.vars.host}</a><br>
		Поддержка: <a href="https://${data.vars.host}/contacts">${data.vars.host}/contacts</a>
	</p>
`