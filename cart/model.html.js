import tpl from "/@atee/catalog/model.html.js"
import cost from "/-words/cost.js"
import common from "/-catalog/common.html.js"
import links from "/-catalog/links.html.js"
import filters from "/-catalog/filters.html.js"
export default tpl
const origButton = tpl.orderButton
tpl.orderButton = (data, env, mod) => `<div id="ITEM"></div>`
const ischoice = (env, index) => {
	const item_index = env.crumb.child?.name || 0
	if (item_index == index) return true
	else return false
}

const getv = (mod, prop_title) => mod[prop_title] ?? mod.more[prop_title] ?? ''
const prefixif = (prefix, val, postfix = '') => val ? prefix + val + postfix : ''

tpl.ITEM = (data, env) => {
	const mod = data.mod
	if (!mod) return ''
	if (mod.items.length == 1) {
		if (mod.Цена) return showModelBuy(data, env, mod)
		return origButton(data, env, mod)	
	}
	//if (!mod.Цена) return origButton(data, env, mod)	//Добавить в корзину точно ничего нельзя
	let item_index = env.crumb.child?.name || 0
	if (!mod.items[item_index]) item_index = 0
	const item = mod.items[item_index]
	
	const prop_titles = ["Позиция","Арт"]
	const html = filters.block("", showIprops(data, env, mod, prop_titles)) + showCost(item)
	if (!item.Цена) return html + origButton(data, env, mod, item)
	return html + showItemsBuy(data, env, mod, item)
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
const showCost = (item) => item.Цена ? `
	<p>
		<big><b>${cost(item.Цена)}${common.unit()}</b></big>
	</p>
`: `
	<p>
		<big><b>Цена по запросу</b></big>
	</p>
`

const showItemsBuy = (data, env, mod, item) => `
	<p align="left">
		<button 
		data-brand_nick="${mod.brand_nick}"
		data-model_nick="${mod.model_nick}"
		data-item_num="${item.item_num}"
		data-partner="${env.theme.partner || ''}"
		style="font-size:1.2rem;">
			Добавить в корзину
		</button>
		<script>
			(btn => {
				btn.addEventListener('click', async () => {
					const add = await import('/-cart/add.js').then(r => r.default)
					add(btn.dataset)	
				})
			})(document.currentScript.previousElementSibling)
		</script>
	</p>
`
const showModelBuy = (data, env, mod) => `
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
					const add = await import('/-cart/add.js').then(r => r.default)
					add(btn.dataset)	
				})
			})(document.currentScript.previousElementSibling)
		</script>
	</p>
`
