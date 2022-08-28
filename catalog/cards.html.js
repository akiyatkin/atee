import { nicked } from "/-nicked/nicked.js"
import mark from "/-catalog/mark.html.js"
import links from "/-catalog/links.html.js"
import { unit } from "/-catalog/layout.html.js"

export const LIST = (data, env) => `
	<div class="${env.sub}" style="padding-bottom: 20px; display: grid;  grid-gap: 20px">
		<style>
			.${env.sub} { grid-template-columns: repeat(auto-fill, minmax(235px, 1fr)) }
			@media (max-width:767px) {
				.${env.sub} { grid-template-columns: 1fr 1fr }
			}
			@media (max-width:400px) {
				.${env.sub} { grid-template-columns: 1fr }
			}
		</style>
		${data.list.map(item).join('')}
	</div>
`
const item = (mod) => `
	<div style="border-radius: var(--radius); position:relative; display:flex; flex-direction: column; justify-content: space-between; box-shadow: 0 .5rem 1rem rgba(0,0,0,.15)" 
 		class="shadow">
 		${data(mod)}
 	</div>	
`
const data = (mod) => `
	<div>
		<div style="margin: 0.5rem 1rem;">
			${image(mod)}
			${name(mod)}
			${props(mod)}
		</div>
	</div>
	<div style="margin: 0.5rem 0.9rem 1rem 0.9rem">	
		${basket(mod)}
	</div>

`
const props = (mod) => `
	<div class="props">
		${mod.props.length ? mod.props.map(p => prop(p, mod)).join('') : ''}
	</div>
`
const prop = (pr, mod) => `
	<div style="margin:  0.25rem 0; display: flex">
		<div style="padding-right: 0.5rem">${pr.prop_title}:</div>
		<div title="{:pval}" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${mod[pr.value_title]}</div>
	</div>
`
const basket = (mod) => `
	<div style="float: right">${mod.Цена || ''}</div>
`

const name = (mod) => `
	<a style="padding: 0; color: inherit;border: none;" href="${links.model(mod)}">${mod.Наименование || mod.model_title}</a>
`
const image = (mod) => `
	<div style="min-height: 2rem">
		${mod.Наличие ? nalichie(mod) : ''}
		${mod.images?.length ? img(mod) : ''}
	</div>
`
const badges = {
	"Новинка":"badge-green",
	"В наличии":"badge-primary",
	"Акция":"badge-danger",
	"Распродажа":"badge-success",
	"На заказ":"badge-info",
	"Мало":"badge-warning"
}
const nalichie = mod => `
	<div style="position:absolute; right: 0px; z-index:1; margin: 1rem; top:0">${badgenalichie(mod)}</div>
`
const nal = nicked('Наличие')
const badgenalichie = (mod) => `
	<a rel="nofollow" href="/catalog/${mark.add()}more.${nal}::.${nicked(mod.Наличие)}=1" 
		class="badge ${badges[mod['Наличие']] || 'badge-secondary'}">
		${mod['Старая цена'] ? ('-' + mod.discount + '%') : mod.Наличие}
	</a>
`
const img = (mod) => `
	<a style="border: none; display: block; text-align: center;" href="${links.model(mod)}">
		<img loading="lazy" style="max-width: 100%; margin: 0 auto" src="${mod.images[0]}">
	</a>
`
export default { LIST }