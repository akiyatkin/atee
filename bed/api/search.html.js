import cards from "/-bed/api/cards.html.js"
import words from "/-words/words.js"
import links from "/-catalog/links.html.js"
import err from "/-controller/err.html.js"
import addget from '/-sources/addget.js'
const tpl = {}
export default tpl


tpl.ROOT = () => `
	<div id="BED_GROUPS"></div>
	<div id="page"><div id="BED_PAG"></div></div>
	<div id="BED_LIST"></div>
	<article style="margin-top:4em; margin-bottom: 4em" id="BED_PAGE"></article>
`

tpl.GROUPS = (data, env) => data.result ? `
	${tpl.title(data, env)}
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
		<div style="display: grid; height: max-content; gap: 0.4em;">
			${data.childs.length ? tpl.showgroups(data, env) : ''}
		</div>
		<div id="BED_FILTERS"></div>
	</div>
` : `
	<h1>${data.root_title}</h1><div id="BED_FILTERS"></div>
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
				const numberOfCards = await import('/-catalog/numberOfCards.js').then(r => r.default)
				const words = await import('/-words/words.js').then(r => r.words)
				const count = numberOfCards(${data.limit})		
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
			const numberOfCards = await import('/-catalog/numberOfCards.js').then(r => r.default)
			const onload = await import('/-words/onload.js').then(r => r.default)
			const getreq = (m, page) => {
				const reqs = []
				if (m) reqs.push('m=' + m)
				if (page > 1) {
					reqs.push('page=' + page)
					const count = numberOfCards(${data.limit})
					if (count) reqs.push('count=' + count)
				}
				if (!reqs.length) return ''
				return '?' + reqs.join('&')
			}
			onload(() => {
				a.href = "${env.crumb.child || links.root}" + getreq('${data.m || ''}', '${page}') + "${!scroll?'#page':''}"	
			})
		})(document.currentScript.previousElementSibling)
	</script>
`
tpl.pagt.disabled = (data, env, scroll, title) => `
	<span style="opacity: 0.5">${title}</span>
`


tpl.listcards = (data, env) => {

	const impressions = data.list.map((mod) => {
		const impression = {
			"id": mod.model_nick,
			"name" : mod.cols['Наименование'] || mod.model_title,
			"price": mod.cols['Цена'] || mod.min || '',
			"brand": mod.cols['Бренд'] || '',
			"category": data.group.group_title,
			"position": 1,
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
				const numberOfCards = await import('/-catalog/numberOfCards.js').then(r => r.default)
				const limit = numberOfCards(${data.limit})
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
tpl.showgroups = (data, env) => `
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
	${data.childs.map(g => tpl.group(data, env, g)).join('')}
`
const groupclass = (data, env, group) => {
	const selected = data.md.group.group_nick == group.group_nick
	return `class="${selected ? 'selected' :''} ${group.mute ? 'mute' :''}"`
}
tpl.group = (data, env, group) => `
	<div>
		<a ${groupclass(data, env, group)}
			data-scroll="none"
			href="${env.crumb.parent}/${group.group_nick}${links.setm(data)}">${group.group_title}</a>
	</div>
`

tpl.title = (data, env) => `
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
	<div style="float:left; margin-top:1rem">
		${(!data.group.parent_title && !data.md.m) ? '<a href="/"><br></a>' : tpl.parenttitle(data, env)}
	</div>
	
	<h1 style="clear:both;">
		${data.group.group_title}
		${data.search ? tpl.titlepart(data, env, 'search', data.search) : ''}
		${data.md.mget ? tpl.showSelected(data, env) : ''}
	</h1>
	<script>
		(async div => {
			const addget = await import('/-sources/addget.js').then(r => r.default)
			const listen = (e) => {
				if (!div.closest('body')) return window.removeEventListener('crossing', listen)
				const {theme, bread} = e.detail
				const aa = div.getElementsByTagName('a')
				for (const a of aa) {
					const search = a.dataset.search
					if (!search) continue
					const params = {search, m:"${data.m}"}
					a.href = 'sheet' + addget(params, new URLSearchParams(window.location.search))
				}
				const origin = location.href
				let r = false
				for (const a of aa) {
					if (a.href != origin) continue
					r = a
				}

				if (r) for (const a of aa) {
					if (a === r) a.classList.add('active')
					else a.classList.remove('active')
				}
			}
			window.addEventListener('crossing', listen)
		})(document.currentScript.previousElementSibling)
	</script>
`
tpl.showSelected = (data, env) => {
	return Object.keys(data.md.mget).map(prop_nick => {
		const values = data.md.mget[prop_nick]
		const prop = data.md.props[prop_nick]

		if (values == 'empty') {
			return tpl.choice.just(data, env, prop)
		} else if (typeof(values) !== 'object') {

		} else {
			if (prop.type == 'value' || prop.type == 'number') {
				return Object.keys(values).map(value_nick => {
					const value = data.md.values[value_nick]
					return tpl.choice.just(data, env, prop, value)
				}).join(' ')
			} else {
				return Object.keys(values).map(value_nick => {
					if (value_nick == 'from' || value_nick == 'upto') {
						return tpl.choice.just(data, env, prop, {value_nick, value_title: (value_nick == 'from' ? 'от ' : 'до ') + values[value_nick] + ' ' + (prop.unit)})
					} else {
						return tpl.choice.just(data, env, prop, {value_nick, value_title: value_nick})
					}
				}).join(' ')
			}
		}
	}).join('')
}
tpl.choice = {
	"just": (data, env, prop, value) => `
		<a title="${prop.prop_title}" data-scroll="none" class="clearlink" 
			href="${env.crumb}${links.addm(data)}more.${prop.prop_nick}${value?.value_nick ? '.' : ''}${value?.value_nick || ''}">
			<span class="value">${value?.value_title || ({'cena':'Без цен', 'images':'Без картинок'})[prop.prop_nick] || 'Нет значения'}</span>
			<span class="krest" style="font-size:1rem; line-height: 2rem;">✕</span>
		</a>
	`
}
tpl.titlepart = (data, env, part, value) => `
	<a data-scroll="none" class="clearlink" 
		href="${env.crumb}${addget({search: null}, env.bread.get)}"
		href2="${env.crumb}${links.addm(data)}${part}">
		<span class="value">${value}</span>
		<span class="krest" style="font-size:1rem; line-height: 2rem;">✕</span>
	</a>
`
tpl.parenttitle = (data, env) => `
	<a data-scroll="none" href="${env.crumb.parent}${tpl.toplink(data, env)}">${data.group.parent_title}</a>
`
tpl.toplink = (data, env) => {
	if (data.group.parent_id) {
		return '/' + data.group.parent_nick + links.setm(data)
	} else {
		return ''
	}
}
