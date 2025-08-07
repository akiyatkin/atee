import cards from "/-shop/cards.html.js"
import words from "/-words/words.js"
import err from "/-controller/err.html.js"
import ddd from "/-words/date.html.js"
const tpl = {}
export default tpl


tpl.ROOT = (data, env) => `
	<div id="SHOP_TITLE"></div>
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
	<article style="margin-top:4em; margin-bottom: 4em" id="SHOP_PAGE"></article>
`


tpl.GROUPS = (data, env) => !data.result ? '' : `
	<div style="display: grid; height: max-content; gap: 0.4em;">
		${data.childs.length ? tpl.showGroups(data, env) : ''}
	</div>
`
tpl.PAGINATION = (data, env) => data.result && `
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
				margin-left: auto; 
				width: max-content;
				align-items: center; display: grid; 
				grid-template-columns: repeat(5, max-content); 
				gap:1rem
			}
			${env.scope} .pagination .page {
				padding:0 1rem; border: solid 1px #aaa; color: white; font-size: 1.3rem; background-color: gray;
			}
			${env.scope} .pagination .disabled {
				opacity: 0.5;
			}
			@media (max-width: 380px) {
				${env.scope} .pagination {
					grid-template-columns: repeat(4, max-content); 
				}
				${env.scope} .pagination .paglong {
					display: none;
				}
			}
		</style>
		<div class="begin">${tpl.pagt[data.pagination.page != 1 ? 'link' : 'disabled'](data, env, scroll, 'В начало', 1)}</div>
		<div class="backward">${tpl.pagt[data.pagination.page != 1 ? 'link' : 'disabled'](data, env, scroll, 'Назад', data.pagination.page - 1)}</div>
		<div class="page" title="" style="${data.pagination.last == 1 ? 'opacity:0.5' : ''}">${data.pagination.page}</div>
		<script>
			(async page => {
				//Передаём с кликом количество нужных карточек
				const words = await import('/-words/words.js').then(r => r.words)
				const Card = await import('/-shop/Card.js').then(r => r.default)
				const count = Card.numberOfCards(${data.limit})
				page.title = "По "	+ count + ' ' + words(count, 'модели','модели','моделей') + ' на странице'
				
			})(document.currentScript.previousElementSibling)
		</script>
		<div class="forward">${tpl.pagt[data.pagination.last > data.pagination.page ? 'link' : 'disabled'](data, env, scroll, 'Дальше', data.pagination.page + 1)}</div>
		<div class="paglong">${data.count} ${words(data.count,'модель','модели','моделей')}</div>
	</div>
`

tpl.pagt = {}
tpl.pagt.link = (data, env, scroll = '', title, page) => `
	<a data-scroll="${scroll}">${title}</a>
	<script>
		(async a => {
			//Передаём с кликом количество нужных карточек
			const Card = await import('/-shop/Card.js').then(r => r.default)
			const onload = await import('/-words/onload.js').then(r => r.default)
			const getreq = (m, page) => {
				const reqs = []
				if (m) reqs.push('m=' + m)
				if (page > 1) {
					reqs.push('page=' + page)
					const count = Card.numberOfCards(${data.limit})
					if (count) reqs.push('count=' + count)
				}
				if (!reqs.length) return ''
				return '?' + reqs.join('&')
			}
			onload(() => {
				a.href = "${cards.getGroupPath(data, env, data.group)}" + getreq('${data.m || ''}', '${page}') + "${!scroll?'#page':''}"	
			})
		})(document.currentScript.previousElementSibling)
	</script>
`
tpl.pagt.disabled = (data, env, scroll, title) => `
	<span style="opacity: 0.5">${title}</span>
`


