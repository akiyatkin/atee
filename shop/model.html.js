import cards from "/-shop/cards.html.js"
import cost from "/-words/cost.js"

import Ecommerce from "/-shop/Ecommerce.js"

const tpl = {}
export default tpl
tpl.getSelItem = (data, env) => {
	const model = data.model
	const name = env.crumb.child.name || ''
	// const single = model.recap.brendart[0] == model.recap.brendmodel[0]
	// if (single && !name) return model.items[0]
	return model.items.find(item => item.art?.[0] == name || item.brendart[0] == name) || false
}
tpl.ROOT = (data, env) => data.result ? tpl.showModel(data, env, data.model) : tpl.showError(data, env)

tpl.showError = (data, env) => `
	<div style="margin: 1em 0 0.5em">${tpl.showGroupLink(data, env, data.root)}</div>
	<h1 id="page" style="margin-top:0"><b>${env.crumb.parent.name}</b></h1>
	<p>
		Модель в магазине не найдена
	</p>
`
tpl.showGroupLink = (data, env, group) => `
	<a data-scroll="none" href="${cards.getGroupPath(data, group.group_nick)}">${group.group_title}</a>`
tpl.showBreadcrumbs = (data, env, model) => `
	<div style="margin: 1em 0 0.5em; display: flex; justify-content: space-between;">
		${cards.badgecss(data, env)}
		<div>${model.group_nicks.map(group_nick => tpl.showGroupLink(data, env, data.groups[group_nick])).join(', ')}</div>
		<div>${cards.badgenalichie(data, env, model)}</div>
	</div>
`

tpl.showModel = (data, env, model, selitem = tpl.getSelItem(data, env)) =>`
	${tpl.showBreadcrumbs(data, env, model)}
	<h1 id="page" style="margin-top:0">${cards.getItemName(data, selitem)}</h1>
	${tpl.showMainData(data, env, model, selitem)}
	<div style="margin-bottom:2rem">
		${model.iprops.length ? tpl.showItemsTable(data, env, model) : ''}
		${model.recap.naimenovanie?.length > 1 || model.recap.opisanie?.length > 1 ? model.items.map(item => tpl.showItemDescription(data, env, item, model)).join('') : ''}
		${selitem['skryt-filtry'] ? '' : tpl.showModelProps(data, env, model)}
		
	</div>
	<div class="modtext" style="margin-bottom:2rem">
		<style>
			${env.scope} .modtext img {
				max-width: 100%;
				height: auto;
			}
		</style>
		${(selitem.texts || []).join(' ')}
	</div>
	<div class="modfiles" style="margin-bottom:2rem">
		${data.files.map(tpl.filerow).join('')}
	</div>
`


