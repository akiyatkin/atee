import { words } from "/-words/words.js"
export const ROOT = (data, env) => `
	${data.count?showcount(data):''}
	<script type="module">
		const div = document.getElementById('${env.layer.div}')
		setTimeout(async () => {
			const Client = await window.getClient()
			//await Client.reloaddiv('${env.layer.div}').catch(e => false)
		}, 3000)
	</script>
`
const showcount = (data) => `
	В работе <b>${data.count} ${words(data.count,'запрос','запроса','запросов')}</b>
`