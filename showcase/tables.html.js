import { ago } from "/-words/ago.js"
import { passed } from "/-words/passed.js"
import { words } from "/-words/words.js"




export const ROOT = (data, env) => `
	<h1>Данные</h1>
	<table style="border-spacing: 0 0.5rem">
		${data.files.map(tablerow).join('')}
	</table>
	<script type="module" async>
		const id = id => document.getElementById(id)
		const div = id('${env.div}')
		const cls = (cls, el = div) => el.getElementsByClassName(cls)
		for (const btn of cls('load')) {
			btn.addEventListener('click',async () => {
				btn.innerHTML = 'В процессе...'
				btn.disabled = true
				const ans = await fetch('/-showcase/set-tables-load?name=' + btn.dataset.name).then(res => res.json())
				btn.innerHTML = ans?.msg
				btn.disabled = false
				btn.classList.add('ready')
				for (const other of cls('clear', btn.parentElement)) {
					other.innerHTML = 'Очистить'
					other.disabled = false
				}
				//const Client = await window.getClient()
				//Client.reloaddiv('${env.div}')
			})
		}
		for (const btn of cls('clear')) {
			btn.addEventListener('click',async () => {
				btn.innerHTML = 'В процессе...'
				btn.disabled = true
				const ans = await fetch('/-showcase/set-tables-clear?name=' + btn.dataset.name).then(res => res.json())
				btn.innerHTML = ans?.msg
				for (const other of cls('load', btn.parentElement)) {
					other.innerHTML = 'Внести'
					other.classList.remove('ready')
				}
				//const Client = await window.getClient()
				//Client.reloaddiv('${env.div}')
			})
		}
		
	</script>
	<!-- <p align="right">
		<button class="ordain">Упорядочить</button>
		<script type="module" async>
			const id = id => document.getElementById(id)
			const div = id('${env.div}')
			const cls = cls => div.getElementsByClassName(cls)
			const btnordain = cls('ordain')[0]
			btnordain.addEventListener('click',async () => {
				btnordain.innerHTML = 'В процессе...'
				const ans = await fetch('/-showcase/set-tables-ordain').then(res => res.json())
				btnordain.innerHTML = ans.msg

			})
		</script>
	</p> -->
	
`
const tablerow = ({options, row, file, name, size, mtime, ready}) => `
	<tr>
		<td>
			<b>${name}</b><br>
			${options?.brand === true ? 'Мультибренд' : `Бренд: ${options?.brand || name}`}
		</td>
		<td style="padding-left:5px">
			<div style="margin-bottom:3px">
				${size} Mb, <span title="Файл изменён ${new Date(mtime).toLocaleDateString()}">${ago(mtime)}</span>
			</div>
			${!row ? '' : `
				<div style="margin-bottom:3px; ${row.loaded? '' : 'opacity:0.5'}">
					${row.quantity} ${words(row.quantity,'строка','строки','строк')} за ${passed(row.duration)}, <span title="Файл загружен ${new Date(row.loadtime).toLocaleDateString()}">${ago(row.loadtime)}</span>
				</div>
			`}
			
			<div style="display: flex; flex-wrap: wrap; gap:5px">
				<button data-name="${name}" ${row?.loaded ? '':'disabled'} class="clear">Очистить</button>
				<button data-name="${name}" class="load ${ready?'ready':''}">Внести</button>
			</div>
		</td>
	</tr>
`