tpl.showModelProps = (data, env, model) => {
	const mprops = Object.keys(model.recap).filter(prop_nick => {
		if (~model.iprops.indexOf(prop_nick)) return false
		const prop = data.props[prop_nick]
		if (prop.known != 'more') return false
		return true
	}).sort((a, b) => {
		const propa = data.props[a]
		const propb = data.props[b]
		return propa.ordain - propb.ordain
	})
	if (!mprops.length) return ''
	const gain = (name) => cards.getSomeTitle(data, model.recap, name)
	return `
		<h2>Характеристики</h2>
		<p>
			${gain('brendmodel') || gain('brendart')}
		</p>
		<table>
			${mprops.map(prop_nick => tpl.showTrProp(data, env, model.recap, prop_nick)).join('')}
		</table>
	`
}
tpl.showTrProp = (data, env, item, prop_nick) => {
	const prop = data.props[prop_nick]
	if (!prop) return ''
	const val = cards.getSomeTitles(data, item, prop_nick).join(', ')
	if (!val) return ''
	return `
		<tr><th>${prop.name}</th><td>${val}${cards.unit(prop)}</td></tr>
	`
}
tpl.isItemPropNotTable = (data, env, prop_nick) => {
	const prop = data.props[prop_nick]
	if (prop.type != 'text') return false
	if (prop.known != 'more') return false
	return true
}
tpl.isItemPropForTable = (data, env, prop_nick) => {
	const prop = data.props[prop_nick]
	if (prop.type == 'text') return false
	if (prop.known != 'more') return false
	return true
}
tpl.showItemsTable = (data, env, model) => `
	<table style="margin-top:2em; margin-bottom: 2em">
		<thead>
			<tr>
				<td>Арт</td>
				${model.iprops.filter(prop_nick => tpl.isItemPropForTable(data, env, prop_nick)).map(prop_nick => tpl.itemhead(data, env, prop_nick)).join('')}
				${model.recap.cena ? '<td>Цена</td>' : ''}
			</tr>
		</thead>
		<tbody>
			${model.items.map((item, i) => tpl.showItemsTableBodyTr(data, env, model, item, i)).join('')}
		</tbody>
	</table>
`
tpl.showItemsTableBodyTr = (data, env, model, item, i) => {
	const name = env.crumb.name
	//const single = item.brendart[0] == item.brendmodel[0]
	const selected = item.art?.[0] == name || item.brendart[0] == name // || single
	const art_td = tpl.showArtlink(data, env, model, item, i)
	return `
		<tr style="${selected ? 'font-weight:bold;' : ''}">
			<td>${art_td}</td>
			${model.iprops.filter(prop_nick => tpl.isItemPropForTable(data, env, prop_nick)).map(prop_nick => tpl.itemprop(data, env, item, prop_nick)).join('')}
			${model.recap.cena ? '<td>' + cards.cost(item) + '</td>' : ''}
		</tr>
	`
}
tpl.showItemDescription = (data, env, item, model) => {
	const gain = prop_nick => cards.getSomeTitles(data, item, prop_nick).join(', ')
	return `
		<h2>${model.recap.naimenovanie?.length > 1 ? gain('naimenovanie') : gain('art')}</h2>
		${model.recap.naimenovanie?.length > 1 ? '<p>' + cards.line('Арт', gain('art')) + '</p>' : ''}
		<p>${gain('opisanie')}</p>
		${model.iprops.filter(prop_nick => tpl.isItemPropNotTable(data, env, prop_nick)).map(prop_nick => {
			return cards.line(data.props[prop_nick].prop_title, cards.getSomeTitles(data, item, prop_nick))
		}).join('')}
	`
}
tpl.showArtlink = (data, env, model, item, i) => {
	const path = cards.getItemPath(data, item)
	const name = env.crumb.name
	// const single = item.brendart[0] == item.brendmodel[0]
	const art_title = cards.getSomeTitle(data, item, 'art')
	const selected = item.art?.[0] == name || item.brendart[0] == name // || single
	const art_td = selected ? `<b>${art_title}</b>` : `
		<a href="${path}#page">${art_title}</a>
		<script>
			(async btn => {
				const products = [${JSON.stringify(
					Ecommerce.getProduct(data, {
						coupon:env.theme.partner,
						item: item, 
						listname: 'Модель', 
						position: i + 1, //Позиции одной модели на одном месте получается находятся
						group_nick: model.group_nicks[0]
					})
				)}]
				const Ecommerce = await import('/-shop/Ecommerce.js').then(r => r.default)
				btn.addEventListener('click', () => Ecommerce.click(products))
				btn.addEventListener('contextmenu', () => Ecommerce.click(products))
				btn.addEventListener('auxclick', () => Ecommerce.click(products))

			})(document.currentScript.previousElementSibling)
		</script>
	`
	return art_td
}
tpl.itemhead = (data, env, prop_nick) => `<th>${data.props[prop_nick].prop_title}</th>`


tpl.itemprop = (data, env, item, prop_nick) => `
	<td>${cards.getSomeTitles(data, item, prop_nick)}</td>
`

