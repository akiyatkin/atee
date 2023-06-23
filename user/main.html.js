const tpl = {}

tpl.HEADER = (data, env) => `
	<div style="display: flex; justify-content: space-between;">
		<a href="/${env.bread.root}">Личный кабинет</a>
		<a href="/">${env.host}</a>
	</div>
`

tpl.ROOT = (data, env) => data.result ? `
	<h1>Личный кабинет</h1>
	<p>${data.user.email || ''}</p>
	<div style="display: grid;">
		<a href="${env.crumb}/signup">Регистрация</a>
		<a href="${env.crumb}/signin">Вход</a>
		<a href="${env.crumb}/logout">Выход</a>
		<hr>
		<a href="/user/orders">Мои заказы</a>
	</div>
` : `<p>Ошибка</p>`

tpl.FOOTER = (data, env) => `
	<ul>
		<li><a href="list">Список пользователей</a></li>
		<li><a href="settings">Настройки</a></li>
	</ul>
`


export default tpl