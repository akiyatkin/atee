import { nicked } from "/-nicked/nicked.js"
import { cost } from "/-words/cost.js"
import links from "/-catalog/links.html.js"
import common from "/-catalog/common.html.js"

const cards = {}
export default cards

cards.LIST = (data, env) => `
	<style>
		.${env.layer.sub} { grid-template-columns: repeat(auto-fill, minmax(235px, 1fr)) }
		@media (max-width:767px) {
			.${env.layer.sub} { grid-template-columns: 1fr 1fr }
		}
		@media (max-width:400px) {
			.${env.layer.sub} { grid-template-columns: 1fr }
		}
	</style>
	${cards.badgecss(data, env)}
	<div class="${env.layer.sub}" style="display: grid;  grid-gap: 20px">	
		${data.list.map(mod => cards.card(data, mod)).join('')}
	</div>
`
cards.badgecss = (data, env) => `
	<style>
		#${env.layer.div} .badge {
			border-radius: 8px;
			border: solid 1px currentColor;
			padding: 2px 8px;
			font-size: 0.9rem;
		}
		#${env.layer.div} .badge:hover {
			background-color: white;
		}
		#${env.layer.div} .badge_novinka {
			color: green;
		}
	</style>
`
cards.card = (data, mod) => `
	<div style="
		min-width: 0; /*fix overflow-text ellipsis*/
		border-radius: var(--radius); 
		position:relative; 
		display:flex; flex-direction: column; justify-content: space-between; box-shadow: 0 .5rem 1rem rgba(0,0,0,.15)" 
 		class="shadow">
 		${cards.data(data, mod)}
 	</div>	
`
cards.data = (data, mod) => `
	<div>
		<div style="margin: 0.5rem 1rem;">
			${cards.image(data, mod)}
			${cards.name(data, mod)}
			${mod.props.length ? cards.props(data, mod) : ''}
		</div>
	</div>
	<div style="margin: 0.5rem 0.9rem 1rem 0.9rem">	
		${cards.basket(data, mod)}
	</div>
`
cards.props = (data, mod) => `
	<div>
		${mod.props.map(pr => {
			const val = common.prtitle(mod, pr)
			if (val == null) return ''
			return cards.prop[pr.tplprop ?? 'default'](data, mod, pr, pr.prop_title, val)
		}).join('')}
	</div>
`
cards.prop = {
	default: (data, mod, pr, title, val) => `
		<div style="margin: 0.25rem 0; display: flex">
			<div style="padding-right: 0.5rem">${title}:</div>
			<div title="${common.prtitle(mod, pr)}" 
				style="
					overflow: hidden; 
					text-overflow: ellipsis; 
					white-space: nowrap;">
				${val}
			</div>
		</div>
	`,
	wrap: (data, mod, pr, title, val) => `
		<div style="margin: 0.25rem 0; display: flex">
			<div style="padding-right: 0.5rem">${title}:</div>
			<div>
				${val}
			</div>
		</div>
	`,
	bold: (data, mod, pr, title, val) => cards.prop.default(data, mod, pr, title, `<b>${val}</b>`),
	brand: (data, mod, pr, title, val) => cards.prop.default(data, mod, pr, title, 
		`<a href="/catalog/${mod.brand_nick}">${mod.brand_title}</a>`
	),
	group: (data, mod, pr, title, val) => cards.prop.p(data, mod, pr, title, 
		`<a style="max-width:100%" href="/catalog/${mod.group_nick}"><span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block">${mod.group_title}</span></a>`
	),
	cost: (data, mod, pr, title, val) => cards.prop.bold(data, mod, pr, title, `${cost(val)}${common.unit()}`),
	hideable: (data, mod, pr, title, val) => cards.prop.default(data, mod, pr, title, val.length < 30 ? val : `
		<span class="a" onclick="this.style.display = 'none'; this.nextElementSibling.style.display = ''">Показать</span>
		<span onclick="this.style.display = 'none'; this.previousElementSibling.style.display = ''" style="display: none">${val}</span>
	`),
	link: (data, mod, pr, title, val) => cards.prop.default(data, mod, pr, title, 
		`<a href="/catalog/${links.addm(data)}more.${pr.prop_nick}::.${nicked(val)}=1">${val}</a>`
	),
	just: (data, mod, pr, title, val) => `
		<div style="margin: 0.25rem 0; display: flex">
			<div title="${common.prtitle(mod, pr)}" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
				${val}
			</div>
		</div>
	`,
	justwrap: (data, mod, pr, title, val) => `
		<div style="margin: 0.25rem 0;">
			${val}
		</div>
	`,
	justlinknowrap: (data, mod, pr, title, val) => cards.prop.just(data, mod, pr, title, 
		val.split(', ').map(val => 
			data.md.more && data.md.more[pr.prop_nick] && data.md.more[pr.prop_nick][val] 
			? `<b>${val}</b>` : `<a href="/catalog/${links.addm(data)}more.${pr.prop_nick}::.${val}=1">${val}</a>`
		).join(', ')
	),
	justlink: (data, mod, pr, title, val) => cards.prop.justwrap(data, mod, pr, title, 
		val.split(', ').map(val => 
			data.md.more && data.md.more[pr.prop_nick] && data.md.more[pr.prop_nick][val] 
			? `<b>${val}</b>` : `<a href="/catalog/${links.addm(data)}more.${pr.prop_nick}::.${val}=1">${val}</a>`
		).join(', ')
	),
	brandart: (data, mod, pr, title, val) => cards.prop.just(data, mod, pr, title, `
		${data.brand?.brand_nick != mod.brand_nick ? cards.brandlink(data, mod) : '<b>' + mod.brand_title + '</b>'}
		<a href="/catalog/${mod.brand_nick}/${mod.model_nick}${links.setm(data)}">${mod.model_title}</a>
	`),
	p: (data, mod, pr, title, val) => `<div style="margin: 0.25rem 0;">${val}</div>`,
	empty: () => '',
	filter: (data, mod, pr, title, val) => cards.prop.default(data, mod, pr, title, 
		val.split(',').filter(r => r).map(value => `<a rel="nofollow" href="${links.val(data, mod, pr, value)}">${value}</a>`).join(', ')
	)
}

