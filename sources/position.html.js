import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"


export const ROOT = (data, env) => err(data, env, ['TABLE']) || `
	<h1>${data.item.value_title}</h1>
	<div id="TABLE"></div>
`

export const TABLE = (data, env) => !data.result ? '' : `
	<table>
		${data.cells.map(variants => showItemVariants(data, env, variants)).join('')}
	</table>
	<script>
		(table => {
			table.addEventListener('click', async e => {
				const btn = e.target.closest('button')
				if (!btn) return
				const td = btn.parentElement
				const tr = td.parentElement
				const index = Array.from(tr.children).indexOf(td)
				if (!index) return
				const {multi_index} = btn.dataset
				const {source_id, sheet_index, row_index, col_index} = tr.dataset
				const represent = await import('/-sources/represent.js').then(r => r.default)

				represent.popup({source_id, sheet_index, col_index, row_index, multi_index}, '${env.layer.div}')
			})
		})(document.currentScript.previousElementSibling)
	</script>
`
const showItemVariants = (data, env, variants) => `
	${variants.map(variant => showItemVariantTr(data, env, variant)).join('')}
`
const showItemVariantTr = (data, env, variant) => `
	<tr data-source_id="${variant[0].source_id}" 
		data-sheet_index="${variant[0].sheet_index}" 
		data-row_index="${variant[0].row_index}" 
		data-col_index="${variant[0].col_index}" 
		>
		<td>${variant[0].prop_title}</td>
		<td>${variant.map(val => showItemVal(data, env, val)).join(', ')}</td>
	</tr>
`
const showItemVal = (data, env, cell) => `
	<button class="transparent" data-multi_index="${cell.multi_index}" style="${cell.winner ? '' : 'opacity:0.5;'}${cell.pruning ? 'color:red':''}">${cell.text}</span>
`.trim()






