export const HEADER = (data, env) => `
	<div style="display: flex; justify-content: space-between;">
		<a href="/${env.bread.root}">User</a>
		<a href="/">${env.host}</a>
	</div>
`

export const MAIN = (data, env) => data.result ? `
	<ul>
		<li><a href="list">Список пользователей</a></li>
		<li><a href="settings">Настройки</a></li>
	</ul>
` : `<p>Нет доступа, требуется авторизация</p>`

export const FOOTER = (data, env) => `
	FOOTER
`
export const TEST = (data, env) => `
	<h1>TEST</h1>
`

export const LIST = (data, env) => `
	<h1>Список пользователей</h1>
`