tpl.filerow = f => `
	<div style="display: grid; width:auto; align-items: center; grid-template-columns: max-content 1fr; gap: 0.5rem; margin-bottom:0.5rem">
		<img width="20" load="lazy" src="/file-icon-vectors/dist/icons/vivid/${f.ext || f.anchorext || 'lnk'}.svg"> 
		<div><a target="about:blank" href="${/^http/.test(f.dir) ? '' : '/'}${f.dir + f.file}">${f.anchor || f.name}</a></div>
	</div>
	`

tpl.showGallery = (data, env, item) => `
	<div>
		<style>
			${env.scope} .imagemin,
			${env.scope} .imagemax {
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
		<img class="imagemax" fetchpriority="high" style="${item.images.length > 1 ? 'cursor:pointer' : ''}" alt="" 
			${cards.imager(cards.getSomeTitle(data, item, 'images'), 500, 500)}
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
						//MEMORYTEST
						bigimg.src = imgmin.src
						//bigimg.srcset = '/-imager/webp?h=500&src='+file+' 1x,/-imager/webp?h=1000&src='+file+' 2x,/-imager/webp?h=1500&src='+file+' 3x,/-imager/webp?h=2000&src='+file+' 4x'
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
		<div style="color: rgba(0,0,0,0.3); pointer-events: none; position: absolute; height: 100%; right: 0px; display: flex; align-items: center;" class="right">
			&nbsp;→&nbsp;
		</div>
		<div class="sliderNeo" style="cursor: pointer; overflow-x: scroll; white-space: nowrap; display: flex; gap: 1ch; padding: 1ch 0;">
			${cards.getSomeTitles(data, item, 'images').map((src, i) => tpl.showPreview(data, env, item, src, i)).join('')}
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



tpl.showMainData = (data, env, model, selitem) => `
	<div class="mod_content">
		<style>
			${env.scope} .mod_content {
				display: grid;
				grid-template-columns: 2fr 3fr;
				gap: 2rem;
				padding-bottom: 1rem;
			}
			@media (max-width: 1199px){
				${env.scope} .mod_content {
					grid-template-columns: 1fr 1fr;
				}
			}
			@media (max-width: 705px){
				${env.scope} .mod_content {
					display: grid;
					grid-template-columns: 1fr;
				}
			}
		</style>	
		
		${model.recap.images ? tpl.showGallery(data, env, selitem || model.recap) : ''}
		
		<div>
			<b>${cards.line('Модель', cards.getSomeTitle(data, model.recap, 'model'))}</b>
			${cards.line('Бренд', tpl.filters(data, env, model, model.recap, 'brend'))}
			${cards.line('Скидка', cards.getModelDiscount(model))}

			

			${model.recap.cena?.length > 1 ? cards.block(cards.price(model.recap)) : ''}
			
			${(model.items.length > 1 || !selitem) ? cards.block(tpl.showItemButtons(data, env, model)) : ''}
			
			${selitem ? cards.block(tpl.showTableItem(data, env, model, selitem)) : ''}
			<div style="text-align: right;">
				${selitem ? cards.block(selitem.cena ? tpl.buyButton(data, env, model, selitem) : tpl.orderButton(data, env, model, selitem)) : ''}
			</div>

			${selitem ? '<div style="font-style:italic; margin-top:2em">' + cards.getSomeTitle(data, selitem, 'opisanie') + '</div>' : ''}
			
			
			${selitem ? tpl.ecomDetail(data, env, model, selitem) : ''}
		</div>
	</div>
	
`


tpl.ecomDetail = (data, env, model, selitem) => `
	<script type="module">
		import Ecommerce from "/-shop/Ecommerce.js"
		const products = [${JSON.stringify(Ecommerce.getProduct(data, {
			coupon:env.theme.partner,
			item: selitem, 
			group_nick: model.group_nicks[0],
			listname: 'Модель', 
			position: 1
		}))}]
		Ecommerce.detail(products)
	</script>
