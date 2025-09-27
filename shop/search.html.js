import cards from "/-shop/cards.html.js"
import words from "/-words/words.js"
import err from "/-controller/err.html.js"
import ddd from "/-words/date.html.js"
import Ecommerce from "/-shop/Ecommerce.js"
const tpl = {}
export default tpl


tpl.ROOT = (data, env) => `
	<div id="SHOP_TITLE">${tpl.TITLE(data, env)}</div>
	<div class="grid">
		<style>
			${env.scope} > .grid {
				margin-bottom:2rem;
				display: grid; 
				grid-gap: 1rem; 
				grid-template-columns: 1fr 1fr;
			}
			@media (max-width: 768px) {
				${env.scope} > .grid {
					display: grid; 
					grid-gap: 1rem; 
					grid-template-columns: 1fr;
				}
			}
		</style>
		<div id="SHOP_GROUPS"></div>
		<div id="SHOP_FILTERS"></div>
	</div>
	<div id="page"><div id="SHOP_PAG"></div></div>
	<div id="SHOP_LIST"></div>
	<article style="margin-top:4em; margin-bottom: 4em" id="SHOP_PAGE">${data.text || ''}</article>
`


tpl.GROUPS = (data, env) => !data.result ? '' : `
	<div style="display: grid; height: max-content; gap: 0.4em;">
		${data.childs.length ? tpl.showGroups(data, env) : ''}
	</div>
`

tpl.PAGINATION = (data, env) => !data.result ? '' : `
	${tpl.pag(data, env, 'none')}
`
tpl.LIST = (data, env) => data.result ? `
	${data.list.length ? tpl.listcards(data, env) : '<div style="margin: 2rem 0; ">К сожалению, ничего не найдено.</div>'}
	${data.countonpage == data.list.length ? tpl.pag(data, env) : ''}
` : '<div style="margin: 2rem 0; ">Данные не найдены</div>'

