import { nicked } from "/-nicked/nicked.js"
import links from "/-catalog/links.html.js"
import layout from "/-catalog/layout.html.js"

const cards = {}
export default cards

cards.LIST = (data, env) => `
	<style>
		.${env.sub} { grid-template-columns: repeat(auto-fill, minmax(235px, 1fr)) }
		@media (max-width:767px) {
			.${env.sub} { grid-template-columns: 1fr 1fr }
		}
		@media (max-width:400px) {
			.${env.sub} { grid-template-columns: 1fr }
		}
	</style>
	<div class="${env.sub}" style="padding-bottom: 20px; display: grid;  grid-gap: 20px">	
		${data.list.map(mod => cards.item(data, mod)).join('')}
	</div>
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
			const val = layout.prtitle(mod, pr)
			if (val == null) return ''
			return cards.prop[pr.tplprop ?? 'link'](data, mod, pr, pr.prop_title, val)
		}).join('')}
	</div>
`
cards.prop = {
	default: (data, mod, pr, title, val) => `
		<div style="margin: 0.25rem 0; display: flex">
			<div style="padding-right: 0.5rem">${title}:</div>
			<div title="${layout.prtitle(mod, pr)}" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${val}</div>
		</div>
	`,
	bold: (data, mod, pr, title, val) => cards.prop.default(data, mod, pr, title, `<b>${val}</b>`),
	link: (data, mod, pr, title, val) => cards.prop.default(data, mod, pr, title, `<a href="${links.val(data, mod, pr)}">${val}</a>`),
	hideable: (data, mod, pr, title, val) => cards.prop.default(data, mod, pr, title, val.length < 30 ? val : `
		<span class="a" onclick="this.style.display = 'none'; this.nextElementSibling.style.display = ''">Показать</span>
		<span onclick="this.style.display = 'none'; this.previousElementSibling.style.display = ''" style="display: none">${val}</span>
	`)
}
cards.basket = (mod) => !mod.Цена ? '' : `
	<div style="float: right">${mod.Цена || ''}&nbsp;${layout.unit()}</div>
`
cards.name = (mod) => `
	<a style="padding: 0; color: inherit;border: none;" href="${links.model(mod)}">${mod.Наименование || mod.model_title}</a>
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
	<a rel="nofollow" href="/catalog/${links.add()}more.${cards.nal}::.${nicked(mod.Наличие)}=1" 
		class="badge ${cards.badges[mod['Наличие']] || 'badge-secondary'}">
		${mod['Старая цена'] ? ('-' + mod.discount + '%') : mod.Наличие}
	</a>
`
cards.img = (mod) => `
	<a style="border: none; display: block; text-align: center;" href="${links.model(mod)}">
		<img loading="lazy" style="max-width: 100%; margin: 0 auto" src="${mod.images[0]}">
	</a>
`