const tpl = {}

tpl.err = (data, env) => data.result ? '' : `
	<div style="margin-top:1rem"><a href="/user">Личный кабинет</a></div>
	<h1 style="margin-top:0">Ошибка</h1>
	<p>${data.msg || 'Ошибка на сервере'}</p>
`
tpl.HEADER = (data, env) => `
	<div style="display: flex; justify-content: space-between;">
		<a href="/${env.bread.root}">Личный кабинет</a>
		<a href="/">${env.host}</a>
	</div>
`

tpl.ROOT = (data, env) => tpl.err(data, env) || `
	<h1>Личный кабинет</h1>
	<p>${data.user.email || ''}</p>
	${data.user.email ? '' : '<p><a href="'+env.crumb+'/signup">Регистрация</a></p>'}
	${data.user.email ? '' : '<p><a href="'+env.crumb+'/signin">Вход</a></p>'}
	${data.user.email ? '<p><a href="'+env.crumb+'/logout">Выход</a></p>' : ''}
	${data.user.email ? '<p><a href="/user/orders">Мои заказы</a></p>' : ''}	
`

tpl.FOOTER = (data, env) => `
	<ul>
		<li><a href="list">Список пользователей</a></li>
		<li><a href="settings">Настройки</a></li>
	</ul>
`


export default tpl