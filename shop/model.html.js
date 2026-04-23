import cards from "/-shop/cards.html.js"
import cost from "/-words/cost.js"
import addget from "/-words/addget.js"
import Ecommerce from "/-shop/Ecommerce.js"
import Selector from "/-shop/Selector.js"



const tpl = {}
export default tpl
tpl.css = ['/-sources/revscroll.css']

tpl.ROOT = (data, env) => data.result ? tpl.showModel(data, env) : tpl.showError(data, env)

tpl.showError = (data, env) => `
	<div style="margin: 1em 0 0.5em">${data.group ? tpl.showGroupLink(data, env, data.root) : ''}</div>
	<h1 id="page" style="margin-top:0"><b>${env.crumb.name}</b></h1>
	<p>
		Модель в магазине не найдена.
	</p>
	<p>
		${data.msg || ''}
	</p>
`
tpl.showGroupLink = (data, env, group) => `
	<a data-scroll="none" href="${cards.getGroupPath(data, group.group_nick)}">${group.group_title}</a>`
tpl.showBreadcrumbs = (data, env, model, selitem) => `
	<div style="margin: 1em 0 0.5em; display: flex; justify-content: space-between;">
		${cards.badgecss(data, env)}
		<div>${model.group_nicks.map(group_nick => tpl.showGroupLink(data, env, data.groups[group_nick])).join(', ')}</div>
		<div>${cards.badge.itemNalichieOrDiscount(data, env, model, selitem)}</div>
	</div>
`


	// ${
	// 	model.recap.naimenovanie?.length > 1 || model.recap.opisanie?.length > 1 
	// 	? 
	// 	model.items.map(item => tpl.showItemDescription(data, env, item, model)).join('') 
	// 	: 
	// 	''
	// }
// tpl.getSelItem = (data, env) => { //brendmodel/art (brendmodel/brendart - depricated)
// 	const model = data.model
// 	const name = env.crumb.child?.name || ''
// 	// const single = model.recap.brendart[0] == model.recap.brendmodel[0]
// 	// if (single && !name) return model.items[0]
// 	return model.items.find(item => item.art?.[0] == name || item.brendart[0] == name) || false
// }

tpl.showModel = (data, env) => {

	const ps = new Selector(data.model, data.props, data.values)
	
	const query_nick = env.crumb.child?.name || '' //арт может быть не выбран, тогда фильр показывается без выбраных кнопок
	
	const selritm = ps.getItemByArt(query_nick, true)
	const selitem = selritm.item
	return `
		${tpl.showBreadcrumbs(data, env, ps.model, selitem)}
		<h1 id="page" style="margin-top:0">${cards.getItemName(data, selitem)}</h1>

		${tpl.showMainData(data, env, ps, selritm)}
		<div style="margin-bottom:2rem">
			${selitem['skryt-filtry'] ? '' : tpl.showModelProps(ps, data, env)}
		</div>
		

		<div class="modtext" style="margin-bottom:2rem">
			<style>
				${env.scope} .modtext img {
					max-width: 100%;
					height: auto;
				}
			</style>
			${selitem.tekst || ''}
			${(selitem.texts || []).join(' ')}
		</div>
		<div class="modfiles" style="margin-bottom:2rem">
			${data.files.map(tpl.filerow).join('')}
		</div>
	`
}
//${ps.prop_nicks.length ? tpl.showItemsTable(ps, data, env, model) : ''}


tpl.showModelProps = (ps, data, env) => {
	const mprops = Object.keys(ps.model.recap).filter(prop_nick => {
		if (~ps.model.iprops.indexOf(prop_nick)) return false
		//if (~ps.prop_nicks_selector_primary_dynamic.indexOf(prop_nick)) return false
		if (~ps.prop_nicks_dynamic.indexOf(prop_nick)) return false
		const prop = ps.props[prop_nick]
		//if (!~['more','secondary'].indexOf(prop.known)) return false
		if (~['column','system'].indexOf(prop.known)) return false
		return true
	}).sort((a, b) => {
		const propa = ps.props[a]
		const propb = ps.props[b]
		return propa.ordain - propb.ordain
	})
	if (!mprops.length) return ''
	const gain = (name) => cards.getSomeTitle(data, ps.model.recap, name)
	return `
		<h2>Характеристики</h2>
		<p>
			${gain('brendmodel') || gain('brendart')}
		</p>
		<table>
			${mprops.map(prop_nick => tpl.showTrProp(ps, data, env, ps.model.recap, prop_nick)).join('')}
		</table>
	`
}
tpl.showTrProp = (ps, data, env, item, prop_nick) => {
	const prop = ps.props[prop_nick]
	if (!prop) return ''
	const val = cards.getSomeTitles(ps, item, prop_nick).join(', ')
	if (!val) return ''
	return `
		<tr><th>${prop.name}</th><td>${val}${cards.unit(prop)}</td></tr>
	`
}

