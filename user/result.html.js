export const ROOT = (data, env) => env.bread.get.result ? `
	<h1>${env.bread.get.heading || 'Успех'}</h1>
	<p><b>${env.bread.get.email || ''}</b></p>
	<p>${env.bread.get.msg || ''}</p>
` : `
	<h1>${env.bread.get.heading || 'Ошибка'}</h1>
	<p><b>${env.bread.get.email || ''}</b></p>
	<p>${env.bread.get.msg || ''}</p>
`