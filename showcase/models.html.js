import { ago } from "/-words/ago.js"
import { passed } from "/-words/passed.js"
import { words } from "/-words/words.js"




export const ROOT = (data, env) => !data.result ? `<p>${data.msg}</p>` : `
	<h1>Модели</h1>
	<p>
		Всего с позициями и без: ${data.models.length}
	</p>
	${data.models.map(showmodel).join('')}
	<p align="right">
		<button class="botbtn" data-action="set-models-clearempty">Удалить пустые</button>
		<script type="module" async>
			const id = id => document.getElementById(id)
			const div = id('${env.layer.div}')
			const cls = cls => div.getElementsByClassName(cls)
			const btn = cls('botbtn')[0]
			btn.addEventListener('click',async () => {
				if (!confirm('Будут удалены модели без позиции. Эти модели больше не понадобятся? Пропадут model_id. Удалить?')) return
				btn.innerHTML = 'В процессе...'
				const ans = await fetch('/-showcase/'+btn.dataset.action).then(res => res.json()).catch(e => false)
				btn.innerHTML = ans?.msg || 'Ошибка'
				const Client = await window.getClient()
				Client.reloaddiv('${env.layer.div}')
			})
		</script>
	</p>
`
const showmodel = (mod) => `
	<a title="Порядок ${mod.ordain}" href="models/${mod.model_id}">${mod.brand_title} ${mod.model_title}</a> ${mod.cost||''} <small>${mod.items}</small><br>
`