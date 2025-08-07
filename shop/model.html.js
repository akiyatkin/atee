import cards from "/-shop/cards.html.js"
import nicked from "/-nicked"
import cost from "/-words/cost.js"
import filters from "/-shop/filters.html.js"

import ti from "/-words/ti.js"

const tpl = {}
export default tpl
const getItem = (data, env) => {
	const model = data.model
	const art = env.crumb.child?.name || ''
	return model.items.find(item => item.art == art) || model.items[0]
}
tpl.ROOT = (data, env) => `
	${data.result ? tpl.showmodel(data, env, data.model, getItem(data, env)) : tpl.showerror(data, env)}
`

tpl.showerror = (data, env) => `
	<div style="margin: 1em 0 0.5em">${tpl.groupLink(data, env, data.root)}</div>
	<h1 style="margin-top:0"><b>${env.crumb.name}</b></h1>
	<p>
		Модель в магазине не найдена
	</p>
`
tpl.groupLink = (data, env, group) => `
	<a data-scroll="none" href="${cards.getGroupPath(data, env, group)}">${group.group_title}</a>
`
tpl.showBreadcrumbs = (data, env, model) => `
	<div style="margin: 1em 0 0.5em; display: flex; justify-content: space-between;">
		${cards.badgecss(data, env)}
		<div>${data.groups.map(group => tpl.groupLink(data, env, group)).join(', ')}</div>
		<div>${cards.badgenalichie(data, env, model)}</div>
	</div>
`
tpl.showmodel = (data, env, model, item) =>`
	${tpl.showBreadcrumbs(data, env, model)}
	<h1 style="margin-top:0">${cards.getModelName(data, env, item)}</h1>
	${tpl.maindata(data, env, model, item)}
	<div style="margin-bottom:2rem">
		${item['skryt-filtry'] ? '' : tpl.props(data, env, model, item)}
		${model.iprops.length ? tpl.showitems(data, env, model) : ''}
	</div>
	<div class="modtext" style="margin-bottom:2rem">
		<style>
			${env.scope} .modtext img {
				max-width: 100%;
				height: auto;
			}
		</style>
		${(item.texts || []).join(' ')}
	</div>
	<div class="modfiles" style="margin-bottom:2rem">
		${data.files.map(tpl.filerow).join('')}
	</div>
`


tpl.props = (data, env, model, item) => {
	const mprops = Object.keys(item).filter(prop_nick => {
		if (~model.iprops.indexOf(prop_nick)) return false
		const pr = data.props[prop_nick]
		if (pr.known) return false
		return true
	})
	if (!mprops.length) return ''
	return `
		<h2>Характеристики</h2>
		<table>
			${mprops.map(prop_nick => {
				const pr = data.props[prop_nick]
				const val = cards.gainTitles(data, env, item, prop_nick)
				return tpl.showTrProp(data, env, pr, val)
			}).join('')}
		</table>
	`
}
tpl.showTrProp = (data, env, pr, val) => `
	<tr><th>${pr.prop_title}</th><td>${val}</td></tr>
`
tpl.showitems = (data, env, model) => `
	<table style="margin-top:2em">
		<thead><tr>${model.iprops.filter(prop_nick => prop_nick != 'opisanie').map(prop_nick => tpl.itemhead(data, env, prop_nick)).join('')}</tr></thead>
		<tbody>
			${model.items.map(item => tpl.itembody(data, env, model, item)).join('')}
		</tbody>
	</table>
	${(model.recap.naimenovanie?.length > 1 || model.recap.opisanie?.length > 1) ? model.items.map(item => tpl.showItemDescription(data, env, item, model)).join('') : ''}
`
tpl.showItemDescription = (data, env, item, model) => {
	const gain = prop_nick => cards.gainTitles(data, env, item, prop_nick)
	return `
		<h2>${gain('art')} &mdash; ${model.recap.naimenovanie?.length > 1 ? gain('naimenovanie') : gain('poziciya')}</h2>
		<p>${gain('opisanie')}</p>
	`
}
tpl.itemhead = (data, env, prop_nick) => `<th>${data.props[prop_nick].prop_title}</th>`
tpl.itembody = (data, env, model, item) => `
	<tr>
		${model.iprops.filter(prop_nick => prop_nick != 'opisanie').map(prop_nick => tpl.itemprop(data, env, item, prop_nick)).join('')}
	</tr>
`
tpl.itemprop = (data, env, item, prop_nick) => `
	<td>${cards.gainTitles(data, env, item, prop_nick)}</td>
`

