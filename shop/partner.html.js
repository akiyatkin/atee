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
		Для Вас действуют более <a href="${data.conf.root_path}/group/${data.conf.root_nick}">выгодные цены</a>!
	</p>
`
tpl.POPUP = (data, env) => `
	<h1>Вход для партнёра</h1>
	${data.partner
		? '<p>Активный ключ <b>' + data.partner.title + '</b></p>' + tpl.successmsg(data, env)
		: '<p>Нет активного ключа</p>'
	}
	${data.partner.descr ? '<p style="max-width:600px"><i>' + data.partner.descr + '</i></p>' : ''}
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
				
				const getNeed = await import('/-nicked/getNeed.js').then(r => r.default)
				const need = getNeed(inp)

				const addget = await import('/-words/addget.js').then(r => r.default)

				const Client = await window.getClient()

				Client.go(addget(Client.bread.get, {theme: theme + 'partner=' + need.hash}))
				//let m = url.searchParams.get('m')
				//m = m ? 'm=' + m + '&' : ''
				//Client.go('?'+ m +'theme=' + theme + 'partner=' + need.hash)
				
				const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
				Dialog.hide(Dialog.findPopup(form))
				const ans = await fetch('/-shop/get-partner?partner=' + need.hash).then(e => e.json()).catch(e => false)
				Dialog.open({
					tpl:'/-shop/partner.html.js', 
					data:ans,
					sub:ans.partner ? 'SUCCESS' : 'ERROR'
				})
			})
		})(document.currentScript.previousElementSibling)
	</script>
`
tpl.SUCCESS = (data, env) => `
	<h1>Хорошо</h1>
	<p>${tpl.successmsg(data, env)}</p>
	${data.partner.descr ? '<p style="max-width:600px"><i>' + data.partner.descr + '</i></p>' : ''}
`
tpl.ERROR = (data, env) => `
	<h1>Ключ неточный</h1>
	<p>Ключ мог устареть или введён с ошибкой.</p>
`