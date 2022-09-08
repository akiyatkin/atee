import cards from "/-catalog/cards.html.js"
import html from "/-words/html.js"
import dataenv from "/-words/dataenv.js"
import links from "/-catalog/links.html.js"
const search = {}
export default search

search.ROOT = () => html`
	<div id="CATGROUPS"></div>
	<div id="CATLIST"></div>
`
search.GROUPS = (data, env) => html`
	${search.title(data, env)}
	${!data.childs.length || search.groups(data, env)}
`
search.LIST = (data, env) => html`
	${!data.list.length || search.list(data, env)}
`
search.pagination = (data, env) => `
	<div style="margin: 2rem 0; margin-left: auto; width: max-content;align-items: center; display: grid; 
		grid-template-columns: repeat(4, max-content); 
		gap:1rem">
		<div>
			<a href="#">В начало</a>
		</div>
		<div><a href="#">Назад</a></div>
		<div style="padding:0 1rem; border: solid 1px #aaa; color: white; font-size: 1.3rem; background-color: gray;">10</div>
		<div><a href="#">Дальше</a></div>
	</div>
`
search.list = (data, env) => `	
	${search.pagination()}
	<div style="margin-top:1rem">
		${cards.LIST(data, env)}
	</div>
	${search.pagination(data, env)}
	
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
	${(!data.path.length && !data.m) || search.parent(data, env)}
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
	</h1>
`
search.titlepart = (data, env, part, value) => `
	<a data-scroll="none" class="clearlink" 
		href="${env.crumb}${links.addm(data)}${part}">
		<span class="value">${value}</span>
		<span class="krest" style="font-size:1rem; line-height: 2rem;">✕</span>
	</a>
`
search.parent = (data, env) => html`
	<div style="float:left; margin-top:1rem">
		<a href="${env.crumb.parent}${toplink(data, env)}">${data.parent.group_title}</a>
	</div>
`
const toplink = (data, env) => {
	if (data.parent.parent_id) {
		return '/' + data.parent.group_nick+links.setm(data)
	} else {
		return data.group.parent_id ? links.addm(data)+'group' : ''
	}
}
