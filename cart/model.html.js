import tpl from "/@atee/catalog/model.html.js"
export default tpl

const origButton = tpl.orderButton
tpl.orderButton = (data, env, mod) => mod.Цена ? `
	<p align="right">
		<button 
		data-brand_nick="${mod.brand_nick}"
		data-model_nick="${mod.model_nick}"
		data-item_num="${mod.item_num}"
		data-partner="${env.theme.partner}"
		style="font-size:1.2rem;">
			Добавить в корзину
		</button>
		<script>
			(btn => {
				btn.addEventListener('click', async () => {
					const request = await import('/-dialog/request.js').then(r => r.default)
					request('/-cart/set-add?count=1', btn, {global: 'cart', goal: 'basket'})
				})
			})(document.currentScript.previousElementSibling)
		</script>
	</p>
` : origButton(data, env, mod)