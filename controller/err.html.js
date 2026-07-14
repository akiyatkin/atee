const err = (data, env, divs = []) => data?.result ? '' : `
	<h1 style="color:crimson;">${data?.msg || 'Нет данных с сервера'}</h1>
	<p>
		<a href="/">Перейти на главную страницу</a>.
	</p>
	${divs.map(id => showID(id)).join('')}
`
const showID = id => `<div id="${id}"></div>`
export default err