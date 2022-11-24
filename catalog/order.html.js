export const SUCCESS = () => `
	<h1>Заявка отправлена</h1>
	<p style="font-size: 1rem; line-height: 140%; margin-left:auto; margin-right:auto">
		Менеджер свяжется с&nbsp;Вами<br>в&nbsp;рабочее&nbsp;время, как&nbsp;можно&nbsp;быстрее 
	</p>
`
export const ERROR = () => `
	<h1 style="opacity:0.5">Ошибка</h1>
	<div style="max-width: 300px; position: relative; z-index:1"><p style="font-weight: 500;" class="msg"></p></div>
`
const textarea = (name, title) => `
	<div class="float-label">
		<textarea placeholder="${title}" id="contacts_${name}" name="${name}" style="widtH:100%; box-sizing: border-box; min-height:130px"></textarea>
		<label for="contacts_${name}">${title}</label>
	</div>
`
const input = (type, name, title, req) => `
	<div class="float-label">
		<input ${req?'required ':' '}id="contacts_${name}" name="${name}" type="${type}" placeholder="${title}">
		<label for="contacts_${name}">${title}</label>
	</div>
`
const checkbox = (name, title, checked) => `
	<div style="align-items: flex-start; display: grid; grid-template-columns: max-content 1fr;">
		<input ${checked ? 'checked' : ''} style="margin-right: 10px; transform: scale(1.4); transform-origin: left center" 
		type="checkbox" id="contacts_${name}" name="${name}"> 
		<label for="contacts_${name}">${title}</label>
	</div>
`
export const ROOT = (data, div, partner = '') => `
	<link rel="stylesheet" href="/-float-label/style.css">
	<p>
		Заказать <b>${data.mod.brand_title} ${data.mod.model_title}</b>
	</p>
	<p>
		Менеджер перезвонит в рабочее время.
	</p>
	<form action="/-catalog/set-order">
		<input name="brand_nick" type="hidden" value="${data.mod.brand_nick}">
		<input name="model_nick" type="hidden" value="${data.mod.model_nick}">
		<input name="partner" type="hidden" value="${partner}">
		<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem">
			${input('tel', 'phone','Телефон *', true)}
			${input('email', 'email','Email *', true)}
		</div>
		${textarea('text','Дополнительная информация')}
		<div style="max-width: 500px; margin-top: 1rem;">
			${checkbox('terms','<span style="display: block; font-size: 12px; line-height: 14px">Нажимая кнопку «Жду предложения», я даю согласие на обработку моих персональных данных, в соответствии с Федеральным законом от 27.07.2006 года №152-ФЗ «О персональных данных», на усфловиях и для целей, определенных в <a href="/terms">Согласии</a> на обработку персональных данных.</span>', true)}
		</div>
		<p>
			<button type="submit">Отправить</button>
		</p>
	</form>
	<div id="modalFormSuccess"></div>
	<div id="modalFormError"></div>
	<script type="module">
		import { UTM }  from '/-form/UTM.js'
		import { Once } from "/-controller/Once.js"
		import { Dialog } from '/-dialog/Dialog.js'
		const id = id => document.getElementById(id)
		const div = id('${div}')
		const form = div.getElementsByTagName('form')[0]
		const button = form.getElementsByTagName('button')[0]
		

		const popup_success = id('modalFormSuccess')
		document.body.append(popup_success)
		const popup_error = id('modalFormError')
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
					
					const metrikaid = window.Ya?._metrika.getCounters()[0].id
					if (metrikaid) {
						const goal = 'callorder'
						console.log('Goal.reach ' + goal)
						ym(metrikaid, 'reachGoal', goal);
						
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
`