tpl.listcards = (data, env) => {
	
	const impressions = data.list.map((mod, index) => {
		const gain = (name) => cards.gainFirstTitle(data, env, mod.recap, name)
		const impression = {
			"id": mod.recap.model[0],
			"name" : gain('naimenovanie') || gain('model'),
			"price": gain('cena'),
			"brand": gain('brend'),
			"category": data.group.group_title,
			"position": index + 1,
			"list": "Каталог"
		}
		return impression
	})

	return `
		<div style="margin-top:1rem; margin-bottom: 2rem">
			${cards.LIST(data, env)}
		</div>
		<script>
			(async div => {
				const Card = await import('/-shop/Card.js').then(r => r.default)
				const limit = Card.numberOfCards(${data.limit})
				const count = Math.min(limit, ${data.list.length})
				window.dataLayer = window.dataLayer || []
				const impressions = ${JSON.stringify(impressions)}.slice(0, count)
				dataLayer.push({
					"ecommerce": {
						"currencyCode": "RUB",
						impressions
					}
				})
			})(document.currentScript.previousElementSibling)
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
	${data.childs.map(g => tpl.showGroupItem(data, env, g)).join('')}
`

tpl.showGroupItem = (data, env, group) => `
	<div>
		<a class="${data.group.group_nick == group.group_nick ? 'selected' :''} ${group.modcount ? '' :'mute'}"
			data-scroll="none"
			href="${cards.getGroupPath(data, env, group)}${data.md.m ? '?m=' + data.md.m : ''}">${group.group_title}</a>
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
		${env.scope} .clearlink .title {
			opacity: 1;
			transition: color 0.2s, opacity 0.2s;
		}
		${env.scope} .clearlink .krest {
			transition: color 0.2s, opacity 0.2s;
			opacity: 0.6;
		}
		${env.scope} .clearlink:hover .title {
			opacity: 0.5;
		}
		${env.scope} .clearlink:hover .krest {
			opacity: 1;
			/*color: red;*/
		}
	</style>

	<div style="margin: 1em 0 0.5em">
		${tpl.showParentLink(data, env)}
	</div>
	<h1 style="margin-top:0">
		${data.group.group_title}
		${tpl.showPart(data, env, data.md.query, {query: null})}
		${tpl.showSelected(data, env)}
	</h1>
`
tpl.showSelected = (data, env) => {
	return Object.keys(data.md.mget || {}).map(prop_nick => {
		const values = data.md.mget[prop_nick]
		const prop = data.props[prop_nick]

		if (values == 'empty') {
			const title = {'cena':'Без цен', 'images':'Без картинок'}[prop_nick] || prop.prop_title + ' отсутствует' 
			return tpl.showPart(data, env, title, {m: data.md.m + ':' + prop_nick})
		} else if (typeof(values) == 'object') {
			if (prop.type == 'value') {
				return Object.keys(values).map(value_nick => {
					const title = data.values[value_nick].value_title
					const m = data.md.m + ':' + prop_nick + '.' + value_nick
					return tpl.showPart(data, env, title, {m})
				}).join(' ')
			} else if (prop.type == 'number'){
				return Object.keys(values).map(value_nick => {
					const get = {m:data.md.m + ':' + prop_nick + '.' + value_nick}
					
					if (value_nick == 'from' || value_nick == 'upto') {
						const title = values[value_nick] + cards.unit(prop)
						return tpl.showPart(data, env, (value_nick == 'from' ? 'от ' : 'до ') + title, get)
					} else {
						const title = value_nick + cards.unit(prop)
						return tpl.showPart(data, env, title, get)
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
// 			<span class="title">${value?.value_title || ({'cena':'Без цен', 'images':'Без картинок'})[prop.prop_nick] || 'Нет значения'}</span>
// 			<span class="krest" style="font-size:1rem; line-height: 2rem;">✕</span>
// 		</a>
// 	`
// }



tpl.showPart = (data, env, title, get) => !title ? '' : `
	<a data-scroll="none" class="clearlink"
		href="${cards.getGroupPath(data, env, data.group)}${cards.addget(data, env, get)}">
		<span class="title">${title}</span>
		<span class="krest" style="font-size:1rem; line-height: 2rem;">✕</span>
	</a>
`
tpl.showParentLink = (data, env) => data.group.group_nick == data.conf.root_nick ? '' : `
	<a data-scroll="none" href="${cards.getParentPath(data, env, data.group)}${cards.addget(data, env, {m:data.md.m, page: null})}">${data.group.parent_title}</a>
`
