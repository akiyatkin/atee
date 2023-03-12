export const css = ["/-float-label/style.css"]
export const ROOT = (data, env) => `
	<h1>Вход</h1>
	<form data-goal="signin" style="max-width:500px" action="/-user/set-signin-email">
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