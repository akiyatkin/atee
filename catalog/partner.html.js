export const POPUP = (data, env) => `
	<h1>Вход для партнёра</h1>
	${data.result
		? '<p>Активный ключ <b>'+data.partner+'</b>. <br>Для Вас действуют более выгодные цены.</p>'
		: '<p>Нет активного ключа</p>'
	}
	<form>
		<div class="float-label icon lock">
			<input id="contacts_partner" name="partner" type="text" placeholder="Укажите ключ">
			<label for="contacts_partner">Укажите ключ</label>
		</div>
		<p align="right">
			<button type="submit">Активировать</button>
		</p>
		<script>
			(async form => {
				const inp = form.elements['partner']
				const { Autosave } = await import("/-form/Autosave.js")
				await Autosave.init(form)	
				form.addEventListener('submit', async e => {
					e.preventDefault()
					let theme = new URL(location).searchParams.get('theme') ?? ''
					if (theme) theme = theme + ':'
					const Client = await window.getClient()
					Client.pushState('?theme='+theme+'partner='+inp.value)
					const { Dialog } = await import('/-dialog/Dialog.js')
					const popup = Dialog.findPopup(form)
					Dialog.hide(popup)
				})
			})(document.currentScript.parentElement)
		</script>
	</form>
	
`