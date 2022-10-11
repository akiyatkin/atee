import controller from "/-controller/layout.html.js"
export const ROOT = (...args) => `<!DOCTYPE html>
<html>
	<head>
		${controller.HEAD(...args)}
		<base href="/@atee/showcase/">
		<link rel="icon" type="/image/svg+xml" href="/images/favicon.svg">
		<link rel="stylesheet" href="/style.css">
	</head>
	<body style="padding:10px; max-width: 1200px">
		<header id="HEADER">${HEADER(...args)}</header>
		<main id="MAIN"></main>
		<footer id="FOOTER"></footer>
	</body>
</html>
`
export const HEADER = (data, {root, host}) => `
	<div style="display: flex; justify-content: space-between;">
		<a href="/${root}">Controller</a>
		<a href="/">${host}</a>
	</div>
`

export const MAIN = (data) => `
	
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
		<script type="module" async>
			const form = document.forms[0]
			const input = form.getElementsByTagName('input')[0]
			form.addEventListener('submit', async (e) => {
				e.preventDefault()
				const Client = await window.getClient()
				document.cookie = '-controller=' + input.value + '; path=/; expires=Fri, 31 Dec 9999 23:59:59 GMT'
				Client.replaceState(location.href)
			})
		</script>
	
`