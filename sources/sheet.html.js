import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
import date from "/-words/date.html.js"
import svg from "/-sources/svg.html.js"
export const css = ['/-sources/status.css']

export const ROOT = (data, env, sheet = data.sheet, source = data.source) => err(data, env, []) || `
	<div style="opacity:0.5; float:right">Лист <a href="source/${source.source_id}">${source.source_title}</a></div>
	<h1>${sheet.sheet_title}</h1>
	<table>
		<thead>
			<tr>
				${data.cols.map(col => showColTd(data, env, sheet, source, col)).join('')}
			</tr>
		</thead>
	</table>
	<script>
		(div => {
			const btns = div.getElementsByClassName('col')
			//const remove = div.getElementsByClassName('remove')[0]
			const titles = ${JSON.stringify(data.cols.map(col => col.col_title))}
			const sheet_title = ${JSON.stringify(sheet.sheet_title)}
			const source_id = ${source.source_id}
			for (const btn of btns) {
				btn.addEventListener('click', async () => {
					const senditmsg = await import('/-dialog/senditmsg.js').then(r => r.default)
					const data = await senditmsg(btn, '/-sources/set-col-switch', {
						source_id, sheet_title,
						col_title: titles[btn.dataset.col_index]
					}) 
					if (!data.result) return
					btn.classList.remove('represent-1', 'represent-0', 'represent-custom-1', 'represent-custom-0', 'represent-def-0', 'represent-def-1')
					btn.classList.add(data.cls.main, data.cls.custom)
					//remove.style.display = 'block'
				})
			}
		})(document.currentScript.parentElement)
	</script>
`
const showColTd = (data, env, sheet, source, col) => `
	<td>
		<button data-col_index="${col.col_index}" title="Изменить видимость колонки" class="eye col transparent ${col.cls.main} ${col.cls.custom}">${svg.eye()}</button>
		 ${col.col_title}
	</td>
`