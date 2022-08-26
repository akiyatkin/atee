
export const ROOT = (data, env) => `
	<h1>Настройки</h1>
	<p>
		<button id="btnreset">Пересоздать базу данных</button>
	</p>
	<script type="module" async>
		const id = id => document.getElementById(id)
		const div = id('${env.div}')
		const btn = id('btnreset')
		btn.addEventListener('click', async () => {
			if (!confirm('Все данные будут удалены. Пересоздать?')) return
			btn.innerHTML = 'Процесс запущен...'
			const ans = await fetch('/-showcase/set-reset').then(res => res.json())
			btn.innerHTML = ans.msg
			const Client = await window.getClient()
			Client.reloaddiv('DATABASE')
		})
	</script>
	<div id="DATABASE"></div>
`
export const DATABASE = (data, env) => !data.result ? `<p>${data.msg}</p>` : `
	<table>
		<tr><td></td><td>Строк</td></tr>
		${data.tables.map(({name, count}) => `<tr><td>${name}</td><td>${count}</td></tr>`).join('')}
	</table>
`