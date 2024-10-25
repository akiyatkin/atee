const err = (data, env, divs) => data?.result ? '' : `
	<h1 style="color:crimson;">${data?.msg || 'Нет данных с сервера'}</h1>
	${divs.map(id => showID(id))}
`
const showID = id => `<div id="${id}"></div>`
export default err