// export const ROOT = (data, env) => `
//     <h1>Карта сайта</h1>
//     ${data.map(rubs).join('')}
// `
const rubs = item => `
	${item.href ? headingsrc(item) : heading(item)}
	<p>
		${list.map(link).join(', ')}.
	</p>
`
const heading = item => `
	<h2>${item.title}</h2>
`
const headingsrc = item => `
	<h2><a style="color:inherit;" href="/${item.href}">${item.title}</a></h2>
`



export const ROOT = (list, env) => `
    <h1>Карта сайта</h1>
    <p>
		${list.map(link).join(', ')}.
	</p>
`
const link = item => `<a href="/${item.href}">${item.name||item.title}</a>`