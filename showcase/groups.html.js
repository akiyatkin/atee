import { ago } from "/-words/ago.js"
import { passed } from "/-words/passed.js"
import { words } from "/-words/words.js"


const runGroups = (root) => {
	if (!root) return ''
	let html = `<div draggable="true" class="item" data-group_id="${root.group_id}">`+showgroup(root)
	if (!root.childs) return html+'</div>'
	return `${html}<div class="childs" style="margin-left:20px">${root.childs.map(runGroups).join('')}</div></div>`
}


export const ROOT = (data, env) => !data.result ? `<p>${data.msg}</p>` : `
	<h1>Группы</h1>
	<p>
		Всего с моделями и без: ${data.count}
	</p>
	<div class="draglist">${data.root.childs.map(runGroups).join('')}</div>
	<p align="right">
		<button class="botbtn" data-action="set-groups-clearempty">Удалить пустые</button>
		<script type="module" async>
			const id = id => document.getElementById(id)
			const div = id('${env.layer.div}')
			const cls = cls => div.getElementsByClassName(cls)
			const btn = cls('botbtn')[0]
			btn.addEventListener('click',async () => {
				if (!confirm('Будут удалены группы без моделей. Эти группы больше не понадобятся? Пропадут group_id. Удалить?')) return
				btn.innerHTML = 'В процессе...'
				const ans = await fetch('/-showcase/'+btn.dataset.action).then(res => res.json()).catch(e => false)
				btn.innerHTML = ans?.msg || 'Ошибка'
				const Client = await window.getClient()
				Client.reloaddiv('${env.layer.div}')
			})
			for (const draglist of cls('draglist')) {
				let moved = false
				draglist.addEventListener('dragstart', e => {
					moved = e.target.closest('.item')
				})
				draglist.addEventListener('drop', async e => {
					if (!moved) return
					const current = e.target.closest('.item')
					if (moved == current) return
					if (moved.closest('.childs') != current.closest('.childs')) return
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
			}
		</script>
	</p>
`
const showgroup = (group) => `
	<div class="${group.group_nick}" style="transition: 0.3s;">
		<span style="cursor: move">&blk14;</span>
		<span title="${group.group_nick}">${group.group_title} <small>${group.models}</small></span>
	</div>
`