import nicked from "/-nicked"
const field = {}

field.switch = (name, title, action, is, valuetrue, valuefalse) => {
	return `
	<div>
		<div style="display: inline-block; cursor:pointer; padding:calc(.75rem / 3) 0">${title}: <span class="a">${is ? valuetrue : valuefalse}</span></div>
		<script>
			(btn => {
				btn.addEventListener('click', async () => {
					const send = await import('/-dialog/send.js').then(r => r.default)
					const ans = await send('${action}')
					btn.querySelector('.a').innerHTML = ans['${name}'] ? "${valuetrue}" : "${valuefalse}"
				})
			})(document.currentScript.previousElementSibling)
		</script>
	</div>`

}
field.area = (name, title, action, value) => {
	const id = 'inputs-' + nicked(title)
	return `
		<div class="float-label success">
			<div name="${name}" contenteditable id="${id}" class="field">${value}</div>
			<label for="${id}">${title}</label>
			${field.status()}
			<script>
				(float => {
					const field = float.querySelector('.field')					
					field.addEventListener('input', async () => {
						const sendit = await import('/-dialog/sendit.js').then(r => r.default)
						const ans = await sendit(float, '${action}', {${name}: field.innerHTML})
					})
				})(document.currentScript.parentElement)
			</script>
		</div>
	`
}
field.areaok = (name, title, action, value) => {
	const id = 'inputs-' + nicked(title)
	return `
		<div class="float-label success">
			<div name="${name}" contenteditable id="${id}" class="field">${value}</div>
			<label for="${id}">${title}</label>
			${field.status()}
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
						if (!float.classList.contains('submit')) return
						const sendit = await import('/-dialog/sendit.js').then(r => r.default)
						const ans = await sendit(float, '${action}', {${name}: field.innerHTML})
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
			${field.status()}
			<script>
				(float => {
					const field = float.querySelector('.field')					
					field.addEventListener('input', async () => {
						const sendit = await import('/-dialog/sendit.js').then(r => r.default)
						const ans = await sendit(float, '${action}', {${name}: field.value})
					})
				})(document.currentScript.parentElement)
			</script>
		</div>
	`
}
field.textok = (name, title, action, value) => {
	const id = 'inputs-' + nicked(title)
	return `
		<div class="float-label success">
			<input name="${name}" type="text" id="${id}" value="${value}" placeholder="${title}" class="field">
			<label for="${id}">${title}</label>
			${field.status()}
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
						if (!float.classList.contains('submit')) return
						const sendit = await import('/-dialog/sendit.js').then(r => r.default)
						const ans = await sendit(float, '${action}', {${name}: field.value})
					})
				})(document.currentScript.parentElement)
			</script>
		</div>
	`
}
field.status = () => `
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
// field.textsave = (name, title, action, value) => {
// 	const id = 'inputs-' + nicked(title)
// 	return `
// 		<div class="float-label">
// 			<input name="${name}" type="text" id="${id}" value="${value}" placeholder="${title}" class="field">
// 			<label for="${id}">${title}</label>
// 			${field.svg.success}
// 			<script>
// 				(float => {
// 					const light = (field, cb) => {
// 						if (!field.counter) field.counter = 0
// 						field.counter++
// 						field.title = "В процессе ..."
// 						field.classList.add('process')
// 						field.classList.remove('ready', 'error')

// 						const ans = await cb()

// 						field.title = ans.msg || "Сохранено"
// 						setTimeout(() => {
// 							field.counter--
// 							if (field.counter) return
// 							field.classList.remove('process')
// 							field.classList.add(ans.result ? 'ready' : 'error')
// 						}, 200)

// 						return ans
// 					}

// 					const field = float.querySelector('.field')
// 					const status = float.querySelector('.status')
					
// 					field.addEventListener('input', async () => {
// 						light(float, async () => {
// 							const send = await import('/-dialog/send.js').then(r => r.default)
// 							const ans = await send(field, '${action}', {${name}: field.value})
// 							return ans
// 						})
// 					})
// 				})(document.currentScript.parentElement)
// 			</script>
// 		</div>
// 	`
// }
field.svg = {
	submit: `
		<button style="color: var(--blue); font-size: 12px; padding:0;" class="transparent status">
			OK
		</button>`,	
	success: `
		<div class="status" style="color: var(--success);">
			<svg fill="currentColor" width="30" height="30" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
				<path d="M15.3 5.3l-6.8 6.8-2.8-2.8-1.4 1.4 4.2 4.2 8.2-8.2"/>
			</svg>
		</div>
	`,
	process: `
		<div class="status" style="color: gray;">
			<svg class="process" style="margin:4px" fill="currentColor" width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
				<path d="M12 22c5.421 0 10-4.579 10-10h-2c0 4.337-3.663 8-8 8s-8-3.663-8-8c0-4.336 3.663-8 8-8V2C6.579 2 2 6.58 2 12c0 5.421 4.579 10 10 10z" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</div>
	`,
	error: `
		<button class="transparent status" style="color: var(--danger);">
			!
		</button>
	`
}

export default field