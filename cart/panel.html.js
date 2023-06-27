import common from "/-catalog/common.html.js"
import number from "/-cart/number-block.html.js"
import words from "/-words/words.js"
import cost from "/-words/cost.js"
import ago from "/-words/ago.js"


const tpl = {}
export default tpl

const getv = (mod, prop_title) => mod[prop_title] ?? mod.more[prop_title] ?? ''
const prefixif = (prefix, val, postfix = '') => val ? prefix + val + postfix : ''

tpl.css = [...number.css, '/-float-label/style.css']
tpl.ROOT = (data, env) => `
	<div class="panel">
		<style>
			${env.scope} {
/*				z-index:200;*/
				position: sticky; bottom:0; 
				z-index:1;
				background:white; 
				border-top: 1px solid var(--border-color);
				border-bottom: 1px solid var(--border-color);
			}
			${env.scope} .panel {
				pointer-events: none;
/*				transition: max-height 0.5s;*/
			}
			
			${env.scope} .panel.up {
				position: relative;
			}
			${env.scope} .panel .hand {
				pointer-events: visiblePainted;
				margin:0 auto;
/*				height: 40px;*/
				position: relative;
				z-index: 1;
				margin-bottom: -15px;
				margin-top: -25px;
				width:max-content; 
				border-radius: var(--radius, 10px); 
				background: white; 
				border:solid 1px var(--border-color, gray); 
				align-items: center;
				display: none;
				transition: margin-top 0.3s;
				grid-template-columns: max-content 1fr max-content;
			}
			${env.scope} .panel .whenshow {
				max-height: 0;
				overflow: hidden;
				transition: max-height 0.3s;
			}
			${env.scope} .panel.show .whenshow {
				overflow: visible;
				max-height: 800px;
			}
			${env.scope} .panel.up .hand {
				display: grid;
				
			}

			${env.scope} .panel.up .hand svg {
				transform-origin: center;
				transition: transform 0.3s;
			}
			${env.scope} .panel.show .hand .btnup svg {
				transform: rotate(180deg);
			}
			${env.scope} .panel .hand .title {
				line-height: 1; 
				padding:0.5rem 0;
				cursor: pointer;
			}
			${env.scope} .panel .hand .btnup {
				cursor: pointer;
				padding:0.5rem 1rem;
			}
			${env.scope} .panel .hand .btnhide {
				cursor: pointer;
				transition: padding-left 0.3s, width 0.3s;
				padding:0.5rem 1rem;
			}
			${env.scope} .panel.hide .hand .btnhide {
				width: 0;
				opacity: 0;
				padding-left: 0;
			}
			
			${env.scope} .panel .body {

				max-height: 105px;
				transition: max-height 0.3s;
/*				overflow: auto;*/
				overflow-y: scroll;
				-ms-overflow-style: none;  /* Internet Explorer 10+ */
    			scrollbar-width: none;  /* Firefox */

				pointer-events: visiblePainted;

				/*display: grid;
				grid-template-columns: 1fr 1fr;
				gap: 1fr;*/
			}
			@media (max-width:480px) {
				${env.scope} .panel .body {
					max-height: 141px;
				}
			}
			${env.scope} .panel .body::-webkit-scrollbar { 
			    display: none;  /* Safari and Chrome */
			}
			
			
			${env.scope} .panel.show .body {
				max-height: calc(100vh - 200px);
			}
			${env.scope} .panel.ready .body {
				/*overflow-y: visible;
				overflow-x: auto;*/

			}
			${env.scope} .panel.hide .body {
				/*overflow: hidden;
				overflow-y: visible;*/
/*				max-height: 1rem;*/
				max-height: 0;
			}
			${env.scope} .panel.hide .hand {
				margin-top: calc(-1em - 25px - 2px);
			}
			${env.scope} .panel .body .padding {
				padding: 25px 0 20px 0;
			}
			
			${env.scope} .panel .body .content {
				display: grid; 
				grid-template-columns: 1fr 1fr; 
				gap: 0 2rem;
			}
			@media (max-width: 1199px) {
				
				${env.scope} .panel .mobhide {
					display: none;
				}
				${env.scope} .panel .body .content {
					grid-template-columns: 1fr;
				}
			}
		</style>
		<div class="hand">
			<div class="btnup">
				<svg fill="#000000" height="20" width="20" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
					 viewBox="0 0 511.801 511.801" xml:space="preserve">	
					<path d="M263.535,248.453c-4.16-4.16-10.88-4.16-15.04,0L3.054,493.787c-4.053,4.267-3.947,10.987,0.213,15.04
						c4.16,3.947,10.667,3.947,14.827,0l237.867-237.76l237.76,237.76c4.267,4.053,10.987,3.947,15.04-0.213
						c3.947-4.16,3.947-10.667,0-14.827L263.535,248.453z"/>
					<path d="M18.201,263.493l237.76-237.76l237.76,237.76c4.267,4.053,10.987,3.947,15.04-0.213c3.947-4.16,3.947-10.667,0-14.827
						L263.535,3.12c-4.16-4.16-10.88-4.16-15.04,0L3.054,248.453c-4.053,4.267-3.947,10.987,0.213,15.04
						C7.534,267.547,14.041,267.547,18.201,263.493z"/>
				</svg>
			</div>
			<button class="title transparent"></button>
			<div class="btnhide">
				<svg width="25" height="25" viewBox="0 0 1024 1024" fill="#000000" class="icon"  version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M176.662 817.173c-8.19 8.471-7.96 21.977 0.51 30.165 8.472 8.19 21.978 7.96 30.166-0.51l618.667-640c8.189-8.472 7.96-21.978-0.511-30.166-8.471-8.19-21.977-7.96-30.166 0.51l-618.666 640z" fill="" /><path d="M795.328 846.827c8.19 8.471 21.695 8.7 30.166 0.511 8.471-8.188 8.7-21.694 0.511-30.165l-618.667-640c-8.188-8.471-21.694-8.7-30.165-0.511-8.471 8.188-8.7 21.694-0.511 30.165l618.666 640z" fill="" /></svg>
			</div>
		</div>

		<div class="body" >
			<div class="container">
				<div class="content">
					<div id="PANELBODY"></div>
					<div id="PANELORDER"></div>
					<script>
						(div => {
							const panel = div.closest('.panel')
							div.addEventListener('click', async () => {
								if (panel.classList.contains('show')) return
								const Panel = await import('/-cart/Panel.js').then(r => r.default)
								Panel.up(panel)
							})
							//window.addEventListener('click', async e => {
							//	if (e.target.closest('.panel')) return
							//	const panel = div.closest('.panel')
							//	if (!panel.classList.contains('show')) return
							//	const Panel = await import('/-cart/Panel.js').then(r => r.default)
							//	Panel.down(panel)
							//})

							const keydown = async e => {
								if (!div.closest('body')) return document.removeEventListener('keydown', keydown)
								if (e.code != "Escape") return
								if (panel.classList.contains('hide')) return
								if (!panel.classList.contains('show')) return
								const Panel = await import('/-cart/Panel.js').then(r => r.default)
								Panel.down(panel)
							}
							document.addEventListener('keydown', keydown)

							const crossing = async e => {
								if (!div.closest('body')) return window.removeEventListener('crossing', crossing)
								const bread = e.detail.bread
								const Client = await window.getClient()
								if (bread.href == Client.search) return //Адрес не менялся
								const Panel = await import('/-cart/Panel.js').then(r => r.default)
								Panel.down(panel)
							}
							window.addEventListener('crossing', crossing)

						})(document.currentScript.previousElementSibling)
					</script>
				</div>
			</div>
		</div>
	</div>

	<script>
		(panel => {
			const hand = panel.querySelector('.hand')
			const btnup = hand.querySelector('.btnup')
			btnup.addEventListener('click', async () => {
				const Panel = await import('/-cart/Panel.js').then(r => r.default)
				Panel.toggle(panel)
			})
			const title = hand.querySelector('.title')
			title.addEventListener('click', async () => {
				const Panel = await import('/-cart/Panel.js').then(r => r.default)
				Panel.toggle(panel)
			})
			const btnhide = hand.querySelector('.btnhide')
			btnhide.addEventListener('click', async () => {
				const Panel = await import('/-cart/Panel.js').then(r => r.default)
				Panel.hide(panel)
			})
			panel.addEventListener('click', async e => {
				const Panel = await import('/-cart/Panel.js').then(r => r.default)
				const a = e.target.closest('a')
				if (!a) return
				Panel.toggle(panel)
			})

		})(document.currentScript.previousElementSibling)
	</script>
`
const checkbox = (name, title, checked) => `
	<div style="align-items: flex-start; display: grid; grid-template-columns: max-content 1fr;">
		<input ${checked ? 'checked' : ''} style="margin-right: 10px; transform: scale(1.4); transform-origin: left center" 
		type="checkbox" id="contacts_${name}" name="${name}"> 
		<label for="contacts_${name}">${title}</label>
	</div>
`
tpl.SUM = (sum) => `${cost(sum)}${common.unit()}`
tpl.TITLE = (obj) => obj.length ? `<b>${obj.length}</b> ${words(obj.length, 'позиция','позиции','позиций')} <b>${tpl.SUM(obj.sum)}</b>` : `<b>${obj.orders}</b> ${words(obj.orders, 'заказ','заказа','заказов')}` //`В заказе ещё нет товаров` 
const TITLES = {
	"wait":"Оформить заказ",
	"check":"Заказ оформлен",
	"complete":"Заказ выполнен",
	"cancel":"Заказ отменён",
	"empty":"В заказе нет товаров",
	"pay":"Заказ ожидает оплату"
}
tpl.ORDER = (data, env) => tpl.isShowPanel(data) ? `
<!-- position: sticky; top: 0; -->
	<div class="padding" style="">
		<style>
			${env.scope} .field {
				display: grid; 
				grid-template-columns: 1fr max-content; 
				align-items: center;
			}
			${env.scope} .res {
				cursor: pointer;
			}
			${env.scope} .res .success {
				color: var(--border-color, green);
			}
			${env.scope} .res .error {
				color: red;
			}
			${env.scope} .res .required {
				color: gray;
			}
			${env.scope} .res .loader {
				color: var(--blue, gray);
				animation-name: cart_res_rotation;
				animation-duration: 1s;
				animation-iteration-count: infinite;
				animation-timing-function: linear;
			}
			${env.scope} .res svg {
				display: none;
			}
			${env.scope} .res svg.show {
				display: block;
			}
			@keyframes cart_res_rotation {
				0% {
					transform:rotate(0deg);
				}
				100% {
					transform:rotate(360deg);
				}
			}
		</style>
		<div class="whenshow">
			<h1 style="margin-top:1rem;">${TITLES[data.order.status]}
			${data.user.manager ? showCrown() : ''}
			<a href="/cart/mail" style="color:inherit; margin-left:1ch; margin-bottom: 2rem; float:right; font-weight: normal">№ ${data.order.order_nick}</a></h1>
			${data.order.status != 'wait' ? showDate(data.order, env) : ''}
			${data.list.length ? tpl.showForm(data, env) : showEmpty(data, env)}
			${data.orders.length > 1 ? showOrders(data, env) : ''}
		</div>
	</div>
` : ``
const showCrown = () => `
	<a href="/cart/manager/${new Date().getFullYear()}/${new Date().getMonth() + 1}?status=check" title="Вы администратор и можете на любой email оформить заказ. Заказ будет доступен и Вам и новому пользователю">
		<svg style="color: var(--success); margin-bottom: 3px;" width="24" height="24" viewBox="0 0 18 18" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M2.179 13.425h13.656v3.02H2.179v-3.02z" fill="currentColor" fill-opacity=".8"/><path fill-rule="evenodd" clip-rule="evenodd" d="M8.999 1L2.093 11.031h4.25l6.662-4.315L9 1z" fill="currentColor" fill-opacity=".6"/><path fill-rule="evenodd" clip-rule="evenodd" d="M2.067 12.641L.5 3.752l12.76 8.89H2.068z" fill="currentColor"/><path fill-rule="evenodd" clip-rule="evenodd" d="M15.927 12.641l1.607-8.858L3.857 12.64h12.07z" fill="currentColor" fill-opacity=".8"/></svg>
	</a>
`
const showDate = (order, env) => `
	<p>
		<!-- ${printDate('Создан', order.datewait)} -->
		${order.status != 'wait' ? printDate('Оформлен', order.datecheck) : ''}
		<!-- ${order.status == 'cancel' ? printDate('Отменён', order.datecancel) : ''} 
		${order.status == 'complete' ? printDate('Выполнен', order.datecomplete) : ''} -->
	</p>
`
const printDate = (title, date) => date ? `
	${title}: ${ago(date * 1000)}. ${new Date(date * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' })}<br>	
` : ''
const showEmpty = (data, env) => `
	${data.order.status == 'wait' ? '<p>В заказе ещё нет товаров</p>' : ''}
`
tpl.showForm = (data, env) => `
		
		<form data-goal="cart" action="/-cart/set-submit?partner=${env.theme.partner}" style="clear:both; border-radius:var(--radius, 10px); display: grid; gap:1rem; background:var(--lightyellow);">
			<div class="float-label icon name field">
				<input ${data.order.status == 'wait' ? '' : 'disabled'} required id="${env.sid}name" name="name" type="text" placeholder="Получатель (ФИО)" value="${data.order.name || ''}">
				<label for="${env.sid}name">Получатель (ФИО)</label>
				${data.order.status == 'wait' ? tpl.svgres('required', data.order.name) : ''}
			</div>
			<div class="float-label icon phone field">
				<input ${data.order.status == 'wait' ? '' : 'disabled'} required id="contacts_phone" name="phone" type="tel" placeholder="Телефон" value="${data.order.phone || ''}">
				<label for="contacts_phone">Телефон</label>
				${data.order.status == 'wait' ? tpl.svgres('required', data.order.phone) : ''}
			</div>
			<div class="float-label icon mail field">
				<input ${data.order.status == 'wait' ? '' : 'disabled'} required id="${env.sid}email" name="email" type="email" placeholder="Email" value="${data.order.email || ''}">
				<label for="${env.sid}email">Email</label>
				${data.order.status == 'wait' ? tpl.svgres('required', data.order.email) : ''}
			</div>
			${tpl.showAddress(data,env)}
			${tpl.formMessage(data, env)}
			
			
			${data.order.partner ? showPartner(data, env) : '' }
			
			<div class="float-label field">
				<textarea ${data.order.status == 'wait' ? '' : 'disabled'} placeholder="Комментарий" id="${env.sid}text" 
					name="commentuser" style="width:100%; box-sizing: border-box; min-height:130px">${data.order.commentuser || ''}</textarea>
				<label for="${env.sid}text">Комментарий к заказу</label>
				<div style="align-self: flex-start; margin-top: 0.5rem">
					${data.order.status == 'wait' ? tpl.svgres('optional', data.order.commentuser) : ''}
				</div>
			</div>
			${data.order.status == 'wait' ? showSubmit(data, env) : ''}
		</form>		
`
tpl.formMessage = (data, env) => `
	<div>
		Менеджер уточнит стоимость,&nbsp;варинты&nbsp;доставки и&nbsp;в&nbsp;рабочее время свяжется с&nbsp;Вами. Предложение на&nbsp;сайте&nbsp;не&nbsp;является публичной офертой, итоговая цена может&nbsp;отличаться.
	</div>
`
tpl.showAddress = (data, env) => `
	<div class="float-label icon org field">
		<input ${data.order.status == 'wait' ? '' : 'disabled'} id="${env.sid}address" name="address" type="text" placeholder="Полный адрес доставки" value="${data.order.address || ''}">
		<label for="${env.sid}address">Город и адрес доставки</label>
		${data.order.status == 'wait' ? tpl.svgres('optional', data.order.address) : ''}
	</div>
`
const showPartner = (data, env) => `
	<div>
		Ключ партнёра: <b>${data.order.partner.title}</b>
	</div>
`
const showMonth = (data, env, month) => `
	<div>
		<b style="text-transform: capitalize;">${month.title}</b> <span style="white-space: nowrap">${month.list.map(index => showOrder(data, env, data.orders[index])).join(',</span> <span style="white-space: nowrap">')}</span>
	</div>
`
const showYear = (data, env, year) => `
	<div style="margin-bottom:1rem">
		<h3>${year.title}</h3>
		${year.months.map(month => showMonth(data, env, month)).join('')}
	</div>
`

