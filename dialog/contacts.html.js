const cont = {}
export default cont
cont.CALLBACK = (data, env, {layer:{div}} = env) => `
	<div style="max-width:500px">
		<h1>Заказать звонок</h1>
		<p>
			Оставьте телефон, менеджер перезвонит в&nbsp;рабочее&nbsp;время!
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
		<script type="module">
			import { UTM }  from '/-form/UTM.js'
			import { Once } from "/-controller/Once.js"
			import { Dialog } from '/-dialog/Dialog.js'
			const id = id => document.getElementById(id)
			const div = id('${div}')
			const form = div.getElementsByTagName('form')[0]
			const button = form.getElementsByTagName('button')[0]
			

			const popup_success = document.createElement('div')
			document.body.append(popup_success)
			const popup_error = document.createElement('div')
			document.body.append(popup_error)
			
			
			const { Autosave } = await import("/-form/Autosave.js")
			await Autosave.init(form)	
			
			//await new Promise(resolve => setTimeout(resolve, 50))
			const SITEKEY = "${data.SITEKEY}"
			const RNAME = "g-recaptcha-response"
			const captha = document.createElement("input")
			captha.type = "hidden"
	        captha.name = RNAME
	        form.appendChild(captha)
			const recaptcha = Once.proxy(() => {
				return new Promise(async resolve => {
					const src = 'https://www.google.com/recaptcha/api.js?render=' + SITEKEY
					const s = document.createElement("SCRIPT")
				    s.type = "text/javascript"
				    s.async = true
					s.defer = true
					s.crossorigin = "anonymous"
				    s.onload = () => grecaptcha.ready(resolve)
				    s.src = src
				    document.head.append(s)
				})
		    })
			const addcaptcha = async () => {
				await recaptcha()
				captha.value = await grecaptcha.execute(SITEKEY, { action: 'contacts' })
			}
		    const utms = document.createElement("input")
		    utms.type = "hidden"
			utms.name = "utms"
			form.appendChild(utms)
			const addutm = async () => {
				const res = await UTM.get()
				utms.value = JSON.stringify(res)
			}
			
			const tplobj = await import('/-catalog/order.html.js')
			await Dialog.frame(popup_success, tplobj.SUCCESS())
			await Dialog.frame(popup_error, tplobj.ERROR())
			form.addEventListener('submit', async e => {
				e.preventDefault()
				button.disabled = true
				await Promise.all([addcaptcha(), addutm()])
				const response = await fetch(form.action, {
					method: 'POST',
					headers: { "Content-Type": "application/x-www-form-urlencoded" },
					body: new URLSearchParams(new FormData(form))
				}).catch(e => {
					console.error(e)
				})

				const error_msg = popup_error.getElementsByClassName('msg')[0]
				try {
					const res = await response.clone().json()
					if (res.result) {
						Dialog.hide(div)
						Dialog.show(popup_success)
						if (window.dataLayer) {
							console.log('Goal.reach contacts');
							dataLayer.push({'event': 'callorder'});
						}
					} else {
						error_msg.innerHTML = res.msg
						Dialog.show(popup_error)
					}
				} catch (e) {
					let text = await response.text()
					console.error(e, text)
					error_msg.innerHTML = 'Произошла ошибка на сервере. Попробуйте позже'
					Dialog.show(popup_error)
				} finally {
					setTimeout(() => button.disabled = false, 1000);
				}
			})		
		</script>
	</div>
`