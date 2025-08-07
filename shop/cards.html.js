import nicked from "/-nicked"
import cost from "/-words/cost.js"
import addget from '/-sources/addget.js'

const cards = {}
export default cards

const getv = (moditem, prop_title) => moditem[prop_title] ?? moditem.more[prop_title] ?? ''
const getItemModPropValue = (item, mod, prop_title) => getv(mod, prop_title) || getv(item, prop_title) || ''

cards.LIST = (data, env) => `
	<style>
		/*${env.scope} .listcards { 
			grid-template-columns: repeat(auto-fill, minmax(32ch, 1fr))
			grid-template-columns: repeat(auto-fill, minmax(28px, 1fr))
		}*/
		${env.scope} .listcards { 
			grid-gap: 2em;
			grid-template-columns: 1fr 1fr 1fr 1fr
		}
		@media (max-width:1400px) {
			${env.scope} .listcards { grid-template-columns: 1fr 1fr 1fr }
		}
		@media (max-width:900px) {
			${env.scope} .listcards { 
				grid-gap: 1em;
				grid-template-columns: 1fr 1fr 
			}
		}
		@media (max-width:350px) {
			${env.scope} .listcards { grid-template-columns: 1fr }
		}
	</style>
	${cards.badgecss(data, env)}
	<div class="listcards" style="display: grid;">	
		${data.list.map(mod => cards.card(data, env, mod)).join('')}
	</div>
	${(data.pagination?.page == 1 && data.pagination?.last > 1) ? cards.scriptRemoveSuperfluous(data) : ''}
`
cards.scriptRemoveSuperfluous = (data) => `
	<script>
		(async listcards => {
			listcards.style.opacity = '0'
			const numberOfCards = await import('/-catalog/numberOfCards.js').then(r => r.default)
			//Надо чтобы всегда было 2 ряда, не больше
			const count = numberOfCards(${data.limit})
			while (listcards.children.length > count) listcards.children[count].remove()
			listcards.style.opacity = '1'
		})(document.currentScript.previousElementSibling)
	</script>
`

cards.badgecss = (data, env) => `
	<style>
		${env.scope} .badge {
			border-radius: 8px;
			border: solid 1px currentColor;
			background-color: rgba(255,255,255,.9);
			padding: 2px 8px;
			font-size: 0.9rem;
		}
		${env.scope} .badge:hover {
			background-color: white;
		}
		${env.scope} .badge_novinka {
			color: green;
		}
		${env.scope} .badge_discount {
			color: var(--color-partner, green);
		}
		${env.scope} .badge_lider-prodaj {
			background-color: black!important;
			border-color: white!important;
			color: white!important;
		}
	</style>
`
cards.product = (data, env, item) => {
	const gain = (name) => cards.gainFirstTitle(data, env, item, name)
	const product = {
		"id": item.model[0],
		"name" : gain('naimenovanie') || gain('model'),
		"price": gain('cena'),
		"brand": gain('brend'),
		"variant" : gain('poziciya') || gain('art'),
		"category": (data.group || data.groups[0]).group_title
	}
	return product
}
cards.card = (data, env, mod) => {
	return `
		<div style="
			min-width: 0; /*fix overflow-text ellipsis*/
			border-radius: var(--radius); 
			position:relative; 
			display:flex; flex-direction: column; justify-content: space-between; box-shadow: 0 .5rem 1rem rgba(0,0,0,.15)" 
			class="shadow">
	 		${cards.data(data, env, mod)}
	 		<script>
				(card => {
					const product = ${JSON.stringify(cards.product(data, env, mod.recap))}
					card.addEventListener('click', () => {	
						window.dataLayer = window.dataLayer || []
						dataLayer.push({
							"ecommerce": {
						        "currencyCode": "RUB",
						        "click": {
						            "products": [
										{
											...product,
											"list": "Каталог"
										}
									]
								}
							}
						})
					})
				})(document.currentScript.parentNode)
			</script>
	 	</div>
	`
}
cards.data = (data, env, mod) => `
	<div style="margin: 1rem 1rem 0.5rem 1rem;; flex-grow:1; display:flex; flex-direction: column; justify-content: space-between">
		${cards.nalichie(data, env, mod)}
		<a href="${cards.getItemPath(data, env, mod.items[0])}"
			style="
				padding: 0; color: inherit; border: none; 
				white-space: normal; display: block; flex-grow:1
		">
			${cards.image(data, env, mod.recap)}
		</a>
		<div>
			${cards.props(data, env, mod)}
		</div>
		
	</div>
	<div style="text-align:right; margin: 0rem 0.9rem 1rem 0.9rem">${cards.basket(data, env, mod.recap)}</div>
`

