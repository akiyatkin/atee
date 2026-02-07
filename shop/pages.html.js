import cards from "/-shop/cards.html.js"
const tpl = {}
export default tpl
import err from "/-controller/err.html.js"
tpl.ROOT = (data, env) => err(data, env) || `
	<h1>${data.root.group_title}</h1>
	<div style="display: grid; gap: 0.25em">
		${data.childs.map(page_nick => tpl.showPage(data, env, page_nick, data.pages[page_nick], data.groups[data.pages[page_nick].group_nick])).join('')}
	</div>
`
tpl.showPage = (data, env, page_nick, page, group) => `
	<div><a data-scroll="none" href="${cards.getPath(data.conf, 'page', page_nick)}">${page.title}</a></div>
`