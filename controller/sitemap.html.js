// export const ROOT = (data, env) => `
//     <h1>Карта сайта</h1>
//     ${data.map(rubs).join('')}
// `
// const rubs = item => `
// 	${item.href ? headingsrc(item) : heading(item)}
// 	<p>
// 		${list.map(link).join(', ')}.
// 	</p>
// `
// const heading = item => `
// 	<h2>${item.title}</h2>
// `
// const headingsrc = item => `
// 	<h2><a style="color:inherit;" href="/${item.href}">${item.title}</a></h2>
// `



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