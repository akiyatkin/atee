const err = (data, env) => data?.result ? '' : `
	<h1 style="color:crimson;">${data?.msg || 'Нет данных с сервера'}</h1>
`
export default err