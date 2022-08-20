import { ago } from "/-words/ago.js"
import { passed } from "/-words/passed.js"
import { words } from "/-words/words.js"




export const ROOT = (data, env) => `
	<h1>Значения</h1>
	<p>
		Всего: ${data.values.length}
	</p>
	${data.values.map(showvalue).join('')}
	<p align="right">
		<button name="set-values-clearempty">Удалить пустые</button>
		<script type="module" async>
			const id = id => document.getElementById(id)
			const div = id('${env.div}')
			const tag = tag => div.getElementsByTagName(tag)
			const btn = tag('button')[0]
			btn.addEventListener('click',async () => {
				if (!confirm('Будут удалены значения, которые нигде не используются. Эти значения больше не понадобятся? Пропадут value_id. Удалить?')) return
				btn.innerHTML = 'В процессе...'
				const ans = await fetch('/-showcase/'+btn.name).then(res => res.json()).catch(e => false)
				btn.innerHTML = ans?.msg || 'Ошибка'
				const Client = await window.getClient()
				Client.reloaddiv('${env.div}')
			})
		</script>
	</p>
`
const showvalue = (model) => `
	${model.value_title} <small>${model.props}</small><br>
`