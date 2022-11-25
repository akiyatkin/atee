const cont = {}
export default cont
cont.CALLBACK = (data, env) => `
	<div style="max-width:500px">
		<h1>Заказать звонок</h1>
		<p>
			Оставьте телефон, менеджер перезвонит в&nbsp;рабочее&nbsp;время.
		</p>
		<form action="/-dialog/set-contacts">
			<div class="float-label icon phone">
				<input required id="contacts_phone" name="phone" type="tel" placeholder="Телефон">
				<label for="contacts_phone">Телефон</label>
			</div>
			<p>
				<button type="submit">Жду звонка</button>
			</p>
		</form>
		<script>
			(form => {
				import("/@atee/form/Autosave.js").then(r => r.default.init(form))
				form.addEventListener('submit', e => {
					e.preventDefault()
					import('/@atee/dialog/submit.js').then(r => r.default(form, form.action, 'callback'))
				})
			})(document.currentScript.previousElementSibling)
		</script>
	</div>
`
cont.SUCCESS = () => `
	<h1>Готово</h1>
	<p style="font-size: 1rem; line-height: 140%; margin-left:auto; margin-right:auto">
		Менеджер свяжется с&nbsp;Вами<br>в&nbsp;рабочее&nbsp;время, как&nbsp;можно&nbsp;быстрее!
	</p>
`
cont.ERROR = () => `
	<h1 style="opacity:0.5">Ошибка</h1>
	<div style="max-width: 300px; position: relative; z-index:1"><p style="font-weight: 500;" class="msg"></p></div>
`