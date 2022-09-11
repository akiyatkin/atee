import cards from "/-catalog/cards.html.js"
import { nicked } from "/-nicked/nicked.js"
import { cost } from "/-words/cost.js"
import links from "/-catalog/links.html.js"
import common from "/-catalog/common.html.js"

const model = {}
export default model

model.ROOT = (data, env, { mod } = data) => `
	${data.mod?showmodel(data, env, data):showerror(data, env)}
`
const showerror = (data, env) => `
	<div style="float:left; margin-top:1rem">
		<a href="${env.crumb.parent}${links.setm(data)}">${data.brand?.brand_title ?? env.crumb.parent.name}</a>
	</div>
	<h1 style="clear:both">Модель <b>${env.crumb.parent.name} ${env.crumb.name}</b> не найдена</h1>
`
const showmodel = (data, env, { mod } = data) =>
`
	<div style="float:left; margin-top:1rem"><a href="${env.crumb.parent.parent}${mod.parent_id ? '/'+mod.group_nick : ''}${links.setm(data)}">${mod.group_title}</a></div>
	<h1 style="clear:both">${cards.name(data, mod)}</h1>
	
	${model.common(data, env, mod)}
	
	${model.props(data, mod)}
	${mod.item_rows.length ? model.items(data, mod) : ''}
	<!-- <pre>${JSON.stringify(mod, "\n", 2)}</pre> -->
`
const showimage = (src) => `
	<img load="lazy" src="${src}">
`
const brandlink = (data, env, mod) => `
	<a href="${env.crumb.parent}${links.setm(data)}">${mod.brand_title}</a>
`
model.common = (data, env, mod) => `
	${cards.badgecss(data, env)}
	<div style="float: right;">${mod.Наличие ? cards.badgenalichie(data, mod) : ''}</div>
	${model.showprop('Бренд', brandlink(data, env, mod))}
	${model.showprop('Модель', mod.model_title)}
	${cards.basket(data, mod)}

	${mod.images? '<p>'+mod.images.map(showimage)+'</p>' : ''}
	<p>
		<i>${mod.Описание || ''}</i>
	</p>
	<p><button id="makeorder">Сделать заказ</button></p>
	<div id="popuporder"></div>
	<script type="module">
		import { Dialog } from '/-dialog/Dialog.js'
		const btn = document.getElementById('makeorder')
		const tplobj = await import('/-catalog/order.html.js')
		const html = tplobj.ROOT(${JSON.stringify(data)}, 'popuporder', "${env.theme.partner ?? ''}")
		//const { Dialog } = await import('/-dialog/Dialog.js')
		await Dialog.frame('popuporder', html)
		btn.addEventListener('click', async () => {
			btn.disabled = true
			await Dialog.show('popuporder')	
			btn.disabled = false
		})	
	</script>
`
model.items = (data, mod) => `
	<table class="table">
		<tr>${mod.item_rows.map(model.itemhead).join('')}</tr>
		${mod.items.map(item => model.itembody(data, mod, item)).join('')}
	</table>
`
model.itemhead = (prop) => `<td>${prop}</td>`
model.itembody = (data, mod, item) => `
	<tr>
		${mod.item_rows.map(prop => model.itemprop(item, prop)).join('')}
	</tr>
`
model.itemprop = (item, prop) => `
	<td>${common.propval(item,prop)}</td>
`
model.showprop = (prop_title, val) => `
	<div style="margin: 0.25rem 0; display: flex">
		<div style="padding-right: 0.5rem">${prop_title}:</div>
		<div>${val}</div>
	</div>
`
model.props = (data, mod) => `
	<div>
		${mod.model_rows.map(pr => {
			const val = common.prtitle(mod, pr)
			if (val == null) return ''
			return cards.prop.wrap(data, mod, pr, pr.prop_title, val)
		}).join('')}
	</div>
`
model.prop = {
	default: (data, mod, pr, title, val) => model.showprop(title, val),
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