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
	</form>
	<script>
		(async form => {
			const inp = form.elements['partner']
			import("/@atee/form/Autosave.js").then(r => r.default.init(form))
			form.addEventListener('submit', async e => {
				e.preventDefault()

				const url = new URL(location)
				let theme = url.searchParams.get('theme')
				theme = theme ? theme + ':' : ''
				
				let m = url.searchParams.get('m')
				m = m ? 'm=' + m + '&' : ''

				const need = await import('/@atee/nicked/getNeed.js').then(r => r.default(inp))

				await window.getClient().then(r => r.pushState('?'+ m +'theme=' + theme + 'partner=' + need.hash))
				
				const Dialog = await import('/@atee/dialog/Dialog.js').then(r => r.default)
				Dialog.hide(Dialog.findPopup(form))
				fetch('/-catalog/get-partner?partner=' + need.hash).then(e => e.json()).then(ans => Dialog.open({
					tpl:'/@atee/catalog/partner.html.js', 
					sub:ans.result ? 'SUCCESS' : 'ERROR'
				})).catch(e => console.log(e))
			})
		})(document.currentScript.previousElementSibling)
	</script>
`
export const SUCCESS = () => `
	<h1>Хорошо</h1>
	<p>Теперь для Вас действуют более <a href="/catalog">выгодные цены.</a></p>
`
export const ERROR = () => `
	<h1>Ключ неточный</h1>
	<p>Ключ мог устареть или введён с ошибкой.</p>
`