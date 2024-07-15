const tpl = {}

tpl.err = (data, env) => data.result ? '' : /*html*/`
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

const link = (data, env, href, title) => `<p><a href="${env.crumb}${href}">${title}</a></p>`
tpl.ROOT = (data, env) => tpl.err(data, env) || `
	<h1>Личный кабинет</h1>
	<p>${data.user.email || ''}</p>
	${data.user.email ? '' : link(data, env, '/signup','Регистрация')}
	${data.user.email ? '' : link(data, env, '/signin','Вход')}
	${data.user.email ? link(data, env, '/logout','Выход') : ''}
	${data.user.email ? link(data, env, '/emails','Мои почтовые ящики') : ''}
`

tpl.FOOTER = (data, env) => `
	<ul>
		<li><a href="list">Список пользователей</a></li>
		<li><a href="settings">Настройки</a></li>
	</ul>
`



export default tpl