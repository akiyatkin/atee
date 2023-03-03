import { ago } from "/-words/ago.js"
import { passed } from "/-words/passed.js"
import { words } from "/-words/words.js"


const runGroups = (root) => {
	if (!root) return ''
	let html = `<div draggable="true" class="item" data-group_id="${root.group_id}">`+showgroup(root)
	if (!root.childs) return html+'</div>'
	return `${html}<div class="childs" style="margin-left:20px">${root.childs.map(runGroups).join('')}</div></div>`
}

const showgroup = (group) => `
	<div style="transition: 0.3s;">
		<span style="cursor: move">&blk14;</span>
		<span title="${group.group_nick}"><span style="opacity:0.3">${group.ordain}.</span> <span data-group_id="${group.group_id}" class="replace" style="cursor: pointer">${group.group_title}</span> <small>${group.inside}</small></span>
	</div>
`
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
			const repbtns = cls('replace')
			for(const btn of repbtns) {
				btn.addEventListener('dblclick', async () => {
					const group_title = prompt('Укажите новую родительскую группу')
					const ans = await fetch('/-showcase/set-groups-replace?id=' + btn.dataset.group_id + '&title=' + encodeURIComponent(group_title)).then(res => res.json()).catch(e => ({result:0, msg:'Ошибка '+e}))
					const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
					if (ans?.msg) Dialog.alert(ans.msg)
					const Client = await window.getClient()
					Client.reloaddiv('${env.layer.div}')
				})
			}
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