const showOrders = (data, env) => `
	<h2>Мои заказы</h2>
	<!-- <h2>Заказы <span style="font-weight: normal">${data.ouser.email || ''}</span></h2> -->
	<style>
		${env.scope} .orders button:disabled {
			font-weight: bold;
			opacity: 1;
		}
	</style>
	<div class="orders" style="padding-bottom:2rem">
		${data.years.map(year => showYear(data, env, year)).join('')}
	</div>
	<script>
		(div => {
			for (const button of div.getElementsByTagName('button')) {
				button.addEventListener('click', async () => {
					const ans = await fetch('/-cart/set-newactive?' + new URLSearchParams({ order_id: button.dataset.order_id }).toString()).then(r => r.json()).catch(e => {
						console.log(e)
						return {msg:'Ошибка на сервере'}
					})
					const Client = await window.getClient()
					Client.global('cart')
				})
			}
		})(document.currentScript.previousElementSibling)
	</script>
`
const showOrder = (data, env, order) => `<button title="${TITLES[order.status]}" ${data.order.order_id == order.order_id ? 'disabled ' : ''}data-order_id="${order.order_id}" style="${order.status == 'complete' ? 'color:green':''} ${order.status == 'cancel' ? 'color:gray; text-decoration: line-through':''} ${order.status == 'wait' ? 'color:red':''}" class="a">${order.order_nick}</button>`
const showSubmit = (data, env) => `
	<div style="max-width: 500px;">
		${checkbox('terms','<span style="display: block; font-size: 12px; line-height: 14px">Я даю согласие на обработку моих персональных данных, в соответствии с Федеральным законом от 27.07.2006 года №152-ФЗ «О персональных данных», на усфловиях и для целей, определенных в <a href="/terms">Согласии</a> на обработку персональных данных.</span>', true)}
	</div>
	<div class="field submit">
		<div style="display:flex; justify-content: space-between; align-items: center;">
			<div>
				
				<button class="a clear">Очистить</button>
			</div>
			<button type="submit" data-order_id=${data.order.order_id}>Отправить</button>
		</div>
		${tpl.svgres('optional')}
	</div>
	<script>
		(form => {
			//const promise = import("/-form/Autosave.js").then(r => r.default.init(form))
			const setres = (res, type, msg) => {
				const show = res.querySelector('.show')
				if (show) show.classList.remove('show')
				type = type || res.dataset.emptytype
				res.dataset.type = type
				res.dataset.msg = msg || {
					optional:'Опциональное поле',
					required:'Обязательное поле', 
					success:'Данные сохранены',
					loader: 'Идёт обработка'
				}[type] || ''
				const need = res.getElementsByClassName(type)[0]
				need.classList.add('show')
			}
			const restore = (res, input) => {
				const saved = res.dataset.saved || ''
				if (input.value && input.value == saved) setres(res, 'success')
				else if (input.value) setres(res, 'error')
				else setres(res)
			}
			const request = async (res, input) => {
				setres(res, 'loader')
				const ans = await fetch('/-cart/set-field?order_id&'+ new URLSearchParams({
					field: input.name,
					value: input.value
				}).toString()).then(r => r.json()).catch(e => {
					console.log(e)
					return {msg:'Ошибка на сервере'}
				})

				//if (!input.value && ans.result) setres(res)
				if (!input.value) setres(res)
				else setres(res, ans.result ? 'success' : 'error', ans.msg)
				return ans
			}
			for (const field of form.querySelectorAll('.field')) {
				const res = field.querySelector('.res')
				if (!res) continue
				let input = field.querySelector('input')
				if (!input) input = field.querySelector('textarea')

				res.addEventListener('click', async () => {
					//await promise
					const show = res.querySelector('.show')
					if (input && !res.dataset.msg) {
						const ans = await request(res, input)
					}
					const msg = res.dataset.msg
					const type = res.dataset.type
					const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
					Dialog.alert(msg)
				})
				
				if (!input) continue
				//promise.then(() => {
					//request(res, input)
					//input.dispatchEvent(new Event("input"))
					restore(res, input)
				//})
				input.addEventListener('input', async () => {
					const ans = await request(res, input)
				})
			}
			form.addEventListener('submit', async e => {
				e.preventDefault()
				const btn = form.querySelector('.submit')
				const res = btn.getElementsByClassName('res')[0]
				for (const r of form.getElementsByClassName('res')) {
					if (r == res) continue
					const showcls = r.querySelector('.show').classList
					if (
						!showcls.contains('success')
						&& !showcls.contains('optional')
					) {
						r.click()
						return
					}
				}
				setres(res, 'loader')
				const ans = await import('/-dialog/submit.js').then(r => r.default(form, {tpl:'${env.layer.tpl}', sub:'MSG'}))
				if (ans.result) {
					//setres(res, 'success', ans.msg)
					const Client = await window.getClient()
					Client.global('cart')
					//Client.reloadts('${env.layer.ts}')
				} else {
					setres(res, 'error', ans.msg) 
				}
			})
			const btnclear = form.querySelector('.clear')
			btnclear.addEventListener('click', () => {
				for (const field of form.querySelectorAll('.field')) {
					const res = field.querySelector('.res')
					if (!res) continue
					let input = field.querySelector('input')
					if (!input) input = field.querySelector('textarea')
					if (!input) continue
					input.value = ''
					input.dispatchEvent(new Event("input"))
					input.dispatchEvent(new Event("change"))
				}
			})
				
				
		})(document.currentScript.parentElement)
	</script>
`
tpl.MSG = (data, env) => `
	<h1>${data.result ? 'Готово' : 'Ошибка'}</h1>
	<div style="max-width: 400px;"><p class="msg">${data.msg || ''}</p></div>
`
tpl.svgres = (type, saved) => `
	<div data-saved="${saved || ''}" style="width:30px" class="res" data-type="${type || ''}" data-emptytype="${type || ''}">
		<svg class="success${type == 'success' ? ' show': ''}" fill="currentColor" width="30" height="30" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
			<path d="M15.3 5.3l-6.8 6.8-2.8-2.8-1.4 1.4 4.2 4.2 8.2-8.2"/>
		</svg>
		<svg class="loader${type == 'loader' ? ' show': ''}" style="margin:4px" fill="currentColor" width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
			<path d="M12 22c5.421 0 10-4.579 10-10h-2c0 4.337-3.663 8-8 8s-8-3.663-8-8c0-4.336 3.663-8 8-8V2C6.579 2 2 6.58 2 12c0 5.421 4.579 10 10 10z" stroke-linecap="round" stroke-linejoin="round"/>
		</svg>
		<svg class="error${type == 'error' ? ' show': ''}" fill="none" style="margin:3px" width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
			<path d="M12 16H12.01M12 8V12M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
		</svg>
		<svg class="required${type == 'required' ? ' show': ''}" style="margin:7px" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
			<path d="M8 0a1 1 0 0 1 1 1v5.268l4.562-2.634a1 1 0 1 1 1 1.732L10 8l4.562 2.634a1 1 0 1 1-1 1.732L9 9.732V15a1 1 0 1 1-2 0V9.732l-4.562 2.634a1 1 0 1 1-1-1.732L6 8 1.438 5.366a1 1 0 0 1 1-1.732L7 6.268V1a1 1 0 0 1 1-1z"/>
		</svg>
		<div class="optional${type == 'optional' ? ' show' : ''}"></div>
	</div>
`
tpl.isShowPanel = data => data.result && (data.list.length || data.orders.length > 1)
tpl.BODY = (data, env) => tpl.isShowPanel(data) ? `
	<div class="padding" style="position: sticky; top: 0">
		<style>
			${env.scope} .list {
				width: fit-content;
			    max-width: 100%;
			    margin: 0 auto;
				display: grid;
				grid-template-columns: max-content 1fr 1fr;
				gap: 1rem;
			}
			${env.scope} .cost {
				text-align: right;
				align-self: flex-start;
				display: grid;
				gap: 0.5ch;
				grid-template-columns: max-content max-content;
				grid-template-areas: 'input remove' 'sum .';
			}
			${env.scope} .delbtn {
				transition: color 0.1s;
				color:;
				margin-top: 4px; 
				color:var(--border-color, gray)
			}
			${env.scope} .delbtn:hover {
				color:var(--success);
			}
			@media(max-width: 480px) {
				${env.scope} .list {
				}
				${env.scope} .cost {
					text-align: left;
				}
				${env.scope} .image {
					grid-row: span 2;
					
				}
				${env.scope} .info {
					grid-column: span 2;
				}
				${env.scope} .cost {
					grid-column: span 2;
				}
			}
		</style>
		<div class="whenshow mobhide">
			<h1 style="margin-top:1rem;">&nbsp;</h1>
		</div>
		<div class="list">
			${data.list.map(mod => tpl.showPos(mod, env)).join('')}
			<!-- <div></div><div></div><div style="margin-top:1rem; text-align: right;"><a href="/cart/mail">Спецификация</a></div> -->
			<!-- <div><a href="/cart/mail">Спецификация</a></div> -->
		</div>
		
		
		
		
	</div>
	
	<script type="module">
		import Panel from '/-cart/Panel.js'
		import pantpl from "${env.layer.tpl}"
		const div = document.getElementById("${env.layer.div}")
		const body = div.closest('.body')
		body.scrollTo(0,0)
		const panel = div.closest('.panel')
		Panel.show(panel)
		const title = panel.querySelector('.title')
		const state = {
			orders: ${data.orders.length},
			list: []
		}
		const recalc = () => {
			state.length = 0
			state.sum = 0
			for (const store of state.list) {
				if (!Number(store.count)) continue
				state.length++
				state.sum += Number(store.sum)
			}
		}
		panel.classList.add('up')
		for (const block of panel.querySelectorAll('.blocksum')) {
			const mod = block.dataset
			const input = block.querySelector('input[type=number]')
			const modsum = block.querySelector('.modsum')
			state.list.push(mod)
			input.addEventListener('input', async () => {
				mod.count = input.value
				mod.sum = mod.cost * mod.count
				modsum.innerHTML = pantpl.SUM(mod.sum)
				recalc()
				title.innerHTML = pantpl.TITLE(state)

				const request = await import('/-dialog/request.js').then(r => r.default)
				const ans = await request('/-cart/set-add', block, {goal: 'basket'})
				if (ans.orderrefresh) {
					const Client = await window.getClient()
					Client.global('cart')
				}
			})
			const del = block.querySelector('.del')
			del.addEventListener('click', async () => {
				const request = await import('/-dialog/request.js').then(r => r.default)
				request('/-cart/set-remove', block, {global: 'cart'})
			})
		}
		recalc()
		title.innerHTML = pantpl.TITLE(state)
	</script>
` : `
	<!-- В заказе ничего нет -->
	<script>
		(body => {
			const panel = body.closest('.panel')
			panel.classList.remove('up')
		})(document.currentScript.parentElement)
	</script>
`


