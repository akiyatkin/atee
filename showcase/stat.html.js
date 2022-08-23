import { words } from "/-words/words.js"
export const ROOT = (data, env) => `
	${data.count?showcount(data):''}
	<script type="module">
		const div = document.getElementById('${env.div}')
		//div.style.cursor="pointer"
		//div.addEventListener('click', async () => {
		
		setTimeout(async () => {
			const Client = await window.getClient()
			Client.reloaddiv('${env.div}')
		}, 1000)
		//})
	</script>
`
const showcount = (data) => `
	В работе <b>${data.count} ${words(data.count,'транзакция','транзакции','транзакций')}</b>
`