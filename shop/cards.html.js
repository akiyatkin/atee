import nicked from "/@atee/nicked"
import cost from "/-words/cost.js"
import addget from '/-sources/addget.js'
import unique from "/-nicked/unique.js"
import Ecommerce from '/-shop/Ecommerce.js'
import ddd from "/-words/date.html.js"
const cards = {}
export default cards


cards.unit = (prop) => {
	if (!prop) return '&nbsp;руб.'
	if (prop.unit) return '&nbsp;' + prop.unit 
	if (prop.prop_nick == 'cena') return cards.unit()
	return ''
}

cards.getGroupPath = (data, group_nick) => [data.conf.root_path, 'group', group_nick].join('/')
cards.getParentPath = (data, group) => data.conf.root_path + (group.group_nick == data.conf.root_nick ? '' : '/group/' + group.parent_nick)
cards.getItemPath = (data, item) => {
	const path = [data.conf.root_path, 'item', item.brendmodel[0]]
	//const single = item.brendart[0] == item.brendmodel[0]
	//if (!single) path.push(item.art?.[0] || item.brendart[0])
	path.push(item.art?.[0] || item.brendart[0])
	return path.join('/')
}

cards.getItemName = (data, selitem) => { //ecommerce.name (в паре с getVariant)
	const gain = (name) => cards.getSomeTitle(data, selitem, name)
	if (selitem.naimenovanie) return gain('naimenovanie') + '  ' + gain('brendmodel')
	return gain('brendmodel')
}
cards.getItemPropList = (data, env, model) => {
	let list = model.iprops.filter(prop_nick => {
		const prop = data.props[prop_nick]
		if (!prop?.type) return false
		if (prop.type == 'text') return false
		if (prop.known == 'column') return false
		if (prop.known == 'secondary') return false
		if (prop.known == 'system') return false //Старая цена и Цена по купону достаются принудительно
		if (model.recap[prop_nick].length < 2) return false //В имя не надо вставлять то что нельзя выбрать если значение только одно
		//if (!item[prop_nick]) return false
		return true
	})
	if (!list.length) {
		list = ['art']
	}

	return list
}
cards.getVariant = (data, model, item) => { //ecommerce.variant
	if (model.items.length == 1) return '' //variant не будет указан
	let list = cards.getItemPropList(data, env, model)
	list = list.map(prop_nick => {
		const prop = data.props[prop_nick]
		const titles = cards.getSomeTitles(data, item, prop_nick)
		if (prop.unit) return titles.map(title => title + ' ' + prop.unit)
		return titles
	})
	//const title = unique(list.flat()).join(', ') //.sort()
	const title = list.flat().join(', ')
	if (!title) return cards.getSomeTitle(data, item, 'art') || cards.getSomeTitle(data, item, 'brendart')

	return title
}




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
		@media (max-width:1200px) {
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
		${data.list.map((model, i) => cards.card(data, env, model, i)).join('')}
	</div>
	${(data.pagination?.page == 1 && data.pagination?.last > 1) ? cards.scriptRemoveSuperfluous(data, data.conf.limit) : ''}
`
cards.scriptRemoveSuperfluous = (data, limit = 12) => `
	<script>
		(async listcards => {
			listcards.style.opacity = '0'
			const Card = await import('/-shop/Card.js').then(r => r.default)
			const count = Card.numberOfCards(${limit})
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
// cards.product = (data, env, item) => {
// 	const gain = (name) => cards.getSomeTitle(data, item, name)
// 	const product = {
// 		"id": item.brendmodel[0],
// 		"name" : gain('naimenovanie') || gain('model'),
// 		"price": gain('cena'),
// 		"brand": gain('brend'),
// 		"variant" : gain('art'),
// 		"category": (data.group || data.groups[0]).group_title
// 	}
// 	return product
// }
cards.card = (data, env, model, i) => {
	return `
		<div style="
			min-width: 0; /*fix overflow-text ellipsis*/
			border-radius: var(--radius); 
			position:relative; 
			display:flex; flex-direction: column; justify-content: space-between; box-shadow: 0 .5rem 1rem rgba(0,0,0,.15)" 
			class="shadow">
	 		${cards.data(data, env, model)}
	 		<script>
				(async card => {
					const products = [${JSON.stringify(
						Ecommerce.getProduct(data, {
							coupon:env.theme.partner,
							item: model.items[0], 
							listname: 'Каталог', 
							position: i + 1, //Позиции одной модели на одном месте получается находятся
							group_nick: model.group_nicks[0]
						})
					)}]
					const Ecommerce = await import('/-shop/Ecommerce.js').then(r => r.default)
					card.addEventListener('click', () => Ecommerce.click(products))
					card.addEventListener('contextmenu', () => Ecommerce.click(products))
					card.addEventListener('auxclick', () => Ecommerce.click(products))

				})(document.currentScript.parentNode)
			</script>
	 	</div>
	`
}
cards.data = (data, env, model) => `
	<div style="margin: 1rem 1rem 0.5rem 1rem;; flex-grow:1; display:flex; flex-direction: column; justify-content: space-between">
		${model.recap.cena?.length > 1 ? cards.nalichie(data, env, model) : ''}
		<a href="${cards.getItemPath(data, model.items[0])}#page"
			style="
				padding: 0; color: inherit; border: none; 
				white-space: normal; display: block; flex-grow:1
		">
			${cards.image(data, env, model.items[0])}
		</a>
		<div>
			${cards.props(data, env, model)}
		</div>
		
	</div>
	<div style="text-align:right; margin: 0rem 0.9rem 1rem 0.9rem">${cards.price(model.recap)}</div>
`

cards.getValueTitleByNick = (data, value_nick) => `${data.values[value_nick]?.value_title || '<span style="color: crimson">' + value_nick + '</span>'}`

cards.getSomeTitle = (data, item, prop_nick) => {
	if (!item[prop_nick]) return ''
	const prop = data.props[prop_nick]
	const first = item[prop_nick][0]
	if (prop.type == 'value') {
		return cards.getValueTitleByNick(data, first)
	} else if (prop.type == 'date') {
		return ddd.ai(first)
	} else if (prop.type == 'number') {
		return first / 10 ** prop.scale
	} else { //text
		return first
	}
}

cards.getSomeTitles = (data, item, prop_nick) => {
	if (!item[prop_nick]) return []
	const prop = data.props[prop_nick]
	const titles = item[prop_nick].map(nick => {
		if (prop.type == 'value') {
			//console.log(nick, prop, item)
			return cards.getValueTitleByNick(data, nick)
		} else if (prop.type == 'date') {
			return ddd.ai(nick)
		} else if (prop.type == 'number') {
			return nick / 10 ** prop.scale
		} else { //text
			return nick
		}
	})
	if (prop.type == 'value') titles.sort()
	return titles
}
//cards.gain Titles = (data, env, item, prop_nick) => cards.getSomeTitles(data, item, prop_nick).join(', ')
cards.props = (data, env, model) => `
	<div>
		${data.group.cards.map(prop_nick => cards.printProp(data, env, model, prop_nick)).join('')}
	</div>
`
cards.printProp = (data, env, model, prop_nick) => {
	
	const nicks = model.recap[prop_nick]
	if (!nicks) return ''
	const pr = data.props[prop_nick]
	const fn = cards.prop[pr.card_tpl] || cards.prop['default']
	

	let gainTitles = () => cards.getSomeTitles(data, model.recap, prop_nick).join(', ') + unit

	if (data.props[prop_nick].type == 'number' && nicks.length > 5) {
		gainTitles = () => {
			const titles = nicks
			const min = titles.at(0)
			const max = titles.at(-1)
			return `${min}&mdash;${max} ${unit}`
		}
	}
	const gainTitle = (nick) => cards.getSomeTitle(data, model.recap, nick || prop_nick) + unit
	const unit = (pr.unit ? (' ' + pr.unit) : '')
	return fn(data, env, model, pr, nicks, gainTitle, gainTitles)
}
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
cards.block = (html) => `
	<div style="margin: 1em 0;">
		${html}
	</div>
`
cards.prop = {
	default: (data, env, model, pr, nicks, gainTitle, gainTitles) => cards.prop.line(data, env, model, pr, nicks, gainTitle, gainTitles),
	
	line: (data, env, model, pr, nicks, gainTitle, gainTitles) => cards.line(pr.name, gainTitles()),
	linefilter: (data, env, model, pr, nicks, gainTitle, gainTitles) => {
		if (!~['number','value'].indexOf(pr.type)) return ''
		return cards.line(pr.prop_title, nicks.map(nick => {
			const val = cards.getValueTitleByNick(data, nick)
			if (data.md.mget[pr.prop_nick]?.[nick]) return `<b>${gainTitles()}</b>`
			return `
				<a rel="nofollow" href="${cards.getGroupPath(data, data.group.group_nick)}/${cards.addget(env.bread.get, {m:data.md.m + ':' + pr.prop_nick + '::.' + nicks[0] + '=1'})}#page">${gainTitles()}</a>
			`
		}).join(', '))
	},
	linebold: (data, env, model, pr, nicks, gainTitle, gainTitles) => cards.line(pr.prop_title, `<b>${gainTitles()}</b>`),

	just: (data, env, model, pr, nicks, gainTitle, gainTitles) => cards.just(gainTitles()),

	justbrandmodel: (data, env, model, pr, nicks, gainTitle, gainTitles) => cards.just(`<b>${gainTitle('brend')} ${gainTitle('model')}</b>`),
	justlinkmodel: (data, env, model, pr, nicks, gainTitle, gainTitles) => cards.just(`<a href="${cards.getItemPath(data, model.items[0])}">${gainTitle()}</a>`),
	justlinkmodelhidden: (data, env, model, pr, nicks, gainTitle, gainTitles) => cards.just(`<a style="color:inherit; border:none;" href="${cards.getItemPath(data, model.items[0])}">${gainTitle()}</a>`),
	justlinkmodelboldhidden: (data, env, model, pr, nicks, gainTitle, gainTitles) => cards.just(`<a style="font-weight:bold; color:inherit; border:none;" href="${cards.getItemPath(data, model.items[0])}">${gainTitle()}</a>`),
	
	justfilter: (data, env, model, pr, nicks, gainTitle, gainTitles) => {
		if (!~['number','value'].indexOf(pr.type)) return ''
		return cards.just(nicks.map(nick => {
			const val = cards.getValueTitleByNick(data, nick)
			if (data.md.mget[pr.prop_nick]?.[nick]) return `<b>${gainTitles()}</b>`
			return `
				<a rel="nofollow" href="${cards.getGroupPath(data, data.group.group_nick)}/${cards.addget(env.bread.get, {m:data.md.m + ':' + pr.prop_nick + '::.' + nicks[0] + '=1'})}#page">${gainTitles()}</a>
			`
		}).join(', '))
	},
	justbold: (data, env, model, pr, nicks, gainTitle, gainTitles) => cards.just(`<b>${gainTitles()}</b>`),
	justellipsis: (data, env, model, pr, nicks, gainTitle, gainTitles) => cards.just(`
		<div style="display: flex">
			<div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
				${gainTitles()}
			</div>
		</div>
	`),

	
	empty: () => ''
}
cards.addget = (get, params) => addget(get, params, ['m', 'query', 'count'])

cards.cost = (item) => item.cena ? cost(item.cena[0]) + cards.unit() : ''

// cards.cardprice = (item) => {
// 	let html = ''
// 	const staraya = item['staraya-cena']
// 	const cena = item.cena
// 	if (!cena) return html
// 	if (staraya && staraya.at(0) > cena.at(0)) {
// 		html += `<s style="opacity: .5;">${cost(staraya.at(-1))}${cards.unit()}</s>`
// 	}

// 	if (cena.length > 1) {
// 		html += `
// 			От&nbsp;<b>${cost(cena.at(0))}</b> 
// 			до&nbsp;<b>${cost(cena.at(-1))}${cards.unit()}</b>
// 		`
// 	} else if (cena) {
// 		html += `
// 			<big><b>${cost(cena.at(0))}${cards.unit()}</b></big>
// 		`
// 	}
	
// 	return html
// }
cards.price = (item) => {
	let html = ''
	const staraya = item['staraya-cena']
	const cena = item.cena
	if (!cena) return html
	if (staraya && staraya.at(0) > cena.at(0) && cena.length == 1) {
		html += `<s style="opacity: .5;">${cost(staraya.at(-1))}${cards.unit()}</s>`
	}

	if (cena.length > 1) {
		html += `
			От&nbsp;<b>${cost(cena.at(0))}</b> 
			до&nbsp;<b>${cost(cena.at(-1))}${cards.unit()}</b>
		`
	} else if (cena) {
		html += `
			<big><b>${cost(cena.at(0))}${cards.unit()}</b></big> ${cards.discountBadge(item)}
		`
	}
	
	return html
}
cards.propTitle = prop => {
	const unit = cards.unit(prop)
	return prop.name + (unit ? (',' + unit) : '')
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
		<div style="position:absolute; right: 0px; z-index:1; margin: 1rem; top:0">${cards.badgeModelNalichieDiscount(data, env, mod)}</div>
	`
}
cards.getDiscounts = (model) => {
	const discounts = model.items.map(item => cards.getItemDiscount(item)).filter(discount => discount).sort((a, b) => a - b)
	return discounts
}
cards.getItemDiscount = (item) => {
	const cost = item['cena']?.[0]
	const oldcost = item['staraya-cena']?.[0]
	const discount = oldcost && cost && oldcost > cost ? Math.round((1 - cost / oldcost) * 100) : ''	
	return discount	
}
cards.getModelDiscount = (model) => {
	const discounts = cards.getDiscounts(model)
	if (!discounts[0]) return ''
	if (!discounts[1]) return `-${discounts[0]}%`
	return `До -${discounts.at(-1)}%`
}
cards.discountBadge = (item) => {
	const discount = cards.getItemDiscount(item)
	if (!discount) return ''
	return `&nbsp;<span class="badge badge_discount">-${discount}%</span>`
}
// cards.nalichieBadge = (data, env, model) => {
// 	const gain = (name) => cards.getSomeTitle(data, model.recap, name)
// 	const discount = cards.getModelDiscount(model)
// 	return model.recap.nalichie ? `
// 		<a rel="nofollow" href="${cards.getGroupPath(data, data.group?.group_nick || model.groups?.[0])}${cards.addget(env.bread.get, {m:(data.md?.m || '') + ':nalichie::.' + model.recap.nalichie?.[0] + '=1'})}" 
// 			class="badge badge_${model.recap.nalichie?.[0]}">
// 			${gain('nalichie')}
// 		</a>
// 	` : ''
// }
cards.badgeModelNalichieDiscount = (data, env, model) => {
	const gain = (name) => cards.getSomeTitle(data, model.recap, name)
	const discount = cards.getModelDiscount(model)
	return model.recap.nalichie ? `
		<a rel="nofollow" href="${cards.getGroupPath(data, data.group?.group_nick || model.groups?.[0])}${cards.addget(env.bread.get, {m:(data.md?.m || '') + ':nalichie::.' + model.recap.nalichie?.[0] + '=1'})}" 
			class="badge badge_${model.recap.nalichie?.[0]}">
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
			${cards.getSomeTitles(data, item, 'images').map(src => cards.img(data, env, item, src)).join('')}
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
//MEMORYTEST
cards.img = (data, env, item, src) => `
	
	<img 
		loading="lazy"
		alt="${cards.getSomeTitle(data, item, 'model')}" 
		width="400" 
		height="400" 
		style="
			width: 100%;
			height:auto;
			aspect-ratio: 1 / 1; /* Соотношение сторон */
			object-fit: contain;
			vertical-align: middle; 
		" 
		src="${~src.indexOf(':') ? src : '/' + src}"
	>	
	
`
// cards.img = (data, env, item, src) => `
// 	<img 
// 		loading="lazy"
// 		alt="${cards.getSomeTitle(data, item, 'model')}" 
// 		style="max-width: 100%; margin: 0 auto; height:auto" 
// 		${cards.imager(src, 400, 400)}
// 	>	
// `
cards.imager = (src, w, h) => {
	const imager = '/-imager/webp?cache&fit=contain'
	const esrc = encodeURIComponent(src)

	//MEMORYTEST
	return `width="${w}" height="${h}" src="${~src.indexOf(':') ? src : '/' + src}"`

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