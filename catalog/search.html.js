import cards from "/-catalog/cards.html.js"
import html from "/-words/html.js"
import dataenv from "/-words/dataenv.js"
import {words} from "/-words/words.js"
import ti from "/-words/ti.js"
import links from "/-catalog/links.html.js"
const search = {}
export default search

search.ROOT = () => `
	<div id="CATGROUPS"></div>
	<div id="page"><div id="CATPAG"></div></div>
	<div id="CATLIST"></div>
`
search.GROUPS = (data, env) => data.result ? `
	${search.title(data, env)}
	<div class="grid">
		<style>
			#${env.layer.div} > .grid {
				margin-bottom:2rem;
				display: grid; 
				grid-gap: 1rem; 
				grid-template-columns: 1fr 1fr;
			}
			@media (max-width: 768px) {
				#${env.layer.div} > .grid {
					display: grid; grid-gap: 1rem; grid-template-columns: 1fr;
				}
			}
		</style>
		<div style="display: grid; height: max-content; gap: 0.4em;">
			${ti.fi(data.childs.length, search.showgroups(data, env))}
		</div>
		<div id="FILTERS"></div>
	</div>
` : '<h1>Каталог</h1>'
search.PAGINATION = (data, env) => ti.bs(data.result) && `
	${search.pag(data, env, 'none')}
`
search.LIST = (data, env) => data.result ? `
	${data.list.length ? search.listcards(data, env) : 'К сожалению, ничего не найдено.'}
	${data.countonpage == data.list.length ? search.pag(data, env) : ''}
` : 'Данные не найдены'
search.pag = (data, env, scroll) => `
	<div class="pagination">
		<style>
			#${env.layer.div} .pagination {
				user-select: none;
				margin: 2rem 0; margin-left: auto; width: max-content;align-items: center; display: grid; 
				grid-template-columns: repeat(5, max-content); 
				gap:1rem
			}
			#${env.layer.div} .pagination .page {
				padding:0 1rem; border: solid 1px #aaa; color: white; font-size: 1.3rem; background-color: gray;
			}
			#${env.layer.div} .pagination .disabled {
				opacity: 0.5;
			}
			@media (max-width: 380px) {
				#${env.layer.div} .pagination {
					grid-template-columns: repeat(4, max-content); 
				}
				#${env.layer.div} .pagination .paglong {
					display: none;
				}
			}
		</style>
		<div class="begin">${search.pag[data.pagination.page != 1 ? 'link' : 'disabled'](data, env, scroll, 'В начало', 1)}</div>
		<div class="backward">${search.pag[data.pagination.page != 1 ? 'link' : 'disabled'](data, env, scroll, 'Назад', data.pagination.page - 1)}</div>
		<div class="page" title="" style="${data.pagination.last == 1 ? 'opacity:0.3' : ''}">${data.pagination.page}</div>
		<script>
			(async page => {
				//Передаём с кликом количество нужных карточек
				const numberOfCards = await import('/-catalog/numberOfCards.js').then(r => r.default)
				const words = await import('/-words/words.js').then(r => r.words)
				const count = numberOfCards(${data.limit})		
				page.title = "По "	+ count + ' ' + words(count, 'модели','модели','моделей') + ' на странице'
				
			})(document.currentScript.previousElementSibling)
		</script>
		<div class="forward">${search.pag[data.pagination.last > data.pagination.page ? 'link' : 'disabled'](data, env, scroll, 'Дальше', data.pagination.page + 1)}</div>
		<div class="paglong">${data.count} ${words(data.count,'модель','модели','моделей')}</div>
	</div>
`


