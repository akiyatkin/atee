export const ROOT = (data, env) => `
	<h1>Каталог</h1>
	${data.childs.map(g => showgroup(g, env)).join('')}
`
const showgroup = (group, env) => `
	<a href="${env.crumb.parent}/${group.group_nick}">${group.group_title}</a>
	<div style="margin-left:1rem">${group.childs ? group.childs.map(showgroup).join('') : ''}</div>
`