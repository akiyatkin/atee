import note from "/-note/layout.html.js"
export const css = ["/-note/style.css"]
export const ROOT = (data, env) => data.result ? `
	<style>
		header {
		    position: static!important;
		}
		header:has(.show) {
		    position: sticky!important;
		}
		/*.notewrapper .note {
			padding:2ch 0;
		}*/
	</style>
	<div class="container">
		<h1>${data.note.title || 'Без названия'}</h1>
		${note.show(data.note)}
	</div>
	<script>
		(div => {
			const wrap = div.querySelector('.notewrapper')
			const area = wrap.querySelector('.area')
			const h1 = div.querySelector('h1')
			area.focus()
			wrap.addEventListener('note-signal', async e => {
				const {signal, user_id, my} = e.detail
				const Client = await window.getClient()
				if (signal.type == 'joined') {
					//if (signal.my) Client.reloaddiv('NOTES') если NOTES onlyclient то они сами обновятся
					Client.reloaddiv('FOOTER')
				} else if (signal.type == 'reject') {
					Client.reloaddiv('NOTES')
					if (user_id == ${note.user_id}) {
						Client.reloaddiv('FOOTER')
						Client.go('/')
					}
				} else if (signal.type == 'leave') {
					Client.reloaddiv('FOOTER')
				} else if (signal.type == 'rename') {
					document.title = signal.title || 'Без названия'
					h1.innerHTML = signal.title || 'Без названия'
					Client.reloaddiv('NOTES')
				}
			})
		})(document.currentScript.previousElementSibling)
	</script>
` : `
	<div class="container">
		<h1>Ошибка</h1>
		<p>
			${data.msg || 'Ошибка на сервере'}.
		</p>
		<p>
			<a href="/">Перейти на главную страницу</a>.
		</p>
	</div>
`