tpl.isItemPropForTable = (ps, prop_nick) => {
	const prop = ps.props[prop_nick]
	//if (prop.type == 'text') return false
	//if (!~['more','secondary'].indexOf(prop.known)) return false
	if (~['column','system'].indexOf(prop.known)) return false
	return true
}

tpl.itemhead = (ps, prop_nick) => `<th>${ps.props[prop_nick].prop_title}</th>`


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
	<div style="position: relative;">
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
			//div.style.opacity = 1 transition: opacity 0.3s; opacity: 0
		})(document.currentScript.previousElementSibling)
	</script>
`
// tpl.showimage = (src, i) => `	
// 	<div data-file="${src}" class="imagemin ${i === 0 ? 'selected' : ''}">
// 		<img width="150" height="150" loading="lazy" alt="" style="max-width: 100%; height:auto" 
// 		src="/-imager/webp?cache&w=150&h=150&src=${encodeURIComponent(src)}">
// 	</div>
// `


//${selitem.modifikaciya ? tpl.showModification(data, env, selitem) : ''}
tpl.showMainData = (data, env, ps, selritm) => {
	const selitem = selritm.item
	return `
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
			
			${ps.model.recap.images ? tpl.showGallery(data, env, selitem?.images ? selitem : ps.model.recap) : ''}
			
			<div>
				<b>${cards.line('Модель', cards.getSomeTitle(data, ps.model.recap, 'model'))}</b>
				${cards.line('Бренд', tpl.filters(data, env, ps.model, ps.model.recap, 'brend'))}
							
				${ps.model.recap.cena?.length > 1 ? cards.block(cards.price(ps.model.recap)) : ''}

				${selitem.art ? tpl.showSelector(data, env, ps, data.conf.root_path, selitem) : ''}
				
				

				${selitem ? cards.block(tpl.showTableItem(ps, data, env, ps.model, selitem)) : ''}
				
				${selitem ? cards.badge.nalichie(data, env, selitem, ps.model.group_nicks[0]) : ''}

				<div>
					${selitem ? cards.block(selitem.cena ? tpl.buyButton(data, env, ps.model, selitem) : tpl.orderButton(data, env, ps.model, selitem)) : ''}
				</div>
				
				
				${selitem ? '<div style="font-style:italic; margin-top:2em">' + cards.getSomeTitle(data, selitem, 'opisanie') + '</div>' : ''}
				
				
				${selitem ? tpl.ecomDetail(data, env, ps.model, selitem) : ''}
			</div>
		</div>
		
	`
}


tpl.ecomDetail = (data, env, model, selitem) => `
	<script type="module">
		import Ecommerce from "/-shop/Ecommerce.js"
		const products = [${JSON.stringify(Ecommerce.getProduct(data, {
			coupon:env.theme.partner,
			recap: model.recap, 
			group_nick: model.group_nicks[0],
			listname: 'Модель'
		}))}]
		Ecommerce.detail(products)
	</script>
`
//${tpl.showTrProp(ps, data, env, selitem, 'art')}
tpl.showTableItem = (ps, data, env, model, selitem) => `
	<style>
		${env.scope} .tableitem {
			margin:1em 0;
			padding:0;
			display: table;
		}
		${env.scope} .tableitem th {
			white-space: nowrap;
		}
		${env.scope} .tableitem th,
		${env.scope} .tableitem td {
			padding:1px 5px;
			font-size:13px;
			
		}
	</style>
	<table class="tableitem">
		${ps.prop_nicks.map(prop_nick => {
			if (!tpl.isItemPropForTable(ps, prop_nick)) return ''

			const val = cards.getSomeTitles(ps, selitem, prop_nick)
			if (val == null) return ''
			return tpl.showTrProp(ps, data, env, selitem, prop_nick)
		}).join('')}
	</table>
`
const showCost = (value) => value ? `${cost(value)}${common.unit()}` : ''



