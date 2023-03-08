export const ROOT = (data) => `
	<p>
		Укажите пароль указанный в <code>/data/.controller.json</code>
	</p>
		Пример файла <code>{ "access": "password" }</code>
	<p>
		Администратор: <b>${data.admin ? 'Да' : 'Нет'}</b>
	</p>
	<form>
		<input name="password" type="password" placeholder="Пароль">
		<button type="submit">Применить</button>
	</form>
	<script>
		(form => {
			form.addEventListener('submit', async (e) => {
				e.preventDefault()
				const input = form.getElementsByTagName('input')[0]
				const Client = await window.getClient()
				document.cookie = '-controller=' + input.value + '; path=/; expires=Fri, 31 Dec 9999 23:59:59 GMT'
				Client.replaceState()
			})
		})(document.currentScript.previousElementSibling)
	</script>
`
export const HEADER = (data, env) => `
	<div style="display: flex; justify-content: space-between;">
		<a href="/${env.bread.root}">Controller</a>
		<a href="/">${env.host}</a>
	</div>
`