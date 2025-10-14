import cards from "/-catalog/cards.html.js"
import nicked from "/-nicked"
import cost from "/-words/cost.js"
import links from "/-catalog/links.html.js"
import common from "/-catalog/common.html.js"
import ti from "/-words/ti.js"

const tpl = {}
export default tpl

tpl.ROOT = (data, env, { mod } = data) => `
	${data.result ? tpl.showmodel(data, env, data) : tpl.showerror(data, env)}
`
tpl.showerror = (data, env) => `
	<div style="float:left; margin-top:1rem">
		<a href="${env.crumb.parent}${links.setm(data)}">${data.brand?.brand_title ?? env.crumb.parent.name}</a>
	</div>
	<h1 style="clear:both"><b>${env.crumb.parent.name} ${env.crumb.name}</b></h1>
	<p>
		Модель в магазине не найдена
	</p>
`
tpl.showBreadcrumbs = (data, env, mod) => `
	<div style="margin-top:1rem">
		<div style="float:left"><a href="${env.crumb.parent.parent}${mod.parent_id ? '/'+mod.group_nick : ''}${links.setm(data)}">${mod.group_title}</a></div>
		${cards.badgecss(data, env)}
		<div style="float: right">${mod.Наличие || mod.discount ? cards.badgenalichie(data, env, mod) : ''}</div>
	</div>
`
tpl.showmodel = (data, env, { mod } = data) =>`
	${tpl.showBreadcrumbs(data, env, mod)}
	<h1 style="clear:both">${cards.name(data, mod)}</h1>
	${tpl.maindata(data, env, mod)}
	<div style="margin-bottom:2rem">
		${mod['Скрыть фильтры'] ? '' : tpl.props(data, env, mod)}
		${mod.item_props.length ? tpl.showitems(data, env, mod) : ''}
	</div>

	<div class="modtext" style="margin-bottom:2rem">
		<style>
			${env.scope} .modtext img {
				max-width: 100%;
				height: auto;
			}
		</style>
		${ti.ar(mod.texts).join('')}
	</div>
	<div class="modfiles" style="margin-bottom:2rem">
		${ti.ar(mod.files).map(tpl.filerow).join('')}
	</div>
	<!-- <pre>${JSON.stringify(mod, "\n", 2)}</pre> -->
`
tpl.filerow = f => `
	<div style="display: grid; width:auto; align-items: center; grid-template-columns: max-content 1fr; gap: 0.5rem; margin-bottom:0.5rem">
		<img width="20" load="lazy" src="/file-icon-vectors/dist/icons/vivid/${f.ext || f.anchorext || 'lnk'}.svg"> 
		<div><a target="about:blank" href="${/^http/.test(f.dir) ? '' : '/'}${f.dir + f.file}">${f.anchor || f.name}</a></div>
	</div>
`
tpl.showGallery = (data, env, mod) => `
	<div class="imagecontent">
		<style>
			${env.scope} .imagemin_showgallery {	
				margin: 1rem;		
			}
			${env.scope} .imagemin_gallery {
				display: grid;
		    	grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
		        gap: 1rem;
			}		
			${env.scope} .imagemin {
				border-radius: var(--radius);
				cursor: pointer;
				text-align: center;
			}
			${env.scope} .imagemin.selected {
				border: solid 1px var(--main, orange);
				padding: 4px;
			}
			${env.scope} .imagemax_gallery {
				overflow:hidden; 
				/*aspect-ratio: 3 / 2; */
				display:grid; 
				justify-content: center; 
			
			}
			${env.scope} .pointer {
				cursor: pointer;
			}
		</style>
		<div class="imagemax_gallery ${mod.images.length>1?'pointer':''}" style="">
			<img alt="" style="max-width: 100%; height:auto" ${cards.imager(mod.images[0], 500, 500)}>
		</div>
		<div class="imagemin_showgallery">
			<div class="imagemin_gallery">
				${mod.images.length > 1 ? mod.images.map(tpl.showimage).join('') : ''}
			</div>
		</div>

		<script type="module">
			const div = document.getElementById('${env.layer.div}')
			const bigimg = div.querySelector('.imagemax_gallery img')
			const imgmins = div.querySelectorAll('.imagemin')
			for (const imgmin of imgmins) {
				imgmin.addEventListener('click', () => {
					div.querySelector('.selected').classList.remove('selected')
					imgmin.classList.add('selected')
					const file = encodeURIComponent(imgmin.dataset.file)
					bigimg.src = imgmin.src
					//bigimg.srcset = '/-imager/webp?h=500&src='+file+' 1x,/-imager/webp?h=750&src='+file+' 1.5x,/-imager/webp?h=1000&src='+file+' 2x,/-imager/webp?h=1500&src='+file+' 3x,/-imager/webp?h=2000&src='+file+' 4x'
				})
			}
			if (imgmins.length) bigimg.addEventListener('click', () => {
				const selected = div.querySelector('.selected')
				const next = selected.nextElementSibling || div.querySelector('.imagemin')
				if (!next) return
				next.click()
			})
		</script>
	</div>
`
tpl.showimage = (src, i) => `	
	<div data-file="${src}" class="imagemin ${i === 0 ? 'selected' : ''}">
		<img loading="lazy" alt="" style="max-width: 100%; height:auto" 
		${cards.imager(mod.images[0], 150, 150)}>
	</div>
`
tpl.maindata = (data, env, mod) => `
	<div class="mod_content">
		<style>
			${env.scope} .mod_content {
				display: grid;
				grid-template-columns: 1fr ${mod.images ? '1fr' : ''};
				gap: 2rem;
				padding-bottom: 1rem;
			}
			@media (max-width: 900px){
				${env.scope} .mod_content {
					
				}
			}
			@media (max-width: 705px){
				${env.scope} .mod_content {
					display: grid;
					grid-template-columns: 1fr;
				}
			}
		</style>	
		${mod.images ? tpl.showGallery(data, env, mod) : ''}	
		<div>
			${tpl.showprop('Модель', mod.model_title)}
			${tpl.showprop('Бренд', tpl.brandlink(data, env, mod))}
			${mod.discount ? tpl.showprop('Скидка', (mod.items.some(item => item.discount != mod.discount) ? "До " : "") + mod.discount + '%') : ''}
			<p>
				<i>${mod.Описание || ''}</i>
			</p>
			<p>${cards.basket(data, mod)}</p>
			${tpl.orderButton(data, env, mod)}
		</div>
	</div>
`
tpl.orderButton = (data, env, mod, item) => `
	<p>
		<button style="font-size:1.2rem;">${((item || mod).Цена) ? 'Сделать заказ' : 'Оставить запрос'}</button>
		<script>
			(btn => {
				btn.addEventListener('click', async () => {
					btn.disabled = true
					const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
					await Dialog.open({
						tpl:'/-catalog/order.html.js', 
						sub:'ROOT',
						json: '/-catalog/get-model?brand_nick=${mod.brand_nick}&model_nick=${mod.model_nick}&m&partner=${env.theme.partner ?? ''}'
					})
					btn.disabled = false
				})
			})(document.currentScript.previousElementSibling)
		</script>
	</p>
`











