import { ago } from "/-words/ago.js"
import { passed } from "/-words/passed.js"
import { words } from "/-words/words.js"




export const ROOT = (data, env) => !data.result ? `<p>${data.msg}</p>` : `
	<h1>Свойства</h1>
	<p>
		Всего с позициями и без: ${data.props.length}
	</p>
	<div class="draglist">${data.props.map(show).join('')}</div>
	<p align="right">
		<button class="botbtn" data-action="set-props-clearempty">Удалить пустые</button>
		<script type="module" async>
			const id = id => document.getElementById(id)
			const div = id('${env.layer.div}')
			const cls = cls => div.getElementsByClassName(cls)
			const btn = cls('botbtn')[0]
			btn.addEventListener('click',async () => {
				if (!confirm('Будут удалены свойства без позиций. Эти свойства больше не понадобятся? Пропадут prop_id. Удалить?')) return
				btn.innerHTML = 'В процессе...'
				const ans = await fetch('/-showcase/'+btn.dataset.action).then(res => res.json()).catch(e => false)
				btn.innerHTML = ans?.msg || 'Ошибка'
				const Client = await window.getClient()
				Client.reloaddiv('${env.layer.div}')
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
				const moved_id = moved.dataset.prop_id
				moved = false
				const ans = await fetch('/-showcase/set-props-move?before_id=' + moved_id + '&after_id=' + current.dataset.prop_id).then(res => res.json()).catch(e => false)
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
const show = (prop) => `
	<div data-prop_id="${prop.prop_id}" draggable="true" class="item ${prop.prop_nick}" style="transition: 0.3s;">
		<span style="cursor: move">&blk14;</span>
		<span title="${prop.prop_nick}">${prop.prop_title} <small>${prop.items}</small></span>
	</div>
`