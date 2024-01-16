export const ROOT = (data, env) => env.bread.get.result ? `
	<div style="margin-top:1rem"><a href="/user">Личный кабинет</a></div>
	<h1 style="margin-top:0">${env.bread.get.heading || 'Успех'}</h1>
	<p><b>${env.bread.get.email || ''}</b></p>
	<p>${env.bread.get.msg || env.bread.get.alert || ''}</p>
` : `
	<div style="margin-top:1rem"><a href="/user">Личный кабинет</a></div>
	<h1 style="margin-top:0">${env.bread.get.heading || 'Ошибка'}</h1>
	<p><b>${env.bread.get.email || ''}</b></p>
	<p>${env.bread.get.msg || env.bread.get.alert || ''}</p>
`