tpl.showPos = (mod, env) => `
	<a href="/catalog/${mod.brand_nick}/${mod.model_nick}" class="image">${mod.images?.[0] ? tpl.showImage(mod) : ''}</a>
	<div class="info">
		<div>${mod.brand_title} ${mod.model_title}${prefixif(' (', getv(mod,'Позиция') || getv(mod,'Арт'),')')}</div>
		<div><b>${cost(mod.Цена)}${common.unit()}</b></div>
	</div>
	<div class="cost blocksum" 
	data-partner="${env.theme.partner}"
	data-brand_nick="${mod.brand_nick}" 
	data-model_nick="${mod.model_nick}"
	data-item_num="${mod.item_num}"
	data-sum="${mod.sum}"
	data-cost="${mod.Цена || 0}" 
	data-count="${mod.count || 0}">

		<div style="grid-area: input;">${number.INPUT({min:0, max:1000, value:mod.count, name:mod.model_nick})}</div>
		<div style="grid-area: sum"><b class="modsum">${tpl.SUM(mod.sum)}</b></div>
		<div style="grid-area: remove">
			<button title="Удалить из корзины" class="delbtn del transparent">
				<svg style="fill:currentColor;" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M20 6H16V5C16 4.20435 15.6839 3.44129 15.1213 2.87868C14.5587 2.31607 13.7956 2 13 2H11C10.2044 2 9.44129 2.31607 8.87868 2.87868C8.31607 3.44129 8 4.20435 8 5V6H4C3.73478 6 3.48043 6.10536 3.29289 6.29289C3.10536 6.48043 3 6.73478 3 7C3 7.26522 3.10536 7.51957 3.29289 7.70711C3.48043 7.89464 3.73478 8 4 8H5V19C5 19.7956 5.31607 20.5587 5.87868 21.1213C6.44129 21.6839 7.20435 22 8 22H16C16.7956 22 17.5587 21.6839 18.1213 21.1213C18.6839 20.5587 19 19.7956 19 19V8H20C20.2652 8 20.5196 7.89464 20.7071 7.70711C20.8946 7.51957 21 7.26522 21 7C21 6.73478 20.8946 6.48043 20.7071 6.29289C20.5196 6.10536 20.2652 6 20 6ZM10 5C10 4.73478 10.1054 4.48043 10.2929 4.29289C10.4804 4.10536 10.7348 4 11 4H13C13.2652 4 13.5196 4.10536 13.7071 4.29289C13.8946 4.48043 14 4.73478 14 5V6H10V5ZM17 19C17 19.2652 16.8946 19.5196 16.7071 19.7071C16.5196 19.8946 16.2652 20 16 20H8C7.73478 20 7.48043 19.8946 7.29289 19.7071C7.10536 19.5196 7 19.2652 7 19V8H17V19Z"/>
				</svg>
			</button>
		</div>
	</div>
`
tpl.showImage = mod => `
	<img alt="" width="80" height="70" src="/-imager/webp?fit=contain&h=100&w=100&src=${mod.images[0]}">
`