cards.brandlink = (data, mod) => `
	<a href="/catalog/${mod.brand_nick}${links.setm(data)}">${mod.brand_title}</a>
`
cards.basket = (data, mod) => {
	if (mod.min || mod.max) {
		return `
			От&nbsp;<b>${cost(mod.min)}</b> 
			до&nbsp;<b>${cost(mod.max)}${common.unit()}</b>
		`
	} else if (mod.Цена) {
		return `
			<b>${cost(mod.Цена)}${common.unit()}</b>
		`
	}
	return ''
}
cards.name = (data, mod) => `
	<a style="padding: 0; color: inherit; border: none; white-space: normal;" href="${links.model(data, mod)}">${mod.Наименование || mod.model_title}</a>
`
cards.image = (data, mod) => `
	<div style="min-height: 2.7rem">
		${mod.Наличие ? cards.nalichie(data, mod) : ''}
		${mod.images?.length ? cards.img(data, mod) : ''}
	</div>
`
cards.nal = nicked('Наличие')
cards.badges = {
	"Новинка":"badge-green",
	"В наличии":"badge-primary",
	"Акция":"badge-danger",
	"Распродажа":"badge-success",
	"На заказ":"badge-info",
	"Мало":"badge-warning"
}
cards.nalichie = (data, mod) => `
	<div style="position:absolute; right: 0px; z-index:1; margin: 1rem; top:0">${cards.badgenalichie(data, mod)}</div>
`
cards.badgenalichie = (data, mod) => `
	<a rel="nofollow" href="/catalog/${links.addm(data)}more.${cards.nal}::.${mod.Наличие}=1" 
		class="badge badge_${nicked(mod['Наличие'])}">
		${mod['Старая цена'] ? ('-' + mod.discount + '%') : mod.Наличие}
	</a>
`
cards.img = (data, mod) => `
	<a style="border: none; display: block; text-align: center;" href="${links.model(data, mod)}">
		<img loading="lazy" style="max-width: 100%; margin: 0 auto" src="${mod.images[0]}">
	</a>
`