tpl.filerow = f => `
	<div style="display: grid; width:auto; align-items: center; grid-template-columns: max-content 1fr; gap: 0.5rem; margin-bottom:0.5rem">
		<img width="20" load="lazy" src="/file-icon-vectors/dist/icons/vivid/${f.ext || f.anchorext || 'lnk'}.svg"> 
		<div><a target="about:blank" href="${/^http/.test(f.dir) ? '' : '/'}${f.dir + f.file}">${f.anchor || f.name}</a></div>
	</div>
	`

tpl.showGallery = (data, env, item) => `
	<div class="imagecontent">
		<style>
			${env.scope} img {
				max-width: 100%; height:auto
			}
			${env.scope} .imagemin.selected {
				border: solid 2px var(--orange, orange);
				padding: 2px;
			}
			${env.scope} .pointer {
				cursor: pointer;
			}
		</style>
		<img class="imagemax ${item.images.length > 1 ? 'pointer' : ''}" alt="" 
			${cards.imager(item.images[0], 500, 500)}
		>
		${item.images.length > 1 ? tpl.showPreviews(data, env, item) : ''}
		<script>
			(div => {
				const bigimg = div.querySelector('.imagemax')
				const imgmins = div.querySelectorAll('.imagemin')
				for (const imgmin of imgmins) {
					imgmin.addEventListener('click', () => {
						div.querySelector('.selected').classList.remove('selected')
						imgmin.classList.add('selected')
						const file = encodeURIComponent(imgmin.dataset.file)
						bigimg.srcset = '/-imager/webp?h=500&src='+file+' 1x,/-imager/webp?h=1000&src='+file+' 2x,/-imager/webp?h=1500&src='+file+' 3x,/-imager/webp?h=2000&src='+file+' 4x'
					})
				}
				if (imgmins.length) bigimg.addEventListener('click', () => {
					const selected = div.querySelector('.selected')
					const next = selected.nextElementSibling || div.querySelector('.imagemin')
					if (!next) return
					next.dispatchEvent(new Event("click"))
				})
			})(document.currentScript.parentElement)
		</script>
	</div>
`
tpl.showPreview = (data, env, item, src, i) => `
	<img 
		data-file="${src}" class="imagemin ${i === 0 ? 'selected' : ''}"
		alt="" 
		${cards.imager(src, 70, 70)}
	>	
`

tpl.showPreviews = (data, env, item) => `
	<div style="position: relative; transition: opacity 0.3s; opacity: 0">
		<div style="color: rgba(0,0,0,0.3); pointer-events: none; opacity: 0; position: absolute; height: 100%; display: flex; align-items: center;" class="left">
			&nbsp;←&nbsp;
		</div>
		<div style="color: rgba(0,0,0,0.3); pointer-events: none; position: absolute; height: 100%; right: 0px; display: flex; align-items: center; opacity: 1;" class="right">
			&nbsp;→&nbsp;
		</div>
		<div class="sliderNeo" style="cursor: pointer; overflow-x: scroll; white-space: nowrap; display: flex; gap: 1ch; padding: 1ch 0;">
			${item.images.map((src, i) => tpl.showPreview(data, env, item, src, i)).join('')}
		</div>
	</div>
	<script>
		(async div => {
			const sliderNeo = await import('/-imager/sliderNeo.js').then(o => o.default)
			sliderNeo(div)
			div.style.opacity = 1
		})(document.currentScript.previousElementSibling)
	</script>
`
// tpl.showimage = (src, i) => `	
// 	<div data-file="${src}" class="imagemin ${i === 0 ? 'selected' : ''}">
// 		<img width="150" height="150" loading="lazy" alt="" style="max-width: 100%; height:auto" 
// 		src="/-imager/webp?cache&w=150&h=150&src=${encodeURIComponent(src)}">
// 	</div>
// `