tpl.brandlink = (data, env, mod) => `
	<a href="${env.crumb.parent}${links.setm(data)}">${mod.brand_title}</a>
`

tpl.showitems = (data, env, mod) => `
	<table style="margin-top:2em">
		<thead><tr>${mod.item_props.map(tpl.itemhead).join('')}</tr></thead>
		<tbody>
			${mod.items.map(item => tpl.itembody(data, env, mod, item)).join('')}
		</tbody>
	</table>
	${mod.items.map(tpl.showItemDescription).join('')}
`
tpl.showItemDescription = item => item['Описание'] ? `
	<h2>${item.more.Позиция || item.more.Название || item.more.Арт || ''}</h2>
	<p>${item.Описание}</p>
` : ''
tpl.itemhead = (pr) => `<th>${pr.prop_title}</th>`
tpl.itembody = (data, env, mod, item) => `
	<tr>
		${mod.item_props.map(pr => tpl.itemprop(item, pr.prop_title)).join('')}
	</tr>
`
tpl.itemprop = (item, prop) => `
	<td>${common.propval(item,prop)}</td>
`
tpl.showprop = (prop_title, val) => `
	<div style="margin: 0.25rem 0; display: flex">
		<div style="padding-right: 0.5rem">${prop_title}:</div>
		<div>${val}</div>
	</div>
`
// tpl.props = (data, env, mod) => `
// 	<div>
// 		${mod.model_props.map(pr => {
// 			const val = common.prtitle(mod, pr)
// 			if (val == null) return ''
// 			return cards.prop.wrap(data, env, mod, pr, pr.prop_title, val)
// 		}).join('')}
// 	</div>
// `

