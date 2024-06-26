import { ago } from "/-words/ago.js"
import { passed } from "/-words/passed.js"
import { words } from "/-words/words.js"

export const ROOT = (data, env) => !data.result ? `<p>${data.msg}</p>` : `
	<h1>Таблицы</h1>
	<p>Показать <a href="/catalog?m=more.cena=empty">без цен</a>, <a href="/catalog?m=more.images=empty">без картинок</a>.</p>
	<table style="border-spacing: 0 0.5rem">
		${data.files.map(itemrow).join('')}
	</table>
	<script type="module" async>
		import { action } from "/-showcase/action.js"
		const div = document.getElementById('${env.layer.div}')
		const tag = (tag, el = div) => el.getElementsByTagName(tag)
		const cls = (cls, el = div) => el.getElementsByClassName(cls)
		const applyrow = (rowdata) => {
			const name = rowdata.dataset.name
			for (const btn of tag('button', rowdata)) action(btn, async (ans) => {
				const { htmltodiv } = await import('/-controller/htmltodiv.js')
				const tpl = await import('${env.layer.tpl}')
				let rowdata
				for (let item of cls('rowdata')) {
					if (item.dataset.name == name) rowdata = item
				}
				if (!rowdata) return
				const html = tpl.rowdata(ans.row)
				htmltodiv(html, rowdata)
				applyrow(rowdata)
			}, name)
		}
		for (const rowdata of cls('rowdata')) applyrow(rowdata)
	</script>
`

//{options, row, file, name, size, mtime, ready}
const itemrow = (item) => `
	<tr>
		<td>
			<b>${item.name}</b><br>
			${item.options?.brand === true ? 'Мультибренд' : `Бренд: ${item.options?.brand || item.name}`}
		</td>
		<td style="padding-left:5px">
			<div style="margin-bottom:3px">
				${fileinfo(item)}
			</div>
			<div class="rowdata" data-name="${item.name}">
				${rowdata(item.row, item)}
			</div>
		</td>
	</tr>
`
 
export const rowdata = (row, item) => (!row ? '' : `
	<div style="margin-bottom:3px; background: ${item?.mtime > row?.loadtime ? 'lightgoldenrodyellow' : ''}; ${row.loaded? '' : 'opacity:0.5'}">
		${row.quantity} ${words(row.quantity,'строка','строки','строк')} за ${passed(row.duration)}, <span title="Файл загружен ${new Date(row.loadtime).toLocaleDateString()}">${ago(row.loadtime)}</span>
	</div>
`) + `
	<div style="display: flex; flex-wrap: wrap; gap:5px">
		<button name="set-tables-load" class="${row?.ready?'ready':''}">Внести</button>
		<button name="set-tables-clear" ${row?.loaded ? '':'disabled'}>Очистить</button>
	</div>
`
const fileinfo = (item) => !item.mtime ? 'Файла нет' : `
	${item.size} Mb, <span title="Файл изменён ${new Date(item.mtime).toLocaleDateString()}">${ago(item.mtime)}</span>
`
