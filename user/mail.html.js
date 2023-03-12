const tpl = {}
export default tpl

tpl.signup_subject = (data) => `Подтвердите ваш аккаут на ${data.vars.host}`
tpl.signup = (data) => `

	<p>Добрый день!</p>
	<p>Перед тем, как Вам будут доступны все функции сайта, нужно подтвердить email. 
	Для этого перейдите по следующей ссылке.</p>

	<p>
		<b>
			<big>
				<a href="https://${data.vars.host}/-user/set-email-verified?email=${data.email}&code=${data.code_verify}&token=${data.user.user_id}-${data.user.token}">
					${data.code_verify}
				</a>
			</big>
		</b>
	</p>

	${tpl.footer(data)}
`
tpl.signin_subject = (data) => `Вход на ${data.vars.host}`
tpl.signin = (data) => `

	<p>Добрый день!</p>
	<p>Для входа на сайте используйте следующую ссылку.</p>
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