cards.unit = (prop) => {
	if (!prop) return '&nbsp;руб.'
	if (prop.unit) return '&nbsp;' + prop.unit 
	if (prop.prop_nick == 'cena') return cards.unit()
	return ''
}
//cards.getGroupPath = (data, env, group) => data.conf.root_path + (group.group_nick == data.conf.root_nick ? '' : '/group/' + group.group_nick)
//cards.getParentPath = (data, env, group) => data.conf.root_path + (group.parent_nick == data.conf.root_nick ? '' : '/group/' + group.parent_nick)
cards.getGroupPath = (data, env, group) => [data.conf.root_path, 'group', group.group_nick].join('/')
cards.getParentPath = (data, env, group) => data.conf.root_path + (group.group_nick == data.conf.root_nick ? '' : '/group/' + group.parent_nick)
cards.getItemPath = (data, env, item) => [data.conf.root_path, 'item', item.brendmodel[0], item.art[0]].join('/')
cards.gainFirstTitle = (data, env, item, prop_nick) => {
	if (!item[prop_nick]) return ''
	const prop = data.props[prop_nick]
	const first = item[prop_nick][0]
	if (prop.type == 'value') {
		return data.values[first].value_title
	} else if (prop.type == 'date') {
		return ddd.ai(first)
	} else { //text, number
		return first
	}
}
cards.gainTitles = (data, env, item, prop_nick) => {
	if (!item[prop_nick]) return ''
	const prop = data.props[prop_nick]
	return item[prop_nick].map(nick => {
		if (prop.type == 'value') {
			return data.values[nick].value_title
		} else if (prop.type == 'date') {
			return ddd.ai(nick)
		} else { //text, number
			return nick
		}
	}).join(', ')
	
}
cards.props = (data, env, mod) => `
	<div>
		${data.group.cards.map(prop_nick => {
			const pr = data.props[prop_nick]
			const fn = cards.prop[pr.card_tpl] || cards.prop['default']
			const val = mod.recap[prop_nick]
			if (!val) return ''
			return fn(data, env, mod, pr, pr.name, cards.gainTitles(data, env, mod.recap, prop_nick) + (pr.unit ? (' ' + pr.unit) : ''), val)
		}).join('')}
	</div>
`
cards.just = val => `
	<div style="margin: 0.25em 0">
		${val}
	</div>
`
cards.line = (title, val) => !val ? '' : `
	<div style="margin: 0.25em 0">
		${title}: ${val}
	</div>
`

cards.prop = {
	default: (data, env, mod, pr, title, val) => cards.prop.line(data, env, mod, pr, title, val),
	
	line: (data, env, mod, pr, title, val) => cards.line(title, val),
	linefilter: (data, env, mod, pr, title, val, nicks) => {
		if (!val) return ''
		if (!~['number','value'].indexOf(pr.type)) return ''
		return cards.line(title, nicks.map(nick => {
			const val = data.values[nick].value_title
			if (data.md.mget[pr.prop_nick]?.[nick]) return `<b>${val}</b>`
			return `
				<a rel="nofollow" href="${cards.getGroupPath(data, env, data.group)}/${cards.addget(data, env, {m:data.md.m + ':' + pr.prop_nick + '::.' + nicks[0] + '=1'})}#page">${val}</a>
			`
		}).join(', '))
	},
	linebold: (data, env, mod, pr, title, val) => cards.line(title, `<b>${val}</b>`),

	just: (data, env, mod, pr, title, val) => cards.just(val),
	justbrandmodel: (data, env, mod, pr, title, val) => cards.just(`<b>${cards.gainFirstTitle(data, env, mod.recap, 'brend')} ${cards.gainFirstTitle(data, env, mod.recap, 'model')}</b>`),
	justlinkmodel: (data, env, mod, pr, title, val) => cards.just(`<a href="${cards.getItemPath(data, env, mod.items[0])}">${val}</a>`),
	justlinkmodelhidden: (data, env, mod, pr, title, val) => cards.just(`<a style="color:inherit; border:none;" href="${cards.getItemPath(data, env, mod.items[0])}">${val}</a>`),
	justfilter: (data, env, mod, pr, title, val, nicks) => {
		if (!val) return ''
		if (!~['number','value'].indexOf(pr.type)) return ''
		return cards.just(nicks.map(nick => {
			const val = data.values[nick].value_title
			if (data.md.mget[pr.prop_nick]?.[nick]) return `<b>${val}</b>`
			return `
				<a rel="nofollow" href="${cards.getGroupPath(data, env, data.group)}/${cards.addget(data, env, {m:data.md.m + ':' + pr.prop_nick + '::.' + nicks[0] + '=1'})}#page">${val}</a>
			`
		}).join(', '))
	},
	justbold: (data, env, mod, pr, title, val) => cards.just(`<b>${val}</b>`),
	justellipsis: (data, env, mod, pr, title, val) => cards.just(`
		<div style="display: flex">
			<div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
				${val}
			</div>
		</div>
	`),

	
	empty: () => ''
}
cards.addget = (data, env, get) => addget(get, env.bread.get, ['m', 'search', 'sort', 'count'])


