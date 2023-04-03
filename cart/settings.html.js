
export const ROOT = (data, env) => `
	<h1>Настройки</h1>
	<p>
		<button>Пересоздать базу данных</button>
		<script>
			(btn => {
				btn.addEventListener('click', async () => {
					if (!confirm('Все данные будут удалены. Пересоздать?')) return
					btn.innerHTML = 'Процесс запущен...'
					const ans = await fetch('/-cart/set-reset').then(res => res.json())
					btn.innerHTML = ans.msg
					const Client = await window.getClient()
					Client.reloaddiv('DATABASE')
				})
			})(document.currentScript.previousElementSibling)
		</script>
	</p>
	<div id="DATABASE"></div>
`
export const DATABASE = (data, env) => !data.result ? `<p>${data.msg}</p>` : `
	<table>
		<tr><td></td><td>Строк</td></tr>
		${data.tables.map(({name, count}) => `<tr><td>${name}</td><td>${count}</td></tr>`).join('')}
	</table>
`