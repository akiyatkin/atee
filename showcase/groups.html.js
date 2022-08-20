import { ago } from "/-words/ago.js"
import { passed } from "/-words/passed.js"
import { words } from "/-words/words.js"




export const ROOT = (data, env) => `
	<h1>Группы</h1>
	<p>
		Всего с моделями и без: ${data.groups.length}
	</p>
	${data.groups.map(showgroup).join('')}
	<p align="right">
		<button class="botbtn" data-action="set-groups-clearempty">Удалить пустые</button>
		<script type="module" async>
			const id = id => document.getElementById(id)
			const div = id('${env.div}')
			const cls = cls => div.getElementsByClassName(cls)
			const btn = cls('botbtn')[0]
			btn.addEventListener('click',async () => {
				if (!confirm('Будут удалены группы без моделей. Эти группы больше не понадобятся? Пропадут group_id. Удалить?')) return
				btn.innerHTML = 'В процессе...'
				const ans = await fetch('/-showcase/'+btn.dataset.action).then(res => res.json()).catch(e => false)
				btn.innerHTML = ans?.msg || 'Ошибка'
				const Client = await window.getClient()
				Client.reloaddiv('${env.div}')
			})
		</script>
	</p>
`
const showgroup = (group) => `
	${group.group_title} <small>${group.models}</small><br>
`