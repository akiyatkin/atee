import print from "/-words/print.html.js"
export const ROOT = (data, env) => `
    <h1>Карта сайта</h1>
	${Object.values(data.headings).map(heading => showBlock(data, env, heading)).join('')}
`

const showList = (data, env) => `
	<p>
		${data.list.map(link).join(', ')}.
	</p>
`
const showLink = (href, head) => `<a href="/${href}">${head.name || head.title}</a>`
const showBlock = (data, env, heading) => `
	${heading.title ? showHeading(data, env, heading) : ''}
	<p>
		${Object.entries(heading.items).map(([href, head]) => showLink(href, head)).join(', ')}${Object.keys(heading).length && '.' || ''}
	</p>
`
const showHeading = (data, env, heading) => `
	<h2>${heading.title}</h2>
`