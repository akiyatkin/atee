export const css = ["/-float-label/style.css"]
export const ROOT = (data, env) => `
	<div style="float:left; margin-top: 1rem; display: block;">
		<a href="/user">Личный кабинет</a>
	</div>
	<h1>Регистрация</h1>
	${data.user.date_signup ? showsignupalready(data, env) : showsignupform(data, env)}
`
const showsignupalready = (data, env) => `
	<p>Вы зарегистрированы</p>
	<p><b>${data.user.email}</b></p>
`
const showsignupform = (data, env) => `
	<form data-goal="signup" style="max-width:500px" action="/-user/set-signup-email">
		<div class="float-label icon mail">
			<input id="${env.sid}email" name="email" type="email" placeholder="Email">
			<label for="${env.sid}email">Email</label>
		</div>
		<p><button type="submit">Отправить</button></p>
	</form>
	<script>
		(form => {
			import("/-form/Autosave.js").then(r => r.default.init(form))
			form.addEventListener('submit', e => {
				e.preventDefault()
				import('/-dialog/submit.js').then(r => r.default(form)).then(async res => {
					const Client = await window.getClient()
					Client.reload()
				})
			})
		})(document.currentScript.previousElementSibling)
	</script>
`