tpl.pag = (data, env, scroll) => `
	<div class="pagination">
		<style>
			${env.scope} .pagination {
				user-select: none;
				margin: 2rem 0; 
				width: max-content;
				align-items: center; display: grid; 
				grid-template-columns: 1fr repeat(5, max-content); 
				width:100%;
				gap:1rem
			}
			${env.scope} .pagination .page {
				padding:0 1rem; 
				border: solid 1px #aaa; color: white; 
				font-size: 1.3rem; 
				background-color: gray;
				min-width:4.2ch;
				text-align: center;
			}
			${env.scope} .sort {
				text-align:right;
			}
			${env.scope} .pagination .disabled {
				opacity: 0.5;
			}
			/*@media (max-width: 380px) {
				${env.scope} .pagination .disabled {
					display: none;
				}
			}*/
			@media (max-width: 360px) {
				${env.scope} .pagination {
					gap:0.5rem
				}
			}
			@media (max-width: 330px) {
				${env.scope} .pagination {
					font-size:10px;
				}
			}
			@media (max-width: 600px) {
				${env.scope} .pagination {
					grid-template-columns: 1fr repeat(4, max-content); 
				}
				${env.scope} .pagination .paglong {
					display: none;
				}
			}
		</style>
		<div class="sort" style="white-space: nowrap;">${!scroll ? '' : sortIcon(data, env)}</div>
		<div class="begin ${data.pagination.page != 1 ? '' : 'disabled'}">${tpl.pagt[data.pagination.page != 1 ? 'link' : 'disabled'](data, env, scroll, 'В начало', 1)}</div>
		<div class="backward ${data.pagination.page != 1 ? '' : 'disabled'}">${tpl.pagt[data.pagination.page != 1 ? 'link' : 'disabled'](data, env, scroll, 'Назад', data.pagination.page - 1)}</div>
		<div class="page ${data.pagination.last == 1 ? 'disabled' : ''}" title="">${data.pagination.page}</div>
		<script>
			(async page => {
				//Передаём с кликом количество нужных карточек
				const words = await import('/-words/words.js').then(r => r.words)
				const Card = await import('/-shop/Card.js').then(r => r.default)
				const count = Card.numberOfCards(${data.conf.limit})
				page.title = "По "	+ count + ' ' + words(count, 'модели','модели','моделей') + ' на странице'
				
			})(document.currentScript.previousElementSibling)
		</script>
		<div class="forward ${data.pagination.last > data.pagination.page ? '' : 'disabled'}">${tpl.pagt[data.pagination.last > data.pagination.page ? 'link' : 'disabled'](data, env, scroll, 'Дальше', data.pagination.page + 1)}</div>
		<div class="paglong">${data.modcount} ${words(data.modcount,'модель','модели','моделей')}</div>
	</div>
`
const sortIcon = (data, env) => {
	//if (data.modcount == 1) return ''
	if (!~data.group.filter_nicks.indexOf('cena') && !data.md.mget.cena) return ''
	let href, title
	
	if (data.md.mget.cena?.upto != null) {
		title = 'дороже'
		const number = data.md.mget.cena.upto
		href = cards.addget(env.bread.get, {m:data.md.m + ':cena::.from='+(number >= data.filtercost.max ? data.filtercost.min : number), p:null})
	} else if (data.md.mget.cena?.from != null) {
		title = 'дешевле'
		const number = data.md.mget.cena.from
		href = cards.addget(env.bread.get, {m:data.md.m + ':cena::.upto='+ (number <= data.filtercost.min ? data.filtercost.max : number), p:null})
	} else {
		title = ''
		href = cards.addget(env.bread.get, {m:data.md.m + ':cena::.from='+data.filtercost.min, p:null})
	}
	
	return `
		<a data-scroll="none" href="${href}">⇅ ${title}</a>
	`
}
tpl.pagt = {}
tpl.pagt.link = (data, env, scroll = '', title, page) => `
	<a href="${cards.addget(env.bread.get, {p:page, count: env.bread.get.count || data.conf.limit})}" data-scroll="${scroll}">${title}</a>
	<script>
		(async a => {
			//Передаём с кликом количество нужных карточек
			const Card = await import('/-shop/Card.js').then(r => r.default)
			const onload = await import('/-words/onload.js').then(r => r.default)
			const cards = await import('/-shop/cards.html.js').then(r => r.default)
			onload(async () => {
				const count = Card.numberOfCards(${data.conf.limit})
				const Client = await window.getClient()
				a.href = cards.addget(Client.bread.get, {p:${page}, count}) + "${!scroll?'#page':''}"
			})
		})(document.currentScript.previousElementSibling)
	</script>
`
tpl.pagt.disabled = (data, env, scroll, title) => `
	<span>${title}</span>
`


tpl.listcards = (data, env) => {
	// const products = data.list.map((model, index) => {
	// 	return model.items.map(item => Ecommerce.getProduct(data, {
	// 		coupon:env.theme.partner,
	// 		item, 
	// 		listname: 'Каталог', 
	// 		group_nick: model.groups[0],
	// 		position: index + 1
	// 	}))
	// }).flat()
	const products = data.list.map((model, i) => {
		return Ecommerce.getProduct(data, {
			coupon:env.theme.partner,
			item: model.items[0], 
			listname: 'Каталог', 
			group_nick: model.groups[0],
			position: i + 1
		})
	})

	return `
		<div style="margin-top:1rem; margin-bottom: 2rem">
			${cards.LIST(data, env)}
		</div>
		<script type="module">
			import Ecommerce from "/-shop/Ecommerce.js"
			import Card from "/-shop/Card.js"

			const limit = Card.numberOfCards(${data.conf.limit})
			const count = Math.min(limit, ${data.list.length})
			const products = ${JSON.stringify(products)}.filter(product => product.position <= count)
			Ecommerce.impressions(products)
		</script>
	`
}
tpl.showGroups = (data, env) => `
	<style>
		${env.scope} .mute {
			opacity: 0.5;
		}
		${env.scope} a.selected {
			opacity: 1;
			color: inherit;
			border-color: transparent;
			font-weight: bold;
		}
		${env.scope} .mute.selected {
			opacity: 0.9;
		}
	</style>
	${data.childs.map(group_nick => tpl.showGroupItem(data, env, group_nick)).join('')}
`

tpl.showGroupItem = (data, env, group_nick) => `
	<div>
		<a class="${data.group.group_nick == group_nick ? 'selected' :''} ${data.modcounts[group_nick] ? '' :'mute'}"
			data-scroll="none"
			href="${cards.getGroupPath(data, group_nick)}${cards.addget(env.bread.get, {m:data.md.m})}">${data.groups[group_nick].group_title}</a>
	</div>
`