tpl.props = (data, env, mod) => mod.model_props.length ? `
	<h2>Характеристики</h2>
	<table>
		${mod.model_props.map(pr => {
			const val = common.prtitle(mod, pr)
			if (val == null) return ''
			return tpl.showTrProp(data, env, pr, val)
		}).join('')}
	</table>
` : ''
tpl.showTrProp = (data, env, pr, val) => `
	<tr><th>${pr.prop_title}</th><td>${val}</td></tr>
`

// tpl.prop = {
// 	default: (data, env, mod, pr, title, val) => tpl.showprop(title, val),
// 	bold: (data, env, mod, pr, title, val) => cards.prop.default(data, mod, pr, title, `<b>${val}</b>`),
// 	brand: (data, env, mod, pr, title, val) => cards.prop.default(data, mod, pr, title, 
// 		`<a href="/catalog/${mod.brand_nick}">${mod.brand_title}</a>`
// 	),
// 	group: (data, env, mod, pr, title, val) => cards.prop.p(data, mod, pr, title, 
// 		`<a style="max-width:100%" href="/catalog/${mod.group_nick}"><span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block">${mod.group_title}</span></a>`
// 	),
// 	cost: (data, env, mod, pr, title, val) => cards.prop.bold(data, mod, pr, title, `${cost(val)}${common.unit()}`),
// 	hideable: (data, mod, pr, title, val) => cards.prop.default(data, mod, pr, title, val.length < 30 ? val : `
// 		<span class="a" onclick="this.style.display = 'none'; this.nextElementSibling.style.display = ''">Показать</span>
// 		<span onclick="this.style.display = 'none'; this.previousElementSibling.style.display = ''" style="display: none">${val}</span>
// 	`),
// 	link: (data, env, mod, pr, title, val) => cards.prop.default(data, mod, pr, title, 
// 		`<a href="/catalog/${links.addm(data)}more.${pr.prop_nick}::.${nicked(val)}=1">${val}</a>`
// 	),
// 	just: (data, env, mod, pr, title, val) => `
// 		<div style="margin: 0.25rem 0; display: flex">
// 			<div title="${common.prtitle(mod, pr)}" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
// 				${val}
// 			</div>
// 		</div>
// 	`,
// 	justlink: (data, env, mod, pr, title, val) => cards.prop.just(data, mod, pr, title, 
// 		`<a href="/catalog/${links.addm(data)}more.${pr.prop_nick}::.${nicked(val)}=1">${val}</a>`
// 	),
// 	amodel: (data, env, mod, pr, title, val) => cards.prop.just(data, mod, pr, title, 
// 		`<a href="/catalog/${mod.brand_nick}/${mod.model_nick}${links.setm(data)}">${mod.brand_title} ${mod.model_title}</a>`
// 	),
// 	p: (data, env, mod, pr, title, val) => `<div style="margin: 0.25rem 0;">${val}</div>`,
// 	empty: () => '',
// 	filter: (data, env, mod, pr, title, val) => cards.prop.default(data, env, mod, pr, title, 
// 		val.split(',').filter(r => r).map(value => `<a rel="nofollow" href="${links.val(data, env, mod, pr, value)}">${value}</a>`).join(', ')
// 	)

// }