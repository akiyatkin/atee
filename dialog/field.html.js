import nicked from "/-nicked"
const field = {}


field.toggle = (name, title, action, value, values) => {
	return `
	<div>
		<button class="transparent" style="display: inline-block; cursor:pointer; padding:calc(.75rem / 3) 0">${title ? title + ': ' : ''} <span class="a">${values[value || ""]}</span></button>
		<script>
			(btn => {
				btn.addEventListener('click', async () => {
					const send = await import('/-dialog/send.js').then(r => r.default)
					const ans = await send('${action}')
					const status = ans['${name}']
					const values = ${JSON.stringify(values)}
					btn.querySelector('.a').innerHTML = values[status || ''] 
				})
			})(document.currentScript.previousElementSibling)
		</script>
	</div>`
}
field.button = (title, action, obj = {}) => {
	const {go, reloaddiv, goid } = obj
	return `
		<button>${title}</button>
		<script>
			(btn => {
				btn.addEventListener('click', async () => {
					if (btn.classList.contains('process')) return
					const ask = "${obj.confirm || ''}"
					if (ask && !window.confirm(ask)) return
					const sendit = await import('/-dialog/sendit.js').then(r => r.default)
					const ans = await sendit(btn, '${action}')
					if (ans.msg) {
						const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
						Dialog.alert(ans.msg)
						btn.innerHTML = ans.msg
					}
					const Client = await window.getClient()
					const goid = "${goid ? goid : ''}"
					if (ans.result && ${!!reloaddiv}) Client.reloaddiv('${reloaddiv}')
					if (ans.result && ${!!go}) Client.go('${go}' + (goid ? ans[goid] : ''))
				})
			})(document.currentScript.previousElementSibling)
		</script>
	`
}
field.area = (name, title, action, value) => {
	const id = 'inputs-' + nicked(title)
	return `
		<div class="float-label success">
			<div name="${name}" contenteditable id="${id}" class="field">${value}</div>
			<label for="${id}">${title}</label>
			${status()}
			<script>
				(float => {
					const field = float.querySelector('.field')					
					field.addEventListener('input', async () => {
						const sendit = await import('/-dialog/sendit.js').then(r => r.default)
						const ans = await sendit(float, '${action}', {${name}: field.innerHTML})
					})
					const status = float.querySelector('.status')
					status.addEventListener('click', async () => {
						const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
						Dialog.alert(float.title || "Сохранено!")
					})
				})(document.currentScript.parentElement)
			</script>
		</div>
	`
}
field.text = (name, title, action, value) => {
	const id = 'inputs-' + nicked(title)
	return `
		<div class="float-label success">
			<input name="${name}" type="text" id="${id}" value="${value}" placeholder="${title}" class="field">
			<label for="${id}">${title}</label>
			${status()}
			<script>
				(float => {
					const field = float.querySelector('.field')					
					field.addEventListener('input', async () => {
						const sendit = await import('/-dialog/sendit.js').then(r => r.default)
						const ans = await sendit(float, '${action}', {${name}: field.value})
					})
					const status = float.querySelector('.status')
					status.addEventListener('click', async () => {
						const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
						Dialog.alert(float.title || "Сохранено!")
					})
				})(document.currentScript.parentElement)
			</script>
		</div>
	`
}

field.textok = (name, title, action, value, obj = {}) => {
	const id = 'inputs-' + nicked(title)
	const {go, reloaddiv, goid } = obj
	return `
		<div class="float-label success">
			<input name="${name}" type="text" id="${id}" value="${value}" placeholder="${title}" class="field">
			<label for="${id}">${title}</label>
			${status()}
			<script>
				(float => {
					const field = float.querySelector('.field')
					const status = float.querySelector('.status')
					field.addEventListener('input', async () => {
						float.classList.remove('error','process','success')
						float.classList.add('submit')
						float.title = 'Подтвердите введённые данные'
					})
					status.addEventListener('click', async () => {
						if (float.classList.contains('submit')) {
							const sendit = await import('/-dialog/sendit.js').then(r => r.default)
							const ans = await sendit(float, '${action}', {${name}: field.value})
							if (ans.msg) {
								const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
								Dialog.alert(ans.msg)
							}
							const Client = await window.getClient()
							const goid = "${goid ? goid : ''}"
							if (ans.result && ${!!reloaddiv}) Client.reloaddiv('${reloaddiv}')
							if (ans.result && ${!!go}) Client.go('${go}' + (goid ? ans[goid] : ''))
						} else {
							const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
							Dialog.alert(float.title || "Сохранено")
							
						}
					})
				})(document.currentScript.parentElement)
			</script>
		</div>
	`
}
field.textdisabled = (name, title, action, value) => {
	const id = 'inputs-' + nicked(title)
	return `
		<div class="float-label success">
			<input disabled name="${name}" type="text" id="${id}" value="${value}" placeholder="${title}" class="field">
			<label for="${id}">${title}</label>
			${status()}
		</div>
	`
}

const status = () => `
	<div class="status">
		<button class="submit transparent" style="color: brown; font-size: 16px; font-weight: bold; padding:0;">
			OK
		</button>
		<div class="success" style="color: var(--success); font-size: 16px; font-weight: bold; padding:0;">
			✔
		</div>
		<div class="process" style="color: gray;">
			<svg style="margin:4px" fill="currentColor" width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
				<path d="M12 22c5.421 0 10-4.579 10-10h-2c0 4.337-3.663 8-8 8s-8-3.663-8-8c0-4.336 3.663-8 8-8V2C6.579 2 2 6.58 2 12c0 5.421 4.579 10 10 10z" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</div>
		<button class="error transparent" style="color: var(--danger); font-size: 24px; font-weight:bold; padding:0;">
			!
		</button>
	</div>
`

export default field