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
	<div class="${env.layer.sub}" style="padding-bottom: 20px; display: grid;  grid-gap: 20px">	
		${data.list.map(mod => cards.item(data, mod)).join('')}
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
cards.item = (data, mod) => `
	<div style="border-radius: var(--radius); position:relative; display:flex; flex-direction: column; justify-content: space-between; box-shadow: 0 .5rem 1rem rgba(0,0,0,.15)" 
 		class="shadow">
 		${cards.data(data, mod)}
 	</div>	
`
cards.data = (data, mod) => `
	<div>
		<div style="margin: 0.5rem 1rem;">
			${cards.image(mod)}
			${cards.name(mod)}
			${mod.props.length ? cards.props(data, mod) : ''}
		</div>
	</div>
	<div style="margin: 0.5rem 0.9rem 1rem 0.9rem">	
		${cards.basket(mod)}
	</div>
`
cards.props = (data, mod) => `
	<div class="props">
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
			<div title="${common.prtitle(mod, pr)}" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${val}</div>
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
	justlink: (data, mod, pr, title, val) => cards.prop.just(data, mod, pr, title, 
		`<a href="/catalog/${links.addm(data)}more.${pr.prop_nick}::.${nicked(val)}=1">${val}</a>`
	),
	amodel: (data, mod, pr, title, val) => cards.prop.just(data, mod, pr, title, 
		`<a href="/catalog/${mod.brand_nick}/${mod.model_nick}${links.setm(data)}">${mod.brand_title} ${mod.model_title}</a>`
	),
	p: (data, mod, pr, title, val) => `<div style="margin: 0.25rem 0;">${val}</div>`,
	empty: () => '',
	filter: (data, mod, pr, title, val) => cards.prop.default(data, mod, pr, title, 
		val.split(',').filter(r => r).map(value => `<a rel="nofollow" href="${links.val(data, mod, pr, value)}">${value}</a>`).join(', ')
	)

}
cards.basket = (mod) => {
	if (mod.min || mod.max) {
		return `
			От&nbsp;<b>${cost(mod.min)}</b> 
			до&nbsp;<b>${cost(mod.max)}${common.unit()}</b>
		`
	} else if (mod.Цена) {
		return `
			<div style="float: right">${cost(mod.Цена)}${common.unit()}</div>
		`
	}
	return ''
}
cards.name = (mod) => `
	<a style="padding: 0; color: inherit; border: none; white-space: normal;" href="${links.model(mod)}">${mod.Наименование || mod.model_title}</a>
`
cards.image = (mod) => `
	<div style="min-height: 2rem">
		${mod.Наличие ? cards.nalichie(mod) : ''}
		${mod.images?.length ? cards.img(mod) : ''}
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
cards.nalichie = mod => `
	<div style="position:absolute; right: 0px; z-index:1; margin: 1rem; top:0">${cards.badgenalichie(mod)}</div>
`
cards.badgenalichie = (mod) => `
	<a rel="nofollow" href="/catalog/${links.addm()}more.${cards.nal}::.${nicked(mod.Наличие)}=1" 
		class="badge badge_${nicked(mod['Наличие'])}">
		${mod['Старая цена'] ? ('-' + mod.discount + '%') : mod.Наличие}
	</a>
`
cards.img = (mod) => `
	<a style="border: none; display: block; text-align: center;" href="${links.model(mod)}">
		<img loading="lazy" style="max-width: 100%; margin: 0 auto" src="${mod.images[0]}">
	</a>
`