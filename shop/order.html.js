import Ecommerce from "/-shop/Ecommerce.js"
export const css = ['/-float-label/style.css']
import cards from "/-shop/cards.html.js"
const getv = (mod, prop_title) => mod[prop_title] ?? mod.more[prop_title] ?? ''
const prefixif = (prefix, val, postfix = '') => val ? prefix + val + postfix : ''

export const SUCCESS = () => `
	<h1>Заказ оформлен</h1>
	<p style="font-size: 1rem; line-height: 140%; margin-left:auto; margin-right:auto">
		Менеджер свяжется с&nbsp;Вами<br>в&nbsp;рабочее&nbsp;время, как&nbsp;можно&nbsp;быстрее 
	</p>
`
export const ERROR = () => `
	<h1 style="opacity:0.5">Ошибка</h1>
	<div style="max-width: 300px; position: relative; z-index:1"><p style="font-weight: 500;" class="msg"></p></div>
`
const textarea = (name, title) => `
	
`
const checkbox = (name, title, checked) => `
	<div style="align-items: flex-start; display: grid; grid-template-columns: max-content 1fr;">
		<input ${checked ? 'checked' : ''} style="margin-right: 10px; transform: scale(1.4); transform-origin: left center" 
		type="checkbox" id="contacts_${name}" name="${name}"> 
		<label for="contacts_${name}">${title}</label>
	</div>
`
const getSelItem = (data, env) => {
	const model = data.model
	const name = env.crumb.name
	// const single = model.recap.brendart[0] == model.recap.brendmodel[0]
	// return model.items.find(item => item.art?.[0] == name || item.brendart[0] == name || single) || false
	return model.items.find(item => item.art?.[0] == name || item.brendart[0] == name) || false
}
export const ROOT = (data, env) => `${showBody(data, env, data.model, getSelItem(data, env))}`
export const showBody = (data, env, model, item) => {
	const gain = (name) => cards.getSomeTitle(data, item, name)

	return `
		<p>
			Заказать <b>${gain('brendmodel')}</b>
		</p>
		<p>
			Менеджер перезвонит в рабочее время.
		</p>
		<form action="/-shop/set-order">
			<input name="brendmodel" type="hidden" value="${item.brendmodel[0]}">
			<input name="art" type="hidden" value="${item.art?.[0] || item.brendart[0]}">
			<input name="partner" type="hidden" value="${env.theme.partner}">
			<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom:1rem">
				<div class="float-label icon phone">
					<input required id="${env.sid}phone" name="phone" type="tel" placeholder="Телефон">
					<label for="${env.sid}phone">Телефон *</label>
				</div>
				<div class="float-label icon mail">
					<input required id="${env.sid}email" name="email" type="email" placeholder="Email">
					<label for="${env.sid}email">Email *</label>
				</div>
			</div>
			<div class="float-label">
				<textarea placeholder="Дополнительная информация" id="${env.sid}text" 
					name="text" style="width:100%; box-sizing: border-box; min-height:130px">Добрый день! Интересует ${gain('brendmodel')}.</textarea>
				<label for="${env.sid}text">Дополнительная информация</label>
			</div>
			<div style="max-width: 500px; margin-top: 1rem;">
				${checkbox('terms','<span style="display: block; font-size: 12px; line-height: 14px">Нажимая кнопку «Жду предложения», я даю согласие на обработку моих персональных данных, в соответствии с Федеральным законом от 27.07.2006 года №152-ФЗ «О персональных данных», на усфловиях и для целей, определенных в <a href="/terms">Согласии</a> на обработку персональных данных.</span>', true)}
			</div>
			<p>
				<button type="submit">Отправить</button>
			</p>
		</form>
		<script>
			(async form => {
				import("/-form/Autosave.js").then(r => r.default.init(form))

				const Dialog = await import("/-dialog/Dialog.js").then(r => r.default)
				const reachGoal = goal => {
					console.log('Goal.reach ' + goal)
					const metrikaid = window.Ya ? window.Ya._metrika.getCounters()[0].id : false
					if (metrikaid) ym(metrikaid, 'reachGoal', goal)
				}
				if (Dialog.parents.length) reachGoal('button')

				form.addEventListener('submit', async e => {
					e.preventDefault()
					const submit = await import('/-dialog/submit.js').then(r => r.default)
					const ans = await submit(form, {tpl:'/-dialog/contacts.html.js', sub:'MSG'})
					if (!ans.result) return
					
					const products = [${JSON.stringify(
						Ecommerce.getProduct(data, {
							coupon:env.theme.partner,
							item: item, 
							listname: 'Корзина', 
							position: 1,
							quantity: 1,
							group_nick: model.groups[0]
						})
					)}]
					const Ecommerce = await import('/-shop/Ecommerce.js').then(r => r.default)
					Ecommerce.purchase(products)
					reachGoal('callorder')
					reachGoal('cart')
				})
			})(document.currentScript.previousElementSibling)
		</script>
	`
}