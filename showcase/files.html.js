import { words } from "/-words/words.js"

export const ROOT = (data, env) => !data.result ? `<p>${data.msg}</p>` : `
	<h1>Файлы</h1>
	<div style="margin-bottom:2rem">
		${data.res.map(showres).join('')}
		${data.parts.map(printpart).join('')}
	</div>
`
const showres = ([key, val]) => `
<div>${key}: ${val}</div>
`
const printpart = ([name, ar]) => `
	<div><b>${name}</b> ${ar.length}</div>
	${ar.map(showfile).join('')}
`
const showfile = ({src}) => `<div>${src}</div>`