tpl.showSelector = (data, env, ps, root_path, selitem) => {	
	if (!ps.prop_nicks_selector_primary.length) return ''
	
	const htmls = [`
		<div style="
			margin: 1em 0;
		    border-radius: 1em;
		">
	`]
	
	for (const prop_nick of ps.prop_nicks_selector_primary) {
		const prop = ps.props[prop_nick]
		const html = tpl.template[prop.template || 'titles'](data, env, ps, root_path, env.bread.get, selitem, prop)
		htmls.push(html)
	}
	
	htmls.push(`
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
				
				

				const product = ${JSON.stringify(
					Ecommerce.getProduct(data, {
						coupon:env.theme.partner,
						recap: ps.model.recap, 
						group_nick: ps.model.group_nicks[0],
						listname: 'Модель'
					})
				)}
				const Ecommerce = await import('/-shop/Ecommerce.js').then(r => r.default)
				Ecommerce.impressions([product])

			})(document.currentScript.parentElement)
		</script>
	`)
	htmls.push('</div>')
	return htmls.join('')
}

const escapeHTML = str => typeof(str) != 'string' ? str : str.replace(/[&<>'"]/g, tag => ({
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	"'": '&#39;',
	'"': '&quot;'
}[tag]));
tpl.showModification = (data, env, item) => `
	<div style="margin:0.5em 0">

		<div><b>${cards.getSomeTitle(data, item, 'modifikaciya')}</b></div>
		<button style="margin-top: 0.25em;" class="a">${escapeHTML(env.bread.get.modification) || 'Выбрать...'}</button>
		<script>
			(btn => {
				btn.addEventListener('click', async () => {
					const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
					const popup = await Dialog.open({
						tpl:"/-shop/cart/modification.html.js",
						sub:"ROOT",
						json:"/-shop/cart/get-modification?art_nick=${item.art?.[0] || ''}&brendart_nick=${item.brendart[0]}"
					})
					const form = popup.getElementsByTagName('form')[0]

					form.addEventListener('submit', async e => {
						e.preventDefault()
						const addget = await import('/-words/addget.js').then(r => r.default)
						const Client = await window.getClient()
						const modification = form.elements.modification.value
						Client.go(addget(Client.bread.get, {modification}), false)
						Dialog.hide()
					})
				})
			})(document.currentScript.previousElementSibling)
		</script>
	</div>
`

// function arraysEqual(a, b) {
// 	if (a === b) return true;
// 	if (!a && b) return false
// 	if (a && !b) return false
// 	if (a.length !== b.length) return false;

// 	for (let i = 0; i < a.length; i++) {
// 	if (a[i] != b[i]) return false;
// 	}
// 	return true;
// }


// const getThisItem = (ps, selitem, items, prop_nicks) => {
// 	//Все items подходят с текущим next значением, но выбрано selitem
// 	//Надо выбрать такой, item, который больше всего похож на selitem


// 	for (const item of items) {
// 		item.coincidence = 0
// 		for (const othe_prop_nick of prop_nicks) {
// 			if (arraysEqual(selitem[othe_prop_nick], item[othe_prop_nick])) item.coincidence++
// 		}
// 	}
// 	let fitem = items[0]
// 	for (const item of items) {
// 		if (fitem.coincidence < item.coincidence) fitem = item
// 	}
// 	return fitem


