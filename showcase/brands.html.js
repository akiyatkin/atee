import { ago } from "/-words/ago.js"
import { passed } from "/-words/passed.js"
import { words } from "/-words/words.js"




export const ROOT = (data, env) => `
	<h1>Бренды</h1>
	<p>
		Всего с моделями и без: ${data.brands.length}
	</p>
	<div class="draglist">${data.brands.map(showbrand).join('')}</div>
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
			const draglist = cls('draglist')[0]
			let moved = false
			draglist.addEventListener('dragstart', e => {
				moved = e.target.closest('.item')
			})
			draglist.addEventListener('drop', async e => {
				if (!moved) return
				const current = e.target.closest('.item')
				if (moved == current) return
				current.before(moved)
				const moved_id = moved.dataset.brand_id
				moved = false
				const ans = await fetch('/-showcase/set-brands-move?before_id=' + moved_id + '&after_id=' + current.dataset.brand_id).then(res => res.json()).catch(e => false)
				if (!ans?.result) alert('Ошибка')

			})
			draglist.addEventListener('dragover', e => {
				const current = e.target.closest('.item')
				e.preventDefault()
				delete current.style.transition
			})
		</script>
	</p>
`
const showbrand = (brand) => `
	<div data-brand_id="${brand.brand_id}" draggable="true" class="item ${brand.brand_nick}" style="transition: 0.3s;">
		<span style="cursor: move">&blk14;</span>
		<span title="${brand.brand_nick}">${brand.brand_title} <small>${brand.models}</small></span>
	</div>
`