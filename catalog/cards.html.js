import nicked from "/-nicked"
import { cost } from "/-words/cost.js"
import links from "/-catalog/links.html.js"
import common from "/-catalog/common.html.js"

const cards = {}
export default cards

cards.LIST = (data, env) => `
	<style>
		${env.scope} .listcards { grid-template-columns: repeat(auto-fill, minmax(235px, 1fr)) }
		@media (max-width:767px) {
			${env.scope} .listcards { grid-template-columns: 1fr 1fr }
		}
		@media (max-width:360px) {
			${env.scope} .listcards { grid-template-columns: 1fr }
		}
	</style>
	${cards.badgecss(data, env)}
	<div class="listcards" style="display: grid;  grid-gap: 20px">	
		${data.list?.map(mod => cards.card(data, env, mod)).join('')}
	</div>
	${(data.pagination?.page == 1 && data.pagination?.last > 1) ? cards.scriptRemoveSuperfluous(data) : ''}
`
cards.scriptRemoveSuperfluous = (data) => `
	<script>
		(async listcards => {
			const numberOfCards = await import('/-catalog/numberOfCards.js').then(r => r.default)
			//Надо чтобы всегда было 2 ряда, не больше
			const count = numberOfCards(${data.limit})
			while (listcards.children.length > count) listcards.children[count - 1].remove()
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
cards.card = (data, env, mod) => `
	<div style="
		min-width: 0; /*fix overflow-text ellipsis*/
		border-radius: var(--radius); 
		position:relative; 
		display:flex; flex-direction: column; justify-content: space-between; box-shadow: 0 .5rem 1rem rgba(0,0,0,.15)" 
 		class="shadow">
 		${cards.data(data, env, mod)}
 	</div>	
`
cards.data = (data, env, mod) => `
	<div style="margin: 0.5rem 1rem; flex-grow:1; display:flex; flex-direction: column; justify-content: space-between">
		${mod.Наличие || mod.discount ? cards.nalichie(data, env, mod) : ''}
		<a href="${links.model(data, env, mod)}"
			style="
				padding: 0; color: inherit; border: none; 
				white-space: normal; display: block; flex-grow:1
		">
			${cards.image(data, mod)}
		</a>
		<div>
			${mod.card_props.length ? cards.props(data, env, mod) : ''}
		</div>
	</div>
	
	${cards.basket(data, mod)}
`
cards.props = (data, env, mod) => `
	<div>
		${mod.card_props.map(pr => {
			return cards.prop[pr.tplprop ?? 'default'](data, env, mod, pr, pr.prop_title, pr.value)
		}).join('')}
	</div>
`
cards.prop = {
	default: (data, env, mod, pr, title, val) => `
		<div style="margin: 0.25rem 0; display: flex">
			<div style="padding-right: 0.5rem">${title}:</div>
			<div title="${pr.value}" 
				style="
					overflow: hidden; 
					text-overflow: ellipsis; 
					white-space: nowrap;">
				${val}
			</div>
		</div>
	`,
	wrap: (data, env, mod, pr, title, val) => `
		<div style="margin: 0.25rem 0; display: flex">
			<div style="padding-right: 0.5rem">${title}:</div>
			<div>
				${val}
			</div>
		</div>
	`,
	bold: (data, env, mod, pr, title, val) => cards.prop.default(data, env, mod, pr, title, `<b>${val}</b>`),
	brand: (data, env, mod, pr, title, val) => cards.prop.just(data, env, mod, pr, title, 
		data.md?.brand?.[mod.brand_nick]
			? `<b>${mod.brand_title}</b>` : `<a href="${env.crumb.parent||'/catalog'}/${links.addm(data)}brand::.${mod.brand_nick}=1">${mod.brand_title}</a>`
	),
	model: (data, env, mod, pr, title, val) => cards.prop.just(data, env, mod, pr, title, 
		`<a href="${env.crumb.parent||'/catalog'}/${mod.brand_nick}/${mod.model_nick}${links.setm(data)}">${val}</a>`
	),
	modelhidden: (data, env, mod, pr, title, val) => cards.prop.just(data, env, mod, pr, title, 
		`<a style="color:inherit; border:none;" href="${env.crumb.parent||'/catalog'}/${mod.brand_nick}/${mod.model_nick}${links.setm(data)}">${val}</a>`
	),
	modelhiddenwrap: (data, env, mod, pr, title, val) => cards.prop.justwrap(data, env, mod, pr, title, 
		`<a style="color:inherit; border:none;" href="${env.crumb.parent||'/catalog'}/${mod.brand_nick}/${mod.model_nick}${links.setm(data)}">${val}</a>`
	),
	group: (data, env, mod, pr, title, val) => cards.prop.p(data, env, mod, pr, title, 
		`<a style="max-width:100%" href="${env.crumb.parent||'/catalog'}/${mod.group_nick}"><span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block">${mod.group_title}</span></a>`
	),
	cost: (data, env, mod, pr, title, val) => cards.prop.bold(data, env, mod, pr, title, `${cost(val)}${common.unit()}`),
	hideable: (data, env, mod, pr, title, val) => cards.prop.default(data, mod, pr, title, val.length < 30 ? val : `
		<span class="a" onclick="this.style.display = 'none'; this.nextElementSibling.style.display = ''">Показать</span>
		<span onclick="this.style.display = 'none'; this.previousElementSibling.style.display = ''" style="display: none">${val}</span>
	`),
	link: (data, env, mod, pr, title, val) => cards.prop.default(data, env, mod, pr, title, 
		`<a href="${env.crumb.parent}/${links.addm(data)}more.${pr.prop_nick}::.${nicked(val)}=1">${val}</a>`
	),
	just: (data, env, mod, pr, title, val) => `
		<div style="margin: 0.25rem 0; display: flex">
			<div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
				${val}
			</div>
		</div>
	`,
	justwrap: (data, env, mod, pr, title, val) => `
		<div style="margin: 0.25rem 0;">
			${val}
		</div>
	`,
	justlinknowrap: (data, env, mod, pr, title, val) => cards.prop.just(data, env, mod, pr, title, 
		val.split(', ').map(val => 
			data.md.more && data.md.more[pr.prop_nick] && data.md.more[pr.prop_nick][val] 
			? `<b>${val}</b>` : `<a href="${env.crumb.parent||'/catalog'}/${links.addm(data)}more.${pr.prop_nick}::.${nicked(val)}=1">${val}</a>`
		).join(', ')
	),
	
	justlink: (data, env, mod, pr, title, val) => cards.prop.justwrap(data, env, mod, pr, title, 
		val.split(', ').map(val => 
			data.md?.more?.[pr.prop_nick]?.[nicked(val)] 
			? `<b>${val}</b>` : `<a href="${env.crumb.parent||'/catalog'}/${links.addm(data)}more.${pr.prop_nick}::.${nicked(val)}=1">${val}</a>`
		).join(', ')
	),
	brandart: (data, env, mod, pr, title, val) => cards.prop.p(data, env, mod, pr, title, `
		${data.brand?.brand_nick != mod.brand_nick ? cards.brandlink(data, env, mod) : '<b>' + mod.brand_title + '</b>'}
		<br><a style="white-space: normal" href="${env.crumb.parent||'/catalog'}/${mod.brand_nick}/${mod.model_nick}${links.setm(data)}">${mod.model_title}</a>
	`),
	p: (data, env, mod, pr, title, val) => `<div style="margin: 0.25rem 0;">${val}</div>`,
	empty: () => '',
	filter: (data, env, mod, pr, title, val) => cards.prop.default(data, env, mod, pr, title, 
		val.split(',').filter(r => r).map(value => `<a rel="nofollow" href="${links.val(data, env, mod, pr, value)}">${value}</a>`).join(', ')
	)
}