tpl.maindata = (data, env, model, item) => `
	<div class="mod_content">
		<style>
			${env.scope} .mod_content {
				display: grid;
				grid-template-columns: 1fr 1fr;
				gap: 2rem;
				padding-bottom: 1rem;
			}
			@media (max-width: 900px){
				${env.scope} .mod_content {
					
				}
			}
			@media (max-width: 705px){
				${env.scope} .mod_content {
					display: grid;
					grid-template-columns: 1fr;
				}
			}
		</style>	
		${item.images ? tpl.showGallery(data, env, item) : ''}
		<div>
			${cards.line('Модель', cards.gainFirstTitle(data, env, item, 'model'))}
			${cards.line('Бренд', tpl.filters(data, env, model, item, 'brend'))}
			${cards.line('Скидка', cards.getItemDiscount(item))}
			<div style="text-align:right; display: grid; gap: 1em; margin: 1em 0 2em;">
				<div>${cards.basket(data, env, item)}</div>
				<div>${tpl.itemChoice(data, env, model, item)}</div>
			</div>
			<i>${cards.gainFirstTitle(data, env, item, 'opisanie')}</i>
		</div>
	</div>
	<script type="module">
		window.dataLayer = window.dataLayer || []
		dataLayer.push({
			"ecommerce": {
				"currencyCode": "RUB",
				"detail": {products:[${JSON.stringify(cards.product(data, env, item))}]}
			}
		})
	</script>
`
tpl.itemChoice = (data, env, model, item) => `
	${(data.conf.cart ? tpl.orderButtonCart : tpl.orderButton)(data, env, model, item)}
`
tpl.orderButtonCart = (data, env, model, item) => {


	if (model.items.length == 1) {
		return item.cena ? '<p>' + tpl.buyButton(data, env, item) + '<p>' : tpl.orderButton(data, env, model, item)
	}
	return ''
	//if (!model.Цена) return tpl.orderButton(data, env, model)	//Добавить в корзину точно ничего нельзя
	
	
	const prop_nicks = ["posiciya","art"]
	let html = filters.block("", tpl.showIprops(data, env, model, prop_nicks)) 
	return html
	html += `
	<style>
		${env.scope} .tableitem th,
		${env.scope} .tableitem td {
			font-size:13px;
			padding:2px 1ch;
		}
	</style>
	<table class="tableitem">
		${model.item_props.map(pr => {
			if (pr.prop_title == 'Скидка') return ''
			if (pr.prop_title == 'Цена') return ''
			const val = common.prtitle(item, pr)
			if (val == null) return ''
			return tpl.showTrProp(data, env, pr, val)
		}).join('')}
	</table>`

	html += showItemIfCost(model, item)
	
	

	if (!item.Цена && !model.Цена) return html + tpl.orderButton(data, env, model, item)
	return html + '<p>' + tpl.buyButton(data, env, item) + '<p>'
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
tpl.showIprops = (data, env, mod, prop_nicks) => {
	const values = mod.items.reduce((ak, item) => {
		const prop_nick = prop_nicks.find(prop_nick => item[prop_nick])
		ak.push(prop_nick ? cards.gainTitles(data, env, item, prop_nick) : '')
		return ak
	}, [])
	return `
		<div style="margin-right:0.3ch; font-size:90%">
			${values.map((v, index) => getitem(data, env, v, index)).join('<span style="display: inline-block; width:1ch"></span>')}
			<script>
				(div => {
					const reachGoal = goal => {
						if (!div.closest('body')) return
						console.log('Goal.reach ' + goal)
						const metrikaid = window.Ya ? window.Ya._metrika.getCounters()[0].id : false
						if (metrikaid) ym(metrikaid, 'reachGoal', goal)
					}
					for (const a of div.getElementsByTagName('a')) {
						a.addEventListener('click', e => reachGoal('position'))
						a.addEventListener('contextmenu', e => reachGoal('position'))
					}
				})(document.currentScript.parentElement)
			</script>
		</div>
	`
}

tpl.buyButton = (data, env, item) => {
	const gain = (name) => cards.gainFirstTitle(data, env, item, name)
	const product = cards.product(data, env, item)
	return `
		<button 
			data-brendart="${item.brendart[0]}"
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
				const product = ${JSON.stringify(product)}
				btn.addEventListener('click', async () => {
					
					const Panel = await import("/-cart/Panel.js").then(r => r.default)
					const panel = document.querySelector('.panel')
					if (!panel) return
					Panel.up(panel)
				
					if (!ans.count) {
						const Basket = await import('/-cart/Basket.js').then(r => r.default)
						Basket.addButton(btn.dataset, 1, 'nocopy')
						window.dataLayer = window.dataLayer || []
						
						dataLayer.push({
							"ecommerce": {
								"currencyCode": "RUB",    
								"add": {
									"products": [{
										...product,
										"quantity": 1
									}]
								}
							}
						})
					}
				})
			})(document.currentScript.previousElementSibling)
		</script>
	`
}


tpl.detail = (data, env, model, item) => {

	
	
	
	return `
		
	`
}
tpl.filters = (data, env, model, item, prop_nick) => item[prop_nick].map(nick => `
	<a rel="nofollow" href="${cards.getGroupPath(data, env, data.groups[0])}/${cards.addget(data, env, {m: prop_nick + '::.' + nick + '=1'})}">
		${data.values[nick].value_title || nick}
	</a>
`).join(', ')
tpl.orderButton = (data, env, model, item) => `
	<button style="font-size:1.2em;">${item.cena ? 'Сделать заказ' : 'Оставить запрос'}</button>
	<script>
		(btn => {
			btn.addEventListener('click', async () => {
				btn.disabled = true
				const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
				await Dialog.open({
					tpl:'/-shop/order.html.js', 
					sub:'ROOT',
					json: '/-shop/get-model?brendmodel=${item.brendmodel[0]}&partner=${env.theme.partner ?? ''}'
				})
				btn.disabled = false
			})
		})(document.currentScript.previousElementSibling)
	</script>
`












	// tpl.showprop = (prop_title, val) => `
	// 	<div style="margin: 0.25rem 0; display: flex">
	// 		<div style="padding-right: 0.5rem">${prop_title}:</div>
	// 		<div>${val}</div>
	// 	</div>
	// `
	

	// tpl.prop = {
	// 	default: (data, env, mod, pr, title, val) => tpl.showprop(title, val),
	// 	bold: (data, env, mod, pr, title, val) => cards.prop.default(data, mod, pr, title, `<b>${val}</b>`),
	// 	brand: (data, env, mod, pr, title, val) => cards.prop.default(data, mod, pr, title, 
	// 		`<a href="/catalog/${mod.brand_nick}">${mod.brand_title}</a>`
	// 	),
	// 	group: (data, env, mod, pr, title, val) => cards.prop.p(data, mod, pr, title, 
	// 		`<a style="max-width:100%" href="/catalog/${mod.group_nick}"><span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block">${mod.group_title}</span></a>`
	// 	),
	// 	cost: (data, env, mod, pr, title, val) => cards.prop.bold(data, mod, pr, title, `${cost(val)}${common.unit()}`),
	// 	hideable: (data, mod, pr, title, val) => cards.prop.default(data, mod, pr, title, val.length < 30 ? val : `
	// 		<span class="a" onclick="this.style.display = 'none'; this.nextElementSibling.style.display = ''">Показать</span>
	// 		<span onclick="this.style.display = 'none'; this.previousElementSibling.style.display = ''" style="display: none">${val}</span>
	// 	`),
	// 	link: (data, env, mod, pr, title, val) => cards.prop.default(data, mod, pr, title, 
	// 		`<a href="/catalog/${links.addm(data)}more.${pr.prop_nick}::.${nicked(val)}=1">${val}</a>`
	// 	),
	// 	just: (data, env, mod, pr, title, val) => `
	// 		<div style="margin: 0.25rem 0; display: flex">
	// 			<div title="${common.prtitle(mod, pr)}" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
	// 				${val}
	// 			</div>
	// 		</div>
	// 	`,
	// 	justlink: (data, env, mod, pr, title, val) => cards.prop.just(data, mod, pr, title, 
	// 		`<a href="/catalog/${links.addm(data)}more.${pr.prop_nick}::.${nicked(val)}=1">${val}</a>`
	// 	),
	// 	amodel: (data, env, mod, pr, title, val) => cards.prop.just(data, mod, pr, title, 
	// 		`<a href="/catalog/${mod.brand_nick}/${mod.model_nick}${links.setm(data)}">${mod.brand_title} ${mod.model_title}</a>`
	// 	),
	// 	p: (data, env, mod, pr, title, val) => `<div style="margin: 0.25rem 0;">${val}</div>`,
	// 	empty: () => '',
	// 	filter: (data, env, mod, pr, title, val) => cards.prop.default(data, env, mod, pr, title, 
	// 		val.split(',').filter(r => r).map(value => `<a rel="nofollow" href="${links.val(data, env, mod, pr, value)}">${value}</a>`).join(', ')
	// 	)

	// }