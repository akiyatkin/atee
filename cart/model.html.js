import tpl from "/-catalog/model.html.js"
import cost from "/-words/cost.js"
import common from "/-catalog/common.html.js"
import links from "/-catalog/links.html.js"
import filters from "/-catalog/filters.html.js"
export default tpl
const origButton = tpl.orderButton
tpl.orderButton = (data, env, mod) => `
	<div id="ITEM"></div>
	<script type="module">
		window.dataLayer = window.dataLayer || []
		dataLayer.push({
			"ecommerce": {
				"currencyCode": "RUB",
				"detail": {
					"products": [
						{
							"id": "${mod.model_nick}",
							"name" : ${JSON.stringify(mod.Наименование || mod.model_title)},
							"price": "${getv(mod, 'Цена') || mod.min || ''}",
							"brand": "${mod.brand_title}",
							"category": "${mod.group_title}"
						}
					]
				}
			}
		})
	</script>
`
const ischoice = (env, index) => {
	const item_index = env.crumb.child?.name || 0
	if (item_index == index) return true
	else return false
}

const getv = (mod, prop_title) => mod[prop_title] ?? mod.more[prop_title] ?? ''
const prefixif = (prefix, val, postfix = '') => val ? prefix + val + postfix : ''
const getModItemPropValue = (item, mod, prop_title) => getv(mod, prop_title) || getv(item, prop_title) || ''

tpl.ITEM = (data, env) => {

	const mod = data.mod

	if (!mod) return ''
	if (mod.items.length == 1) {
		return mod.Цена ? tpl.showModelBuy(data, env, mod) : origButton(data, env, mod)
	}

	

	//if (!mod.Цена) return origButton(data, env, mod)	//Добавить в корзину точно ничего нельзя
	let item_index = env.crumb.child?.name || 0
	if (!mod.items[item_index]) item_index = 0
	const item = mod.items[item_index]
	
	const prop_titles = ["Позиция","Арт"]
	let html = filters.block("", showIprops(data, env, mod, prop_titles)) 
	
	html += `
	<style>
		${env.scope} .tableitem th,
		${env.scope} .tableitem td {
			font-size:13px;
			padding:2px 1ch;
		}
	</style>
	<table class="tableitem">
		${mod.item_props.map(pr => {
			if (pr.prop_title == 'Скидка') return ''
			if (pr.prop_title == 'Цена') return ''
			const val = common.prtitle(item, pr)
			if (val == null) return ''
			return tpl.showTrProp(data, env, pr, val)
		}).join('')}
	</table>`

	html += showItemIfCost(mod, item)
	
	

	if (!item.Цена && !mod.Цена) return html + origButton(data, env, mod, item)
	return html + tpl.showItemsBuy(data, env, mod, item)
}


const getitem = (data, env, v, index) => ischoice(env, index) ? 
`<span style="display: inline-block; margin-top:0.3em; border-radius:var(--radius);
		padding:0 1ch; line-height: 2;
		border:solid rgba(0,0,0,0.7) 3px;">
	${v}
</span>` : 
`<a style="margin-top:0.3em; display:inline-block; border-radius:var(--radius);
	padding:0 1ch; line-height: 2;
	border:solid rgba(0,0,0,0.15) 3px;" 
	class="a" data-scroll="none" rel="nofollow" 
	href="${env.crumb}${index ? '/' + index : ''}${links.setm(data)}">
	${v}
</a>`



const showIprops = (data, env, mod, prop_titles) => {
	const values = mod.items.reduce((ak, item) => {
		const prop_title = prop_titles.find(prop_title => getv(item, prop_title))
		ak.push(prop_title ? getv(item, prop_title) : '')
		return ak
	}, [])
	return `<span style="margin-right:0.3ch; font-size:90%">
		${values.map((v, index) => getitem(data, env, v, index)).join('<span style="display: inline-block; width:1ch"></span>')}
	</span>`
}
const showDiscount = (item) => `
	<span style="
	border-radius: 8px;
	border: solid 1px currentColor;
	background-color: rgba(255,255,255,.9);
	padding: 2px 8px;
	font-size: 0.9rem;
	color:var(--color-partner, green)">${item.discount ? ('-' + item.discount + '%') : ''}</span>
`
const showCost = (value) => value ? `${cost(value)}${common.unit()}` : ''
const showItemIfCost = (mod, item, oldcost = item['Старая цена'] || mod['Старая цена']) => mod.Цена ? '' : (item.Цена ? `
	<p>
		<s>${showCost(oldcost)}</s>

		<big>&nbsp;<b>${showCost(item.Цена || mod.Цена)}</b>&nbsp;</big>
		${item.discount ? showDiscount(item) : ''}

	</p>
`: `
	<p>
		<big><b>Цена по запросу</b></big>
	</p>
`)

