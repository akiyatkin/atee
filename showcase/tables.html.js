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
		for (let btn of cls('load')) {
			btn.addEventListener('click',async () => {
				btn.innerHTML = 'В процессе...'
				btn.disabled = true
				const ans = await fetch('/-showcase/set-tables-load?name=' + btn.name).then(res => res.json())
				const Client = await window.getClient()
				const tpl = await import('${env.tpl}')
				btn = cls('load').namedItem(btn.name)
				if (!btn) return
				btn.innerHTML = ans?.msg || 'Ошибка'
				if (!ans?.result) return
				btn.disabled = false
				btn.classList.add('ready')
				const rowdata = cls('rowdata', btn.parentElement.parentElement)[0]
				const html = tpl.rowdata(ans.row)
				Client.htmltodiv(html, rowdata)
				for (const other of cls('clear', btn.parentElement)) {
					other.innerHTML = 'Очистить'
					other.disabled = false
				}
				Client.reloaddiv('PANEL')
			})
		}
		for (let btn of cls('clear')) {
			btn.addEventListener('click',async () => {
				btn.innerHTML = 'В процессе...'
				btn.disabled = true
				const ans = await fetch('/-showcase/set-tables-clear?name=' + btn.name).then(res => res.json())
				const Client = await window.getClient()
				const tpl = await import('${env.tpl}')
				btn = cls('clear').namedItem(btn.name)
				if (!btn) return
				btn.innerHTML = ans?.msg
				if (!ans?.result) return
				

				const rowdata = cls('rowdata', btn.parentElement.parentElement)[0]
				const html = tpl.rowdata(ans.row)
				Client.htmltodiv(html, rowdata)
				

				for (const other of cls('load', btn.parentElement)) {
					other.innerHTML = 'Внести'
					other.classList.remove('ready')
				}

				Client.reloaddiv('PANEL')
			})
		}
		
	</script>
`
const tablerow = ({options, row, file, name, size, mtime, ready}) => `
	<tr>
		<td>
			<b>${name}</b><br>
			${options?.brand === true ? 'Мультибренд' : `Бренд: ${options?.brand || name}`}
		</td>
		<td style="padding-left:5px">
			<div style="margin-bottom:3px">
				${!mtime ? 'Файла нет': `
					${size} Mb, <span title="Файл изменён ${new Date(mtime).toLocaleDateString()}">${ago(mtime)}</span>
				`}
			</div>
			<div class="rowdata">
				${row ? rowdata(row) : ''}
			</div>
			<div style="display: flex; flex-wrap: wrap; gap:5px">
				<button name="${name}" ${row?.loaded ? '':'disabled'} class="clear">Очистить</button>
				<button name="${name}" class="load ${ready?'ready':''}">Внести</button>
			</div>
		</td>
	</tr>
`
export const rowdata = (row) => `
	<div style="margin-bottom:3px; ${row.loaded? '' : 'opacity:0.5'}">
		${row.quantity} ${words(row.quantity,'строка','строки','строк')} за ${passed(row.duration)}, <span title="Файл загружен ${new Date(row.loadtime).toLocaleDateString()}">${ago(row.loadtime)}</span>
	</div>
`