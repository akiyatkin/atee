const tpl = {}
export default tpl
import err from "/-controller/err.html.js"
tpl.ROOT = (data, env) => err(data, env) || `
	<h1>Каталог</h1>
	<div style="display: grid; gap: 0.25em">
		${data.childs.map(page => tpl.showPage(data, env, page)).join('')}
	</div>
`
tpl.showPage = (data, env, page) => `
	<a href="/catalog/${page.page_nick}">${page.page_title}</a>
`