`
tpl.showTableItem = (data, env, model, selitem) => `
	<style>
		${env.scope} .tableitem {
			margin:1em 0;
			padding:0;
			display: table;
		}
		${env.scope} .tableitem th,
		${env.scope} .tableitem td {
			padding:1px 5px;
			font-size:13px;
		}
	</style>
	<table class="tableitem">
		${tpl.showTrProp(data, env, selitem, 'art')}
		${model.iprops.map(prop_nick => {
			if (!tpl.isItemPropForTable(data, env, prop_nick)) return ''
			const val = cards.getSomeTitles(data, selitem, prop_nick)
			if (val == null) return ''
			return tpl.showTrProp(data, env, selitem, prop_nick)
		}).join('')}
	</table>
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


tpl.getItemButton = (data, env, model, item, i) => {
	// const single = item.brendart[0] == item.brendmodel[0]
	const name = env.crumb.name
	const selected = item.art?.[0] == name || item.brendart[0] == name // || single

	const title = cards.getVariant(data, model, item)
	
	return selected ? 
	`<span style="display: inline-block; border-radius:var(--radius);
			padding:0.6ch 1ch;
			border:solid rgba(0,0,0,0.7) 3px;">
		${title}
	</span>` : 
	`<a style="text-decoration:none; display:inline-block; border-radius:var(--radius);
		padding:0 1ch;
		border:solid rgba(0,0,0,0.15) 3px;" 
		class="a" data-scroll="none" rel="nofollow" 
		href="${cards.getItemPath(data, item)}">
		${title}
	</a><script>
		(async btn => {
			const products = [${JSON.stringify(
				Ecommerce.getProduct(data, {
					coupon:env.theme.partner,
					item: item, 
					listname: 'Модель', 
					position: i + 1, //Позиции одной модели на одном месте получается находятся
					group_nick: model.group_nicks[0]
				})
			)}]
			const Ecommerce = await import('/-shop/Ecommerce.js').then(r => r.default)
			btn.addEventListener('click', () => Ecommerce.click(products))
			btn.addEventListener('contextmenu', () => Ecommerce.click(products))
			btn.addEventListener('auxclick', () => Ecommerce.click(products))

		})(document.currentScript.previousElementSibling)
	</script>
`
}

tpl.showItemButtons = (data, env, model) => `
	<div style="display: flex; flex-wrap: wrap; gap: 1ch;">
		${model.items.map((item, i) => tpl.getItemButton(data, env, model, item, i)).join('')}
		<script>
			(async div => {
				const reachGoal = goal => {
					if (!div.closest('body')) return
					console.log('Goal.reach ' + goal)
					const metrikaid = window.Ya ? window.Ya._metrika.getCounters()[0].id : false
					if (metrikaid) ym(metrikaid, 'reachGoal', goal)
				}
				for (const a of div.getElementsByTagName('a')) {
					a.addEventListener('click', e => reachGoal('position'))
					a.addEventListener('contextmenu', e => reachGoal('position'))
					a.addEventListener('auxclick', e => reachGoal('position'))
				}
				
				

				const products = ${JSON.stringify(
					model.items.map((item, i) => {
						// const single = item.brendart[0] == item.brendmodel[0]
						const name = env.crumb.name
						//if (item.art?.[0] == name || item.brendart[0] == name || single) return ''
						if (item.art?.[0] == name || item.brendart[0] == name) return ''
						
						return Ecommerce.getProduct(data, {
							coupon:env.theme.partner,
							item: item, 
							listname: 'Модель', 
							position: i + 1,
							group_nick: model.group_nicks[0]
						})
					}).filter(val => val)
				)}
				const Ecommerce = await import('/-shop/Ecommerce.js').then(r => r.default)
				Ecommerce.impressions(products)

			})(document.currentScript.parentElement)
		</script>
	</div>
`



