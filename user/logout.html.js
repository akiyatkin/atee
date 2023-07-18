
export const ROOT = (data, env) => 
`<div style="margin-top:1rem"><a href="/user">Личный кабинет</a></div>
	<h1 style="margin-top:0">Выход</h1>` 
+ 
(!data.user.user_id ? `
	<p>Вы не авторизованы.</p>
	<p>Выхода нет. <code>&copy;</code> Сплин  </p>
` : `
	<p>${data.user.email || ''}</p>
	<form action="/-user/set-logout" data-goal="logout"><button type="submit">Выйти</button></form>
	<script>
		(form => {
			form.addEventListener('submit', e => {
				e.preventDefault()
				import('/-dialog/action.js').then(r => r.default(form)).then(async res => {
					const Client = await window.getClient()
					Client.reload()
				})
			})
		})(document.currentScript.previousElementSibling)
	</script>
`)