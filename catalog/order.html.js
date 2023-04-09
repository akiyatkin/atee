const addCSS = href => { //файл этот нельзя использовать на сервере
	if (document.head.querySelector('link[href="'+href+'"]')) return
	const link = document.createElement('link')
	link.rel = 'stylesheet'
	link.href = href
	document.head.prepend(link)
}
addCSS('/-float-label/style.css')

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
	
`
const checkbox = (name, title, checked) => `
	<div style="align-items: flex-start; display: grid; grid-template-columns: max-content 1fr;">
		<input ${checked ? 'checked' : ''} style="margin-right: 10px; transform: scale(1.4); transform-origin: left center" 
		type="checkbox" id="contacts_${name}" name="${name}"> 
		<label for="contacts_${name}">${title}</label>
	</div>
`
export const ROOT = (data, env) => `
	<p>
		Заказать <b>${data.mod.brand_title} ${data.mod.model_title}</b>
	</p>
	<p>
		Менеджер перезвонит в рабочее время.
	</p>
	<form action="/-catalog/set-order" data-goal='callorder'>
		<input name="brand_nick" type="hidden" value="${data.mod.brand_nick}">
		<input name="model_nick" type="hidden" value="${data.mod.model_nick}">
		<input name="partner" type="hidden" value="${data.partner}">
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
				name="text" style="width:100%; box-sizing: border-box; min-height:130px">Добрый день! Интересует ${data.mod.brand_title} ${data.mod.model_title}.</textarea>
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
		(form => {
			import("/-form/Autosave.js").then(r => r.default.init(form))
			form.addEventListener('submit', e => {
				e.preventDefault()
				import('/-dialog/submit.js').then(r => r.default(form, {tpl:'/-dialog/contacts.html.js', sub:'MSG'}))
			})
		})(document.currentScript.previousElementSibling)
	</script>
`