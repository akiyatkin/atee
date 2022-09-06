export const ROOT = (data, env) => `
	<h1>Каталог</h1>
	${data.childs.map(showgroup).join('')}
`
const showgroup = (group) => `
	<a href="/catalog/${group.group_nick}">${group.group_title}</a>
	<div style="margin-left:1rem">${group.childs ? group.childs.map(showgroup).join('') : ''}</div>
`