tpl.buyButton = (data, env, model, selitem) => {
	if (!data.conf.cart) return tpl.orderButton(data, env, model, selitem)
	const gain = (name) => cards.getSomeTitle(data, selitem, name)
	return `
		<div style="margin-bottom: 1em">${cards.price(selitem)}</div>
		<button style="font-size:1.2rem; opacity: 0">Добавить в корзину</button>
		<script>
			(async btn => {
				const brendart_nick = "${selitem.brendart[0]}"
				const product = ${JSON.stringify(Ecommerce.getProduct(data, {
					coupon:env.theme.partner,
					item: selitem, 
					group_nick: model.group_nicks[0],
					listname: 'Модель', 
					position: 1,
					quantity: 1
				}))}
				
				const senditmsg = await import('/-dialog/senditmsg.js').then(r => r.default)
				const ans = await senditmsg(btn.parentElement, '/-shop/cart/get-added', {brendart_nick})
			
				btn.style.opacity = 1
				if (ans.quantity) btn.innerHTML = 'Открыть корзину'
				
				btn.addEventListener('click', async () => {
					const Client = await window.getClient()
					const partner = Client.theme.partner

					const Panel = await import("/-shop/cart/Panel.js").then(r => r.default)
					const panel = document.querySelector('.panel')
					if (!panel) return
					Panel.up(panel)
				
					if (!ans.quantity) {
						const Basket = await import('/-shop/cart/Basket.js').then(r => r.default)
						await Basket.addButton(btn, {brendart_nick, quantity: 1, nocopy: 1})

						const Ecommerce = await import("/-shop/Ecommerce.js").then(r => r.default)
						product.quantity = 1
						Ecommerce.add([product])

						const reachGoal = goal => {
							console.log('Goal.reach ' + goal)
							const metrikaid = window.Ya ? window.Ya._metrika.getCounters()[0].id : false
							if (metrikaid) ym(metrikaid, 'reachGoal', goal)
						}
						reachGoal('basket')
					}
				})
			})(document.currentScript.previousElementSibling)
		</script>
	`
}



tpl.filters = (data, env, model, item, prop_nick) => (item[prop_nick] || []).map(nick => `
	<a rel="nofollow" href="${cards.getGroupPath(data, model.group_nicks[0])}${cards.addget(env.bread.get, {m: prop_nick + '::.' + nick + '=1'})}">
		${cards.getValueTitleByNick(data, nick)}
	</a>
`).join(', ')
tpl.orderButton = (data, env, model, item) =>  `
	<div style="margin-bottom:1em">${item.cena ? cards.price(item) : '<big><b>Цена по запросу</b></big>'}</div>
	<button style="font-size:1.2em;">${item.cena ? 'Сделать заказ' : 'Оставить запрос'}</button>
	<script>
		(btn => {
			const product = ${JSON.stringify(Ecommerce.getProduct(data, {
				coupon:env.theme.partner,
				item: item, 
				group_nick: model.group_nicks[0],
				listname: 'Модель', 
				position: 1,
				quantity: 1
			}))}
			btn.addEventListener('click', async () => {
				btn.disabled = true
				const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
				await Dialog.open({
					tpl:'/-shop/order.html.js', 
					depth: ${env.layer.depth},
					sub:'ROOT',
					json: '/-shop/get-model?brendmodel=${item.brendmodel[0]}&partner=${env.theme.partner ?? ''}'
				})
				btn.disabled = false

				const Ecommerce = await import("/-shop/Ecommerce.js").then(r => r.default)
				Ecommerce.add([product])

				const reachGoal = goal => {
					console.log('Goal.reach ' + goal)
					const metrikaid = window.Ya ? window.Ya._metrika.getCounters()[0].id : false
					if (metrikaid) ym(metrikaid, 'reachGoal', goal)
				}
				reachGoal('basket')

			})
		})(document.currentScript.previousElementSibling)
	</script>
`