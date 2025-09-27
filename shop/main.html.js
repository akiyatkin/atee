import cards from "/-shop/cards.html.js"
const tpl = {}
export default tpl
import err from "/-controller/err.html.js"
tpl.ROOT = (data, env) => err(data, env) || `
	<h1>${data.root.group_title}</h1>
	<div style="display: grid; gap: 0.25em">
		${data.childs.map(group_nick => tpl.showGroup(data, env, group_nick, data.groups[group_nick])).join('')}
	</div>
`
tpl.showGroup = (data, env, group_nick, group) => `
	<div><a data-scroll="none" href="${cards.getGroupPath(data, group_nick)}${cards.addget(env.bread.get, {m:data.md.m})}">${group.group_title}</a></div>
`