cards.basket = (data, env, recap) => {
	let html = ''
	const staraya = recap['staraya-cena']
	const cena = recap.cena
	if (staraya) {
		html += `<s style="opacity: .5;">${cost(staraya.at(0))}${cards.unit()}</s>`
	}

	if (cena.length > 1) {
		html += `
			От&nbsp;<b>${cost(cena.at(0))}</b> 
			до&nbsp;<b>${cost(cena.at(-1))}${cards.unit()}</b>
		`
	} else if (cena) {
		html += `
			<big><b>${cost(cena.at(0))}${cards.unit()}</b></big>
		`
	}
	
	return html
}
cards.propTitle = prop => {
	const unit = cards.unit(prop)
	return prop.name + (unit ? (',' + unit) : '')
}
cards.getModelName = (data, env, item) => {
	const gain = (name) => cards.gainFirstTitle(data, env, item, name)
	return `
		${gain('naimenovanie') || gain('model')}
	`
}
cards.image = (data, env, item) => `
	${item.images
		? (
			item.images.length > 1 
				? cards.imgs(data, env, item) 
				: cards.img(data, env, item, item.images[0])
		) 
		: '<div style="margin-bottom: 0.5rem"></div>'
	}
`

cards.nalichie = (data, env, mod) => {
	if (!mod.recap['nalichie'] && !mod.recap['staraya-cena']) return ''
	return `
		<div style="position:absolute; right: 0px; z-index:1; margin: 1rem; top:0">${cards.badgenalichie(data, env, mod)}</div>
	`
}
cards.getDiscounts = (mod) => {
	const discounts = mod.items.map(item => cards.getItemDiscount(item)).filter(discount => discount).sort()
	return discounts
}
cards.getItemDiscount = (item) => {
	const cost = item['cena']?.[0]
	const oldcost = item['staraya-cena']?.[0]
	const discount = oldcost && cost ? Math.round((1 - oldcost / cost) * 100) : ''
	return discount	
}
cards.getModelDiscount = (model) => {
	const discounts = cards.getDiscounts(model)
	if (!discounts[0]) return ''
	if (!discounts[1]) return `${discounts[0]}%`
	return `До ${discounts.at(-1)}%`
}

cards.badgenalichie = (data, env, mod) => {
	const gain = (name) => cards.gainFirstTitle(data, env, mod.recap, name)
	const discount = cards.getModelDiscount(mod)
	return mod.recap.nalichie ? `
		<a rel="nofollow" href="${cards.getGroupPath(data, env, data.group)}${cards.addget(data, env, {m:data.md.m + ':nalichie::.' + mod.recap.nalichie?.[0] + '=1'})}" 
			class="badge badge_${mod.recap.nalichie?.[0]}">
			${gain('nalichie')}
		</a>
	` : (discount ? `
		<span class="badge badge_discount">
			${discount}
		</span>
	` : '')
}
cards.imgs = (data, env, item) => `
	<div style="position: relative; margin-bottom:0.5em; transition: opacity 0.3s; opacity: 0">
		<div style="color: rgba(0,0,0,0.3); pointer-events: none; opacity: 0; position: absolute; height: 100%; display: flex; align-items: center;" class="left">
			&nbsp;←&nbsp;
		</div>
		<div style="color: rgba(0,0,0,0.3); pointer-events: none; position: absolute; height: 100%; right: 0px; display: flex; align-items: center; opacity: 1;" class="right">
			&nbsp;→&nbsp;
		</div>
		<div class="sliderNeo" style="cursor: pointer; overflow-x: scroll; white-space: nowrap; font-size:0;">
			${item.images.map(src => cards.img(data, env, item, src)).join('')}
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
cards.img = (data, env, item, src) => `
	<img 
		loading="lazy"
		alt="${cards.gainFirstTitle(data, env, item, 'model')}" 
		style="max-width: 100%; margin: 0 auto; height:auto" 
		${cards.imager(src, 400, 400)}
	>	
`
cards.imager = (src, w, h) => {
	const imager = '/-imager/webp?cache&fit=contain'
	const esrc = encodeURIComponent(src)
	return `
		width="${w}" 
		height="${h}" 
		srcset="
			${imager}&w=${w}&h=${h}&src=${esrc} 1x,
			${imager}&w=${w*2}&h=${h*2}&src=${esrc} 1.5x,
			${imager}&w=${w*3}&h=${h*3}&src=${esrc} 3x,
			${imager}&w=${w*4}&h=${h*4}&src=${esrc} 4x
		"
	`
}