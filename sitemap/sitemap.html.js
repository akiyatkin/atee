export const ROOT = (data, env) => `
    <h1>Карта сайта</h1>
    <p>
		${data.list.map(link).join(', ')}.
	</p>
	${data.headings.map(heading).join('')}
`
const link = item => `<a href="${item.href}">${item.name||item.title}</a>`
const heading = heading => `
	<h2>${heading.title}</h2>
	<p>
		${Object.keys(heading.childs).map(next => 
			link({
				...heading.childs[next], 
				href:heading.href ? (heading.href+'/'+next) : next
			})
		).join(', ')}.
	</p>
`