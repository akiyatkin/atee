export const HEADER = (data, env) => `
	<div style="display: flex; justify-content: space-between;">
		<a href="/${env.bread.root}">Личный кабинет</a>
		<a href="/">${env.host}</a>
	</div>
`

export const ROOT = (data, env) => data.result ? `
	<ul>
		<li><a href="signup">Регистрация</a></li>
		<li><a href="signin">Вход</a></li>
		<li><a href="logout">Выход</a></li>
	</ul>
` : `<p>Ошибка</p>`

export const FOOTER = (data, env) => `
	FOOTER
`