// 	// const item = items.find(item => {
// 	// 	if (list.some(othe_prop_nick => {
// 	// 		if (!selitem[othe_prop_nick] && !item[othe_prop_nick]) return false
// 	// 		if (selitem[othe_prop_nick] && item[othe_prop_nick] && selitem[othe_prop_nick].join(',') == item[othe_prop_nick].join(',')) return false
// 	// 		return true //это выход
// 	// 	})) return false //Нашли другое свойство которое есть в selitem и не равно item
// 	// 	return true
// 	// }) || items[0]
// 	// return item
// }
tpl.template = {}
tpl.template.titles = (data, env, ps, root_path, get, selitem, prop) => {
	const value_nicks = ps.model.recap[prop.prop_nick]
	return `
	 	<div style="margin: 0.5em 0;">
	 		<div><b>${prop.prop_title}</b></div>
	 		${value_nicks.map(value_nick => tpl.getPropButton(ps, root_path, get, selitem, prop, value_nick)).join(' ')}
	 	</div>
	`
}
tpl.template.input = (data, env, ps, root_path, get, selitem, prop) => {
	return `
	 	<div style="margin: 0.5em 0;">
	 		<div><b>${prop.prop_title}</b></div>
	 		<input style="padding: 0.5ch 0.5ch; line-height: 1.5; margin-top:0.25em; font-family: monospace; font-size:1.2em" 
	 		type="number" step="${prop.step || 1}" min="${prop.min || 0}" max="${prop.max || 100}"
	 		value="${selitem[prop.prop_nick]?.[0] || prop.min || 0}">
	 		<script>
	 			(div => {
	 				const input = div.getElementsByTagName('input')[0]
	 				input.addEventListener('change', async () => {
	 					const Client = await window.getClient()
	 					const addget = await import('/-words/addget.js').then(r => r.default)
	 					const Selector = await import('/-shop/Selector.js').then(r => r.default)
	 					const importJSON = src => import(src, {with:{type:'json'}}).then(e => e.default)

	 					const data = await importJSON("${env.layer.json}")
	 					const ps = new Selector(data.model, data.props, data.values)

	 					const query_nick = "${env.crumb.child?.name || ''}"
	 					const {item: selitem, titem: seltitem} = ps.getItemByArt(query_nick, true)
	 					const ritm = ps.getNearestItem(selitem, "${prop.prop_nick}", input.value)
	 					if (!ritm) return false
	 					const path = ['${root_path}', 'item', ritm.item.brendmodel[0]]
						if (selitem.art) path.push(item.art[0])
	 					Client.go( path.join('/') + addget(Client.bread.get, {}, ['modification']), false)
	 				})
	 			})(document.currentScript.parentElement)
	 		</script>
	 	</div>
	`
}
tpl.getPropButton = (ps, root_path, get, selitem, prop, value_nick) => {
	const ritm = ps.getNearestItem(selitem, prop.prop_nick, value_nick)
	
	const title = ps.values[value_nick]?.value_title || value_nick
	const selected = selitem[prop.prop_nick][0] == value_nick
	const lost = ritm === false
	const css = `display: inline-block; margin-top:0.25em; border-radius:var(--radius);padding:0 0.5ch; margin-right:2px; line-height: 1.5; text-decoration: none;`
	if (selected) return `<span style="${css}border:solid rgba(0,0,0,0.7) 3px;">${title}</span>`
	if (lost) return `<span style="${css} border:solid rgba(0,0,0,0.2) 3px; opacity:0.1">${title}</span>`

	return `<a style="${ps.interaction == 2 ? 'opacity:0.6;' : ''}${ps.interaction == 3 ? 'opacity:0.4;' : ''}${ps.interaction == 4 ? 'opacity:0.2;' : ''}${ps.interaction == 5 ? 'opacity:0.1;' : ''}${css} border:solid rgba(0,0,0,0.15) 3px;" 
		class="a" data-scroll="none" rel="nofollow"
		href="${cards.getItemPath({props: ps.props, conf: {root_path}}, ritm.item)}${addget(get, {}, ['modification'])}">
		${title}
	</a>`
}
tpl.OPENTITLE = `Открыть корзину`

tpl.ADDTITLE = `Добавить в корзину`
tpl.buyButton = (data, env, model, selitem) => {
	if (!data.conf.cart) return tpl.orderButton(data, env, model, selitem)
	const gain = (name) => cards.getSomeTitle(data, selitem, name)
	return `
		<div style="margin-bottom: 1em">${cards.price(selitem)}</div>
		<button style="font-size:1.2rem; opacity: 0">${tpl.ADDTITLE}</button>
		<script>
			(async btn => {
				const brendart_nick = "${selitem.brendart[0]}"
				const art_nick = "${selitem.art?.[0] || ''}"
				const product = ${JSON.stringify(Ecommerce.getProduct(data, {
					coupon:env.theme.partner,
					recap: model.recap, 
					group_nick: model.group_nicks[0],
					listname: 'Модель',
					quantity: 1
				}))}
				
				const senditmsg = await import('/-dialog/senditmsg.js').then(r => r.default)
				const ans = await senditmsg(btn.parentElement, '/-shop/cart/get-added', {art_nick, brendart_nick})
			
				btn.style.opacity = 1
				if (ans.quantity) btn.innerHTML = '${tpl.OPENTITLE}'
				
				btn.addEventListener('click', async () => {
					const Client = await window.getClient()
					const partner = Client.theme.partner

					const Panel = await import("/-shop/cart/Panel.js").then(r => r.default)
					const panel = document.querySelector('#PANEL .panel')
					if (!panel) return
					Panel.up(panel)
				
					if (!ans.quantity) {
						const Basket = await import('/-shop/cart/Basket.js').then(r => r.default)
						await Basket.addButton(btn, {brendart_nick, art_nick, quantity: 1, nocopy: 1, modification: Client.bread.get.modification || ''})

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
				recap: model.recap, 
				group_nick: model.group_nicks[0],
				listname: 'Модель',
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