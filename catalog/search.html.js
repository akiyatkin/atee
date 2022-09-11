import cards from "/-catalog/cards.html.js"
import html from "/-words/html.js"
import dataenv from "/-words/dataenv.js"
import {words} from "/-words/words.js"
import links from "/-catalog/links.html.js"
const search = {}
export default search

search.ROOT = () => html`
	<div id="CATGROUPS"></div>
	<div id="page"><div id="CATPAG"></div></div>
	<div id="CATLIST"></div>
`
search.GROUPS = (data, env) => html`
	${search.title(data, env)}
	${!data.childs.length || search.groups(data, env)}
`
search.PAGINATION = (data, env) => `
	${search.pag(data, env, 'none')}
`
search.LIST = (data, env) => html`
	<style>
		#{env.layer.div} .pagination {
			user-select: none;
			margin: 2rem 0; margin-left: auto; width: max-content;align-items: center; display: grid; 
			grid-template-columns: repeat(5, max-content); 
			gap:1rem
		}
		#{env.layer.div} .pagination .page {
			padding:0 1rem; border: solid 1px #aaa; color: white; font-size: 1.3rem; background-color: gray;
		}
		#{env.layer.div} .pagination .disabled {
			opacity: 0.5;
		}
		@media (max-width: 380px) {
			#{env.layer.div} .pagination {
				grid-template-columns: repeat(4, max-content); 
			}
			#{env.layer.div} .pagination .paglong {
				display: none;
			}
		}
	</style>
	
	${data.list.length ? search.list(data, env) : 'К сожалению, ничего не найдено.'}
	${data.countonpage == data.list.length ? search.pag(data, env) : ''}
`
search.pag = (data, env, scroll) => `
	<div class="pagination">
		<div class="begin">${search.pag[data.pagination.page != 1 ? 'link' : 'disabled'](data, env, scroll, 'В начало', 1)}</div>
		<div class="backward">${search.pag[data.pagination.page != 1 ? 'link' : 'disabled'](data, env, scroll, 'Назад', data.pagination.page - 1)}</div>
		<div class="page" style="${data.pagination.last == 1 ? 'opacity:0.3' : ''}">${data.pagination.page}</div>
		<div class="forward">${search.pag[data.pagination.last > data.pagination.page ? 'link' : 'disabled'](data, env, scroll, 'Дальше', data.pagination.page + 1)}</div>
		<div class="paglong">${data.count} ${words(data.count,'моделя','модели','моделей')}</div>
	</div>
`
search.pag.link = (data, env, scroll = '', title, page) => `
	<a data-scroll="${scroll}" href="${env.crumb}${env.bread.get.m ? '?m='+env.bread.get.m : ''}${page > 1 ? ((env.bread.get.m ? '&':'?') + 'page=' + page) : ''}${!scroll?'#page':''}">${title}</a>
`
search.pag.disabled = (data, env, scroll, title) => `
	<span style="opacity: 0.3">${title}</span>
`
search.list = (data, env) => `	
	<div style="margin-top:1rem">
		${cards.LIST(data, env)}
	</div>
`
search.groups = (data, env) => html`
	<div style="margin-bottom:2rem">
		${data.childs.map(g => search.group(data, env, g))}
	</div>
`
search.group = (data, env, group) => html`
	<div>
		<a href="${env.crumb.parent}/${group.group_nick}${links.setm(data)}">${group.group_title}</a>
	</div>
`

search.title = (data, env) => html`
	<div style="float:right; margin-top:1rem">${data.type}</div>
	${(!data.path.length && !env.bread.get.m) || search.parenttitle(data, env)}
	<style>
		a.clearlink {
			white-space: normal; 
			gap:5px; 
			display: flex; 
			align-items: flex-start; color: inherit; 
			border: none; 
			text-decoration: none
		}
		.clearlink .value {
			opacity: 1;
			transition: color 0.2s, opacity 0.2s;
		}
		.clearlink .krest {
			transition: color 0.2s, opacity 0.2s;
			opacity: 0.4;
		}
		.clearlink:hover .value {
			opacity: 0.5;
		}
		.clearlink:hover .krest {
			opacity: 1;
			/*color: red;*/
		}
	</style>
	<h1 style="display: flex; clear:both;gap:0 1rem; flex-wrap:wrap">
		${data.group.group_title}
		${!data.brand || search.titlepart(data, env, 'brand', data.brand.brand_title)}
		${!data.md.search || search.titlepart(data, env, 'search', data.md.search)}
		${!data.md.more || Object.keys(data.md.more).map(prop_nick => {
			const values = data.md.more[prop_nick]
			return Object.keys(values).map(value => {
				return search.choice.just(data, env, prop_nick, value, value)	
			}).join(', ')
		})}
	</h1>
`
search.choice = {
	"just": (data, env, prop_nick, part, value) => `
		<a data-scroll="none" class="clearlink" 
			href="${env.crumb.parent}${links.addm(data)}more.${prop_nick}.${part}">
			<span class="value">${value}</span>
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
		<a href="${env.crumb.parent}${search.toplink(data, env)}">${data.parent.group_title}</a>
	</div>
`
search.toplink = (data, env) => {
	if (data.parent.parent_id) {
		return '/' + data.parent.group_nick+links.setm(data)
	} else {
		return data.group.parent_id ? links.addm(data)+'group' : ''
	}
}
