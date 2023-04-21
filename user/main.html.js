export const HEADER = (data, env) => `
	<div style="display: flex; justify-content: space-between;">
		<a href="/${env.bread.root}">Личный кабинет</a>
		<a href="/">${env.host}</a>
	</div>
`

export const ROOT = (data, env) => data.result ? `
	<h1>Личный кабинет</h1>
	<div style="display: grid;">
		<a href="${env.crumb}/signup">Регистрация</a>
		<a href="${env.crumb}/signin">Вход</a>
		<a href="${env.crumb}/logout">Выход</a>
	</div>
` : `<p>Ошибка</p>`

export const FOOTER = (data, env) => `
	<ul>
		<li><a href="list">Список пользователей</a></li>
		<li><a href="settings">Настройки</a></li>
	</ul>
`