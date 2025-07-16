const tpl = {}
export default tpl
import err from "/-controller/err.html.js"
tpl.ROOT = (data, env) => err(data, env) || `
	<h1>Каталог</h1>
	<div style="display: grid; gap: 0.25em">
		${data.childs.map(group => tpl.showGroup(data, env, group)).join('')}
	</div>
`
tpl.showGroup = (data, env, group) => `
	<a href="${data.conf.root_crumb}/${group.group_nick}">${group.group_title}</a>
`