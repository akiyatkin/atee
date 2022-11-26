const cont = {}
export default cont
cont.CALLBACK = (data, env) => `
	<div style="max-width:500px">
		<h1>Заказать звонок</h1>
		<p>
			Оставьте телефон, менеджер перезвонит в&nbsp;рабочее&nbsp;время.
		</p>
		<style>
			${env.scope} .float-label {
				margin-bottom: 1rem;
			}
		</style>
		<form action="/-dialog/set-callback">
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
cont.CONTACTS = (data, env) => `
	<div style="max-width:500px">
		<h1>Форма для связи</h1>
		<p>
			Менеджер ответит на указанные контакты в&nbsp;рабочее&nbsp;время.
		</p>
		<style>
			${env.scope} .grid {
				display: grid; 
				grid-template-columns: 1fr 1fr; 
				column-gap: 1rem;
			}
			${env.scope} .float-label {
				margin-bottom: 1rem;
			}
		</style>
		<form action="/-dialog/set-contacts">
			<div class="grid">
				<div class="float-label icon name">
					<input id="${env.sid}name" name="name" type="text" placeholder="Ваше имя">
					<label for="${env.sid}name">Ваше имя</label>
				</div>
				<div class="float-label icon org">
					<input id="${env.sid}org" name="org" type="tel" placeholder="Организация">
					<label for="${env.sid}org">Организация</label>
				</div>
				<div class="float-label icon phone">
					<input id="${env.sid}phone" name="phone" type="tel" placeholder="Телефон">
					<label for="${env.sid}phone">Телефон *</label>
				</div>
				<div class="float-label icon mail">
					<input id="${env.sid}email" name="email" type="email" placeholder="Email">
					<label for="${env.sid}email">Email</label>
				</div>
			</div>
			<div class="float-label">
				<textarea id="${env.sid}text" name="text" rows="4" placeholder="Сообщение"></textarea>
				<label for="${env.sid}text">Сообщение</label>
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
					import('/@atee/dialog/submit.js').then(r => r.default(form, form.action, 'contacts'))
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