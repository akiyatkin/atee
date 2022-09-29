export const POPUP = (data, env) => `
	<h1>Вход для партнёра</h1>
	${data.result
		? '<p>Активный ключ <b>'+data.partner+'</b>. <br>Для Вас действуют более <a href="/catalog">выгодные цены</a>.</p>'
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
					const { default:getNeed } = await import('/-nicked/getNeed.js')
					const need = getNeed(inp)
					Client.pushState('?theme=' + theme + 'partner=' + need.hash)
					const { Dialog } = await import('/-dialog/Dialog.js')
					Dialog.hide(Dialog.findPopup(form))
					fetch('/-catalog/get-partner?partner=' + need.hash).then(e => e.json()).then(ans => {
						Dialog.open({
							tpl:'/-catalog/partner.html.js', 
							sub:ans.result ? 'SUCCESS' : 'ERROR'
						})
					}).catch(e => console.log(e))
				})
			})(document.currentScript.parentElement)
		</script>
	</form>
`
export const SUCCESS = () => `
	<h1>Хорошо</h1>
	<p>Теперь для Вас действуют более <a href="/catalog">выгодные цены.</a></p>
`
export const ERROR = () => `
	<h1>Ключ неточный</h1>
	<p>Ключ мог устареть или введён с ошибкой.</p>
`