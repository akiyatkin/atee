import { ago } from "/-words/ago.js"
import { passed } from "/-words/passed.js"
import { words } from "/-words/words.js"




export const ROOT = (data, env) => `
	<h1>Бренды</h1>
	<p>
		Всего с моделями и без: ${data.brands.length}
	</p>
	${data.brands.map(showbrand).join('')}
	<p align="right">
		<button class="botbtn" data-action="set-brands-clearempty">Удалить пустые</button>
		<script type="module" async>
			const id = id => document.getElementById(id)
			const div = id('${env.div}')
			const cls = cls => div.getElementsByClassName(cls)
			const btn = cls('botbtn')[0]
			btn.addEventListener('click',async () => {
				if (!confirm('Будут удалены бренды без моделей. Эти бренды больше не понадобятся? Пропадут brand_id. Удалить?')) return
				btn.innerHTML = 'В процессе...'
				const ans = await fetch('/-showcase/'+btn.dataset.action).then(res => res.json()).catch(e => false)
				btn.innerHTML = ans?.msg || 'Ошибка'
				const Client = await window.getClient()
				Client.reloaddiv('${env.div}')
			})
		</script>
	</p>
`
const showbrand = (brand) => `
	${brand.brand_title} <small>${brand.models}</small><br>
`