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
const showLink = item => `<a href="/${item.href}">${item.name||item.title}</a>`
const showBlock = (data, env, heading) => `
	${heading.title ? showHeading(data, env, heading) : ''}
	<p>
		${Object.keys(heading.childs).map(next => 
			showLink({
				...heading.childs[next], 
				href: heading.childs[next].href ? (heading.childs[next].href  + '/' + next) : (heading.href ? heading.href  + '/' + next : next)
			})
		).join(', ')}${Object.keys(heading.childs).length && '.' || ''}
	</p>
`
const showHeading = (data, env, heading) => `
	<h2>${heading.title}</h2>
`