import cards from "/-catalog/cards.html.js"
import nicked from "/-nicked"
import { cost } from "/-words/cost.js"
import links from "/-catalog/links.html.js"
import common from "/-catalog/common.html.js"
import ti from "/-words/ti.js"

const model = {}
export default model

model.ROOT = (data, env, { mod } = data) => `
	${data.result ? model.showmodel(data, env, data) : model.showerror(data, env)}
`
model.showerror = (data, env) => `
	<div style="float:left; margin-top:1rem">
		<a href="${env.crumb.parent}${links.setm(data)}">${data.brand?.brand_title ?? env.crumb.parent.name}</a>
	</div>
	<h1 style="clear:both"><b>${env.crumb.parent.name} ${env.crumb.name}</b></h1>
	<p>
		Модель в магазине не найдена
	</p>
`
model.showmodel = (data, env, { mod } = data) =>
`
	<div style="float:left; margin-top:1rem; margin-bottom:1rem"><a href="${env.crumb.parent.parent}${mod.parent_id ? '/'+mod.group_nick : ''}${links.setm(data)}">${mod.group_title}</a></div>
	<h1 style="clear:both">${cards.name(data, mod)}</h1>
	
	${model.common(data, env, mod)}
	<div style="margin-bottom:2rem">
		${mod['Скрыть фильтры'] ? '' : model.props(data, mod)}
		${mod.item_props.length ? model.items(data, mod) : ''}
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
		${ti.ar(mod.files).map(filerow).join('')}
	</div>
	<!-- <pre>${JSON.stringify(mod, "\n", 2)}</pre> -->
`
const filerow = f => `
	<div style="display: grid; align-items: center; grid-template-columns: max-content 1fr; gap: 0.5rem; margin-bottom:0.5rem">
		<img width="20" load="lazy" src="/file-icon-vectors/dist/icons/vivid/${f.ext}.svg"> 
		<a target="about:blank" href="${f.dir + f.file}">${f.name}</a>
	</div>
`
model.showGallery = (data, env, mod) => `
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
			<img alt="" style="max-width: 100%; max-height: 100%" 
				srcset="
					/-imager/webp?cache&h=500&fit=inside&src=${encodeURIComponent(mod.images[0])} 1x,
					/-imager/webp?cache&h=1000&fit=inside&src=${encodeURIComponent(mod.images[0])} 1.5x,
					/-imager/webp?cache&h=1500&fit=inside&src=${encodeURIComponent(mod.images[0])} 3x
				"
			>
		</div>
		<div class="imagemin_showgallery">
			<div class="imagemin_gallery">
				${mod.images.length > 1 ? mod.images.map(model.showimage).join('') : ''}
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
					bigimg.srcset = '/-imager/webp?h=500&src='+file+' 1x,/-imager/webp?h=750&src='+file+' 1.5x,/-imager/webp?h=1000&src='+file+' 2x,/-imager/webp?h=1500&src='+file+' 3x,/-imager/webp?h=2000&src='+file+' 4x'
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
model.showimage = (src, i) => `	
	<div data-file="${src}" class="imagemin ${i === 0 ? 'selected' : ''}">
		<img width="150" height="150" loading="lazy" alt="" style="max-width: 100%; height:auto" src="/-imager/webp?cache&w=90&h=90&src=${src}">
	</div>
`
model.common = (data, env, mod) => `
	
	${cards.badgecss(data, env)}
	<div style="float: right;">${mod.Наличие || mod.discount ? cards.badgenalichie(data, mod) : ''}</div>
	
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
		
			${mod.images ? model.showGallery(data, env, mod) : ''}	

		<div class="textcontent">
			${model.showprop('Модель', mod.model_title)}
			${model.showprop('Бренд', brandlink(data, env, mod))}
			
			<p>
				<i>${mod.Описание || ''}</i>
			</p>
			<p>${cards.basket(data, mod)}</p>
			<p>
				<button style="font-size:1.4rem; margin:1rem 0">Сделать заказ</button>
				<script>
					(async btn => {
						btn.addEventListener('click', async () => {
							btn.disabled = true
							const { Dialog } = await import('/-dialog/Dialog.js')
							await Dialog.open({
								tpl:'/-catalog/order.html.js', 
								sub:'ROOT',
								json: '${env.layer.json}'
							})
							btn.disabled = false
						})
					})(document.currentScript.previousElementSibling)
				</script>
			</p>
		</div>
	</div>
`











const brandlink = (data, env, mod) => `
	<a href="${env.crumb.parent}${links.setm(data)}">${mod.brand_title}</a>
`

model.items = (data, mod) => `
	<table class="table" style="margin-top:2em">
		<tr>${mod.item_props.map(model.itemhead).join('')}</tr>
		${mod.items.map(item => model.itembody(data, mod, item)).join('')}
	</table>
`
model.itemhead = (pr) => `<td>${pr.prop_title}</td>`
model.itembody = (data, mod, item) => `
	<tr>
		${mod.item_props.map(pr => model.itemprop(item, pr.prop_title)).join('')}
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
		${mod.model_props.map(pr => {
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