tpl.TITLE = (data, env) => err(data, env) || `
	<style>
		${env.scope} a.clearlink {
			white-space: normal; 
			gap:5px; 
			display: inline-flex; 
			align-items: flex-start; color: inherit; 
			border: none; 
			text-decoration: none
		}
		${env.scope} .clearlink .value {
			opacity: 1;
			transition: color 0.2s, opacity 0.2s;
		}
		${env.scope} .clearlink .krest {
			transition: color 0.2s, opacity 0.2s;
			opacity: 0.6;
		}
		${env.scope} .clearlink:hover .value {
			opacity: 0.5;
		}
		${env.scope} .clearlink:hover .krest {
			opacity: 1;
			/*color: red;*/
		}
	</style>

	<div style="margin: 1em 0 0.5em">
		${tpl.showParentLink(data, env) || '&nbsp;'}
	</div>
	<h1 style="margin-top:0">${tpl.getTitleH1(data, env.bread)}</h1>
`
tpl.getTitleH1 = (data, bread) => `
	${data.group.group_title}
	${tpl.showPart(data, bread, data.md.query, {query: null})}
	${tpl.showSelected(data, bread)}
`
tpl.showSelected = (data, bread) => {
	return Object.keys(data.md.mget || {}).map(prop_nick => {
		const values = data.md.mget[prop_nick]
		const prop = data.props[prop_nick]

		if (values == 'empty') {
			const title = {'cena':'Без цен', 'images':'Без картинок'}[prop_nick] || prop.name + ' отсутствует' 
			return tpl.showPart(data, bread, title, {m: data.md.m + ':' + prop_nick})
		} else if (values == 'any') {
			const title = {'cena':'С ценой', 'images':'С картинками'}[prop_nick] || prop.name + ' указано' 
			return tpl.showPart(data, bread, title, {m: data.md.m + ':' + prop_nick})
		} else if (typeof(values) == 'object') {
			if (prop.type == 'value') {
				return Object.keys(values).map(value_nick => {
					const title = data.values[value_nick]?.value_title || value_nick
					const m = data.md.m + ':' + prop_nick + '.' + value_nick
					return tpl.showPart(data, bread, title, {m})
				}).join(' ')
			} else if (prop.type == 'number'){
				return Object.keys(values).map(value_nick => {
					const get = {m:data.md.m + ':' + prop_nick + '.' + value_nick}
					
					if (value_nick == 'from' || value_nick == 'upto') {
						const title = (values[value_nick] / 10 ** prop.scale) + cards.unit(prop)
						return tpl.showPart(data, bread, (value_nick == 'from' ? 'от ' : 'до ') + title, get)
					} else {
						const title = (value_nick / 10 ** prop.scale) + cards.unit(prop)
						return tpl.showPart(data, bread, title, get)
					}
				}).join(' ')
			}
		}
	}).join('')
}
// tpl.choice = {
// 	"just": (data, env, prop, value) => `
// 		<a data-scroll="none" class="clearlink" title="${prop.prop_title}" 
// 			href="${env.crumb}${data.md.m + (data.md.m ? ':' : '')}more.${prop.prop_nick}${value?.value_nick ? '.' : ''}${value?.value_nick || ''}">
// 			<span class="value">${value?.value_title || ({'cena':'Без цен', 'images':'Без картинок'})[prop.prop_nick] || 'Нет значения'}</span>
// 			<span class="krest" style="font-size:1rem; line-height: 2rem;">✕</span>
// 		</a>
// 	`
// }



tpl.showPart = (data, bread, title, params) => !title ? '' : `
	<a data-scroll="none" class="clearlink"
		href="${cards.getGroupPath(data, data.group.group_nick)}${cards.addget(bread.get, params)}">
		<span class="value">${title}</span>
		<span class="krest" style="font-size:1rem; line-height: 2rem;">✕</span>
	</a>
`
tpl.showParentLink = (data, env) => data.group.group_nick == data.conf.root_nick ? '' : `
	<a data-scroll="none" href="${cards.getParentPath(data, data.group)}${cards.addget(env.bread.get, {m:data.md.m, page: null})}">${data.group.parent_title}</a>
`