search.pag.link = (data, env, scroll = '', title, page) => `
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
				a.href = "${env.crumb}" + getreq('${env.bread.get.m || ''}', '${page}') + "${!scroll?'#page':''}"	
			})
		})(document.currentScript.previousElementSibling)
	</script>
`
search.pag.disabled = (data, env, scroll, title) => `
	<span style="opacity: 0.3">${title}</span>
`
search.listcards = (data, env) => `	
	<div style="margin-top:1rem">
		${cards.LIST(data, env)}
	</div>
`
search.showgroups = (data, env) => `
	<style>
		#${env.layer.div} .mute {
			opacity: 0.3;
		}
		#${env.layer.div} a.selected {
			opacity: 1;
			color: inherit;
			border-color: transparent;
			font-weight: bold;
		}
		#${env.layer.div} .mute.selected {
			opacity: 0.9;
		}
	</style>
	${data.childs.map(g => search.group(data, env, g)).join('')}
`
const groupclass = (data, env, group) => {
	const selected = data.md.group?.[group.group_nick]
	return `class="${selected ? 'selected' :''} ${group.mute ? 'mute' :''}"`
}
search.group = (data, env, group) => `
	<div>
		<a ${groupclass(data, env, group)}
			data-scroll="none"
			href="${env.crumb.parent}/${group.group_nick}${links.setm(data)}">${group.group_title}</a>
	</div>
`

search.title = (data, env) => html`
	<style>
		#${env.layer.div} a.clearlink {
			white-space: normal; 
			gap:5px; 
			display: flex; 
			align-items: flex-start; color: inherit; 
			border: none; 
			text-decoration: none
		}
		#${env.layer.div} .clearlink .value {
			opacity: 1;
			transition: color 0.2s, opacity 0.2s;
		}
		#${env.layer.div} .clearlink .krest {
			transition: color 0.2s, opacity 0.2s;
			opacity: 0.6;
		}
		#${env.layer.div} .clearlink:hover .value {
			opacity: 0.5;
		}
		#${env.layer.div} .clearlink:hover .krest {
			opacity: 1;
			/*color: red;*/
		}
	</style>
	<div style="float:right; margin-top:1rem">${data.type}</div>
	${(!data.path.length && !data.md.m) || search.parenttitle(data, env)}
	
	<h1 style="display: flex; clear:both; gap:0 0.6ch; flex-wrap:wrap">
		${data.title.group_title}
		${!data.brand || search.titlepart(data, env, 'brand', data.brand.brand_title)}
		${!data.md.search || search.titlepart(data, env, 'search', data.md.search)}
		${!data.md.more || Object.keys(data.md.more).map(prop_nick => {
			const values = data.md.more[prop_nick]
			const prop = data.mdprops[prop_nick]
			if (prop.type == 'value') {
				return Object.keys(values).map(value_nick => {
					const value = data.mdvalues[value_nick]
					return search.choice.just(data, env, prop, value)
				}).join(', ')
			} else {
				return Object.keys(values).map(value_nick => {
					if (value_nick == 'from' || value_nick == 'upto') {
						return search.choice.just(data, env, prop, {value_nick, value_title: (value_nick == 'from' ? 'от ' : 'до ') + values[value_nick] + ' ' + (prop.opt.unit)})
					} else {
						return search.choice.just(data, env, prop, {value_nick, value_title: value_nick})
					}
				}).join(', ')
			}
		})}
	</h1>
`
search.choice = {
	"just": (data, env, prop, value) => `
		<a title="${prop.prop_title}" data-scroll="none" class="clearlink" 
			href="${env.crumb.parent}${links.addm(data)}more.${prop.prop_nick}.${value.value_nick}">
			<span class="value">${value.value_title}</span>
			<span class="krest" style="font-size:1rem; line-height: 2rem;">✕</span>
		</a>
	`
}
search.titlepart = (data, env, part, value) => `
	<a data-scroll="none" class="clearlink" 
		href="${env.crumb.parent}${links.addm(data)}${part}">
		<span class="value">${value}</span>
		<span class="krest" style="font-size:1rem; line-height: 2rem;">✕</span>
	</a>
`
search.parenttitle = (data, env) => `
	<div style="float:left; margin-top:1rem">
		<a data-scroll="none" href="${env.crumb.parent}${search.toplink(data, env)}">${data.parent.group_title}</a>
	</div>
`
search.toplink = (data, env) => {
	if (data.parent.parent_id) {
		return '/' + data.parent.group_nick+links.setm(data)
	} else {
		return data.title.parent_id ? links.addm(data)+'group' : ''
	}
}
