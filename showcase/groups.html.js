import { ago } from "/-words/ago.js"
import { passed } from "/-words/passed.js"
import { words } from "/-words/words.js"




export const ROOT = (data, env) => `
	<h1>Группы</h1>
	<p>
		Всего с моделями и без: ${data.groups.length}
	</p>
	<div class="draglist">${data.groups.map(showgroup).join('')}</div>
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
				const moved_id = moved.dataset.group_id
				moved = false
				const ans = await fetch('/-showcase/set-groups-move?before_id=' + moved_id + '&after_id=' + current.dataset.group_id).then(res => res.json()).catch(e => false)
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
const showgroup = (group) => `
	<div data-group_id="${group.group_id}" draggable="true" class="item ${group.group_nick}" style="transition: 0.3s;">
		<span style="cursor: move">&blk14;</span>
		<span title="${group.group_nick}">${group.group_title} <small>${group.models}</small></span>
	</div>
`