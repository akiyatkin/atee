export const HEADER = (data, env) => `
	<div style="display: flex; justify-content: space-between;">
		<a href="/${env.bread.root}">Менеджер</a>
		<a href="/">${env.host}</a>
	</div>
`
export const BODY = (data, env) => !data.result ? `<p>${data.msg}</p>` : `
	<p>
		<a href="list">Клиенты</a>
	</p>
`
export const FOOTER = (data, env) => `
	<a href="settings">Настройки</a>
`
