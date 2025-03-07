const cont = {}
export default cont

cont.css = ['/-float-label/style.css']
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
		<form action="/-dialog/set-callback" data-goal="callback">
			<div class="float-label icon phone">
				<input required id="contacts_phone" name="phone" type="tel" placeholder="Телефон">
				<label for="contacts_phone">Телефон</label>
			</div>
			<p align="right">
				<button type="submit">Жду звонка!</button>
			</p>
		</form>
		<script>
			(async form => {
				import("/-form/Autosave.js").then(r => r.default.init(form))
			
				if (form.closest('dialog')) {
					const goalButton = () => {
						const goal = 'button'
						const metrikaid = window.Ya ? window.Ya._metrika.getCounters()[0].id : false
						if (metrikaid) {
							console.log('Goal.reach ' + goal)
							ym(metrikaid, 'reachGoal', goal);
						}
					}
					goalButton()
				}

				form.addEventListener('submit', e => {
					e.preventDefault()
					import('/-dialog/submit.js').then(r => r.default(form, {tpl:'/-dialog/contacts.html.js', sub:'MSG'}))
				})
			})(document.currentScript.previousElementSibling)
		</script>
	</div>
`
cont.checkbox = (name, title, checked) => `
	<div style="align-items: flex-start; display: grid; grid-template-columns: max-content 1fr;">
		<input ${checked ? 'checked' : ''} required style="margin-right: 10px; transform: scale(1.4); transform-origin: left center" 
		type="checkbox" id="contacts_${name}" name="${name}"> 
		<label for="contacts_${name}">${title}</label>
	</div>
`
cont.FORM = (data, env) => `
	<form action="/-dialog/set-contacts" data-goal="contacts">
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
		<div class="grid">
			<div class="float-label icon name">
				<input id="${env.sid}name" name="name" type="text" placeholder="Ваше имя">
				<label for="${env.sid}name">Ваше имя</label>
			</div>
			<div class="float-label icon org">
				<input id="${env.sid}org" name="org" type="text" placeholder="Организация">
				<label for="${env.sid}org">Организация</label>
			</div>
			<div class="float-label icon phone">
				<input id="${env.sid}phone" required name="phone" type="tel" placeholder="Телефон">
				<label for="${env.sid}phone">Телефон *</label>
			</div>
			<div class="float-label icon mail">
				<input id="${env.sid}email" name="email" type="email" placeholder="Email">
				<label for="${env.sid}email">Email</label>
			</div>
		</div>
		<div class="float-label">
			<textarea id="${env.sid}text" name="text" rows="4" placeholder="Сообщение">${data?.text || ''}</textarea>
			<label for="${env.sid}text">Сообщение</label>
		</div>
		<div style="max-width: 500px;">
			${cont.checkbox('terms','<span style="display: block; font-size: 12px; line-height: 14px">Я даю согласие на обработку моих персональных данных, в соответствии с Федеральным законом от 27.07.2006 года №152-ФЗ «О персональных данных», на условиях и для целей, определенных в <a href="/terms">Согласии</a> на обработку персональных данных.</span>', true)}
		</div>
		<p align="right">
			<button type="submit">Отправить</button>
		</p>
	</form>
	<script>
		(async form => {
			import("/-form/Autosave.js").then(r => r.default.init(form))
			const Dialog = await import("/-dialog/Dialog.js").then(r => r.default)
			if (Dialog.parents.length) {
				const goalButton = () => {
					const goal = 'button'
					const metrikaid = window.Ya ? window.Ya._metrika.getCounters()[0].id : false
					if (metrikaid) {
						console.log('Goal.reach ' + goal)
						ym(metrikaid, 'reachGoal', goal);
					}
				}
				goalButton()
			}
			form.addEventListener('submit', e => {
				e.preventDefault()
				import('/-dialog/submit.js').then(r => r.default(form, {tpl:'${env.layer.tpl}', sub:'MSG'}))
			})
		})(document.currentScript.previousElementSibling)
	</script>
`
cont.CONTACTS = (data, env) => `
	<div style="max-width:500px">
		<h1>Форма для связи</h1>
		<p>
			Менеджер ответит на указанные контакты в&nbsp;рабочее&nbsp;время.
		</p>
		
		${cont.FORM(data, env)}
	</div>
`
cont.SUCCESS = (data, env) => `
	<h1>Готово</h1>
	<p style="font-size: 1rem; line-height: 140%; margin-left:auto; margin-right:auto">
		Менеджер свяжется с&nbsp;Вами<br>в&nbsp;рабочее&nbsp;время, как&nbsp;можно&nbsp;быстрее!
	</p>
`
cont.ERROR = (data, env) => `
	<h1 style="opacity:0.5">Ошибка</h1>
	<div style="max-width: 400px; position: relative; z-index:1"><p style="font-weight: 500;" class="msg">${data.msg}</p></div>
`
cont.MSG = (data, env) => data.result ? cont.SUCCESS(data, env) : cont.ERROR(data, env)