cards.brandlink = (data, env, mod) => `
	<a href="${env.crumb.parent||'/catalog'}/${mod.brand_nick}${links.setm(data)}">${mod.brand_title}</a>
`
cards.basket = (data, mod) => {
	let html = ''
	if (mod['Старая цена']) {
		html += `<s style="opacity: .5;">${cost(mod['Старая цена'])}${common.unit()}</s>`
	}
	if (mod.min || mod.max) {
		html += `
			От&nbsp;<b>${cost(mod.min)}</b> 
			до&nbsp;<b>${cost(mod.max)}${common.unit()}</b>
		`
	} else if (mod.Цена) {
		html += `
			<big><b>${cost(mod.Цена)}${common.unit()}</b></big>
		`
	} else {
		if (data.list) {
			const iscost = data.list.some(mod => mod.Цена || mod.min)
			if (iscost) {
				html += `
					<big>&nbsp;</big>
				`
			}
		}
	}
	if (html) html = `<div style="text-align:right; margin: 0rem 0.9rem 1rem 0.9rem">${html}</div>`
	else  html = `<div style="margin-bottom: 0.3rem"></div>`
	return html
}
cards.name = (data, mod) => `
	${mod.Наименование || mod.model_title}
`
cards.image = (data, mod) => `
	${mod.images?.length 
		? (
			mod.images?.length > 1 
				? cards.imgs(data, mod) 
				: cards.img(data, mod, mod.images[0])
		) 
		: '<div style="margin-bottom: 0.5rem"></div>'
	}
`
cards.nal = nicked('Наличие')

cards.nalichie = (data, env, mod) => `
	<div style="position:absolute; right: 0px; z-index:1; margin: 1rem; top:0">${cards.badgenalichie(data, env, mod)}</div>
`
cards.badgenalichie = (data, env, mod) => mod.Наличие ? `
	<a rel="nofollow" href="${env.crumb.parent||'/catalog'}/${links.addm(data)}more.${cards.nal}::.${nicked(mod.Наличие)}=1" 
		class="badge badge_${nicked(mod['Наличие'] || 'discount')}">
		${mod.discount ? ('-' + mod.discount + '%') : mod.Наличие}
	</a>
` : `
	<span class="badge badge_${nicked(mod['Наличие'] || 'discount')}">
		${mod.discount ? ('-' + mod.discount + '%') : mod.Наличие}
	</span>
`
cards.imgs = (data, mod) => `
	<div style="position: relative; margin-bottom:0.5em; transition: opacity 0.3s; opacity: 0">
		<div style="color: rgba(0,0,0,0.3); pointer-events: none; opacity: 0; position: absolute; height: 100%; display: flex; align-items: center;" class="left">
			&nbsp;←&nbsp;
		</div>
		<div style="color: rgba(0,0,0,0.3); pointer-events: none; position: absolute; height: 100%; right: 0px; display: flex; align-items: center; opacity: 1;" class="right">
			&nbsp;→&nbsp;
		</div>
		<div class="sliderNeo" style="cursor: pointer; overflow-x: scroll; white-space: nowrap; font-size:0">
			${mod.images.map(src => cards.img(data, mod, src)).join('')}
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
cards.img = (data, mod, src) => `
	<img 
		loading="lazy" 
		style="max-width: 100%; margin: 0 auto; height:auto" 
		${cards.imager(src, 330, 220)}
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