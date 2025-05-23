// const addCSS = href => { //файл этот нельзя использовать на сервере
// 	if (document.head.querySelector('link[href="'+href+'"]')) return
// 	const link = document.createElement('link')
// 	link.rel = 'stylesheet'
// 	link.href = href
// 	document.head.prepend(link)
// }
// addCSS('/-float-label/style.css')
const tpl = {}
export default tpl
tpl.css = ['/-float-label/style.css']
tpl.successmsg = (data, env) => `
	<p>
		Для Вас действуют более <a href="/catalog">выгодные цены</a>!
	</p>
`
tpl.POPUP = (data, env) => `
	<h1>Вход для партнёра</h1>
	${data.result
		? '<p>Активный ключ <b>' + data.partner + '</b></p>' + tpl.successmsg(data, env)
		: '<p>Нет активного ключа</p>'
	}
	${data.descr ? '<p style="max-width:600px"><i>' + data.descr + '</i></p>' : ''}
	<form action="/-catalog/set-partner">
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
			import("/-form/Autosave.js").then(r => r.default.init(form))
			form.addEventListener('submit', async e => {
				e.preventDefault()

				const url = new URL(location)
				let theme = url.searchParams.get('theme')
				theme = theme ? theme + ':' : ''
				
				let m = url.searchParams.get('m')
				m = m ? 'm=' + m + '&' : ''

				const need = await import('/-nicked/getNeed.js').then(r => r.default(inp))

				const Client = await window.getClient()
				Client.go('?'+ m +'theme=' + theme + 'partner=' + need.hash)
				
				const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
				Dialog.hide(Dialog.findPopup(form))
				const ans = await fetch('/-catalog/get-partner?partner=' + need.hash).then(e => e.json()).catch(e => false)
				Dialog.open({
					tpl:'/-catalog/partner.html.js', 
					data:ans,
					sub:ans.result ? 'SUCCESS' : 'ERROR'
				})
			})
		})(document.currentScript.previousElementSibling)
	</script>
`
tpl.SUCCESS = (data, env) => `
	<h1>Хорошо</h1>
	<p>${tpl.successmsg(data, env)}</p>
	${data.descr ? '<p style="max-width:600px"><i>' + data.descr + '</i></p>' : ''}
`
tpl.ERROR = (data, env) => `
	<h1>Ключ неточный</h1>
	<p>Ключ мог устареть или введён с ошибкой.</p>
`