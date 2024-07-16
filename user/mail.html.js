const tpl = {}
export default tpl

tpl.sendup_subject = (data) => `Подтвердите ваш email на ${data.host}`
tpl.sendup = (data) => `

	<p>Добрый день!</p>
	<p>
		Перед тем, как Вам будут доступны все функции сайта, нужно подтвердить email. 
	</p>
	<p>
		Для этого перейдите по
		<b>
			<big>
				<a href="https://${data.host}/-user/set-email-verified?email=${data.email}&code=${data.code_verify}&token=${data.user.user_id}-${data.user.token}&go=${data.go || ''}">
					ссылке
				</a>
			</big>
		</b>
	</p>

	${tpl.footer(data)}
`

tpl.sendin_subject = (data) => `Вход на ${data.host}`
tpl.sendin = (data) => `

	<p>Добрый день!</p>
	<p>Для входа на сайт используйте следующую ссылку.</p>
	<p>
		<b>
			<big>
				<a href="https://${data.host}/-user/set-signin-token?token=${data.user.user_id}-${data.user.token}">
					Войти
				</a>
			</big>
		</b>
	</p>

	${tpl.footer(data)}
`




tpl.footer = (data) => `
	<p>
		С уважением, <a href="https://${data.host}">${data.host}</a><br>
		Поддержка: <a href="https://${data.host}/contacts">${data.host}/contacts</a>
	</p>
`