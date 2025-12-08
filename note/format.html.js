import Area from "/-note/Area.js"
import field from "/-dialog/field.html.js"
const tpl = {}
export default tpl

tpl.css = ['/-note/style.css']

tpl.ROOT = (data, env) => `
	<div style="margin-bottom:1em"><b>${data.note.title}</b></div>
	<table style="margin-bottom: 1em;">
		<tr>
			<td>Переносить по словам</td>
			<td>
				${field.switch({
					name: 'bit', 
					action: '/-note/set-switch-iswrap', 
					value: data.note.iswrap, 
					values: {"":"Нет", "1":"Да"}, 
					args: {note_id: data.note.note_id}
				})}<script>
					(div => {
						const field = div.querySelector('.field')
						field.addEventListener('field-saved', async (e) => {
							const ans = e.detail
							if (!ans.result) return
							const Note = await import('/-note/Note.js').then(r => r.default)
							Note.sendOnce(${data.note.note_id}, {signal: {type:'iswrap', bit: ans.bit}})
						})
					})(document.currentScript.previousElementSibling)
				</script>
			</td>
		</tr>
		<tr>
			<td>Распознавать макросы <code>/d /h /t /- /+</code></td>
			<td>
				${field.switch({
					name: 'bit', 
					action: '/-note/set-switch-isslash',
					value: data.note.isslash, 
					values: {"":"Нет", "1":"Да"}, 
					args: {note_id: data.note.note_id}
				})}<script>
					(div => {
						const field = div.querySelector('.field')
						field.addEventListener('field-saved', async (e) => {
							const ans = e.detail
							if (!ans.result) return
							const Note = await import('/-note/Note.js').then(r => r.default)
							Note.sendOnce(${data.note.note_id}, {signal: {type:'isslash', bit: ans.bit}})
						})
					})(document.currentScript.previousElementSibling)
				</script>
			</td>
		</tr>
		<tr>
			<td><div class="notewrapper"><div>Подсвечивать <span class="brackets">{фигурные скобки}</span></div></div></td>
			<td>
				${field.switch({
					name: 'bit', 
					action: '/-note/set-switch-isbracket',
					value: data.note.isbracket, 
					values: {"":"Нет", "1":"Да"}, 
					args: {note_id: data.note.note_id}
				})}<script>
					(div => {
						const field = div.querySelector('.field')
						field.addEventListener('field-saved', async (e) => {
							const ans = e.detail
							if (!ans.result) return
							const Note = await import('/-note/Note.js').then(r => r.default)
							Note.sendOnce(${data.note.note_id}, {signal: {type:'isbracket', bit: ans.bit}})
						})
					})(document.currentScript.previousElementSibling)
				</script>
			</td>
		</tr>
		<tr>
			<td>Подсвечивать <div style="font-family: monospace;"><b>**жирным заголовки**</b> в начале строки</div></td>
			<td>
				${field.switch({
					name: 'bit', 
					action: '/-note/set-switch-isbold',
					value: data.note.isbold, 
					values: {"":"Нет", "1":"Да"}, 
					args: {note_id: data.note.note_id}
				})}<script>
					(div => {
						const field = div.querySelector('.field')
						field.addEventListener('field-saved', async (e) => {
							const ans = e.detail
							if (!ans.result) return
							const Note = await import('/-note/Note.js').then(r => r.default)
							Note.sendOnce(${data.note.note_id}, {signal:{type:'isbold', bit: ans.bit}})
						})
					})(document.currentScript.previousElementSibling)
				</script>
			</td>
		</tr>
	</table>
	
	<!-- <div style="margin-bottom:1em" class="notewrapper">
		<div class="note view">${data.note.text.slice(data.note.cursor_start, data.note.cursor_size + data.note.cursor_start)}</div>
	</div> -->
	
	<div>Позиция курсора: ${data.note.cursor_start}, выделено: ${data.note.cursor_size}</div>
	<div>Вставить после курсора: 
		<button class="a insert" data-text="/t">таб</button>, 
		<button class="a insert" data-text="/d">${Area.getControlD()}</button>
		<button class="a insert" data-text="/h">${Area.getControlH()}</button>
	</div>
	
	
	<script>
		(div => {
			for (const btn of div.getElementsByClassName('insert')) {
				btn.addEventListener('click', async () => {
					const Area = await import('/-note/Area.js').then(r => r.default)
					const Note = await import('/-note/Note.js').then(r => r.default)
					let text = btn.dataset.text
					if (text == '/d') text = Area.getControlD() + ' '
					if (text == '/h') text = Area.getControlH() + ' '
					if (text == '/t') text = Area.getControlT()
					await Note.sendOnce(${data.note.note_id}, {insert: {insert:text}})
					const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
					Dialog.reload()
				})
			}
		})(document.currentScript.parentNode)
	</script>

`