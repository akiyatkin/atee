const tpl = {}
export default tpl

tpl.css = ['/-note/style.css']

tpl.ROOT = (data, env) => `
	<div style="margin-bottom:1em"><b>${data.note.title}</b></div>
	
	<table>
		<tr>
			<td>Переносить по словам</td><td>Да wrap</td>
		</tr>
		<tr>
			<td>Распознавать макросы <code>/d /h /t /- /+</code></td><td>Нет slash</td>
		</tr>
		<tr>
			<td><div class="notewrapper"><div>Подсвечивать <span class="brackets">{фигурные скобки}</span></div></div></td>
			<td>Да bracket</td>
		</tr>
		<tr>
			<td>Подсвечивать <b>**жирный текст**</b></td><td>Да bold</td>
		</tr>
	</table>
	
	<!-- <div style="margin-bottom:1em" class="notewrapper">
		<div class="note view">${data.note.text.slice(data.note.cursor_start, data.note.cursor_size + data.note.cursor_start)}</div>
	</div> -->

	<p>
		<button class="a tab">Вставить таб</button>
	</p>
	<script>
		(div => {
			const btn = div.querySelector('.tab')
			btn.addEventListener('click', async () => {
				const Note = await import('/-note/Note.js').then(r => r.default)
				await Note.insert(${data.note.note_id}, "	")
				
			})
		})(document.currentScript.parentNode)
	</script>

`