// tpl.showItemsBuy = (data, env, mod, item) => `
// 	<p align="left">
// 		<button 
// 		data-brand_nick="${mod.brand_nick}"
// 		data-model_nick="${mod.model_nick}"
// 		data-item_num="${item.item_num || 1}"
// 		data-partner="${env.theme.partner || ''}"
// 		style="font-size:1.2rem;">
// 			Добавить в корзину
// 		</button>
// 		<script>
// 			(btn => {
// 				btn.addEventListener('click', async () => {
// 					const Basket = await import('/-cart/Basket.js').then(r => r.default)
// 					Basket.addButton(btn.dataset, 1, 'nocopy')
// 				})
// 			})(document.currentScript.previousElementSibling)
// 		</script>
// 	</p>
// `
// tpl.showModelBuy = (data, env, mod) => `
// 	<p align="right">
// 		<button 
// 		data-brand_nick="${mod.brand_nick}"
// 		data-model_nick="${mod.model_nick}"
// 		data-item_num="${mod.item_num || 1}"
// 		data-partner="${env.theme.partner || ''}"
// 		style="font-size:1.2rem;">
// 			Добавить в корзину
// 		</button>
// 		<script>
// 			(btn => {
// 				btn.addEventListener('click', async () => {
// 					const Basket = await import('/-cart/Basket.js').then(r => r.default)
// 					Basket.addButton(btn.dataset, 1, 'nocopy')
// 				})
// 			})(document.currentScript.previousElementSibling)
// 		</script>
// 	</p>
// `



tpl.showButtonBuy = (data, env, mod, item = {more:{}}) => `
	<button 
		data-brand_nick="${mod.brand_nick}"
		data-model_nick="${mod.model_nick}"
		data-item_num="${getModItemPropValue(mod, item, 'item_num')}"
		data-partner="${env.theme.partner || ''}"
		style="font-size:1.2rem; opacity: 0">
		Добавить в корзину
	</button>
	<script>
		(async btn => {

			const senditmsg = await import('/-dialog/senditmsg.js').then(r => r.default)
			const ans = await senditmsg(btn.parentElement, '/-cart/get-added', btn.dataset)
		
			btn.style.opacity = 1
			if (ans.count) btn.innerHTML = 'Открыть корзину'

			btn.addEventListener('click', async () => {
				if (ans.count) {
					const Panel = await import("/-cart/Panel.js").then(r => r.default)
					const panel = document.querySelector('.panel')
					if (!panel) return
					Panel.up(panel)
				} else {
					const Basket = await import('/-cart/Basket.js').then(r => r.default)
					Basket.addButton(btn.dataset, 1, 'nocopy')
					window.dataLayer = window.dataLayer || []
					dataLayer.push({
						"ecommerce": {
							"currencyCode": "RUB",    
							"add": {
								"products": [
									{
										"id": "${mod.model_nick}",
										"name" : ${JSON.stringify(getModItemPropValue(mod, item, 'Наименование') || mod.model_title)},
										"price": "${getModItemPropValue(mod, item, 'Цена')}",
										"brand": "${mod.brand_title}",
										"category": "${mod.group_title}",
										"variant" : ${JSON.stringify(getModItemPropValue(mod, item, 'Позиция'))},
										"quantity": 1
									}
								]
							}
						}
					})
				}
			})
		})(document.currentScript.previousElementSibling)
	</script>
`
tpl.showItemsBuy = (data, env, mod, item) => `
	<p align="left">
		${tpl.showButtonBuy(data, env, mod, item)}
	</p>
`
tpl.showModelBuy = (data, env, mod, item) => `
	<p align="right">
		${tpl.showButtonBuy(data, env, mod, item)}
	</p>
`