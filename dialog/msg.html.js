const cont = {}
export default cont

cont.MSG = (data, env) => `
	<h1>${data.result ? 'Готово' : 'Ошибка'}</h1>
	<div style="max-width: 400px;"><p class="msg">${data.msg || ''}</p></div>
`