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
	const id = 'field-' + nicked(title)
	return `
		<div class="float-label success">
			<div name="${name}" contenteditable id="${id}" class="field">${value}</div>
			<label for="${id}">${title}</label>
			${showStatus()}
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
	const id = 'field-' + nicked(title)
	return `
		<div class="float-label success">
			<input name="${name}" type="text" id="${id}" value="${value}" placeholder="${title}" class="field">
			<label for="${id}">${title}</label>
			${showStatus()}
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
	const id = 'field-' + nicked(title)
	const {go, reloaddiv, goid } = obj
	return `
		<div class="float-label ${value ? 'success' : 'submit'}">
			<input name="${name}" type="text" id="${id}" value="${value}" placeholder="${title}" class="field">
			<label for="${id}">${title}</label>
			${showStatus()}
			<script>
				(float => {
					const field = float.querySelector('.field')
					const status = float.querySelector('.status')
					field.addEventListener('input', async () => {
						float.classList.remove('error','process','success')
						float.classList.add('submit')
						float.title = 'Подтвердить введённые данные'
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
	const id = 'field-' + nicked(title)
	return `
		<div class="float-label success">
			<input disabled name="${name}" type="text" id="${id}" value="${value}" placeholder="${title}" class="field">
			<label for="${id}">${title}</label>
			${showStatus()}
		</div>
	`
}
const showOption = (obj, vname, tname, value, def) => `<option ${value == obj[vname] ? 'selected ' : ''}value="${obj[vname]}">${obj[tname] || def}</option>`
const showEmpty = (empty) => `<option value="empty">${empty.title}</option>`
field.select = ({label, status, empty, fill, create}) => {
	const id = 'field-' + nicked(label)
	return `
		<div class="float-label ${status || ''}">
			<select id="${id}" class="field">
				${empty ? showEmpty(empty) : ''}
				${fill.options.map(obj => showOption(obj, fill.vname, fill.tname, fill.selected?.[fill.vname], fill.def || ''))}
				${!create || (create.action && fill.options.some(obj => !obj[fill.tname])) ? '' : '<optgroup label="------------"></optgroup><option value="create">' + create.title + '</option>'}
			</select>
			<label for="${id}">${label}</label>
			${status ? showStatus() : ''}
		</div>
		<script>
			(float => {
				const select = float.querySelector('.field')
				const status = float.querySelector('.status')
				const makeaction = async (opt, value = '') => {
					if (opt.action) {
						const sendit = await import('/-dialog/sendit.js').then(r => r.default)

						const ans = await sendit(float, opt.action, value ? {[opt.prop]: value} : false)
						if (ans.msg) {
							const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
							Dialog.alert(ans.msg)
						}
						if (ans.result && opt.go) {
							const Client = await window.getClient()
							return Client.go(opt.go + (opt.goid ? ans[opt.goid] : ''))
						}
					} else if (opt.go) {
						const Client = await window.getClient()
						return Client.go(opt.go + value)
					}
				}
				select.addEventListener('input', async () => {
					const i = select.options.selectedIndex
					const value = select.options[i].value
					select.disabled = true
					if (value == 'empty') {
						const opt = ${JSON.stringify(empty)}
						await makeaction(opt)
					} else if (value == 'create') {
						const opt = ${JSON.stringify(create)}
						await makeaction(opt)
					} else {
						const opt = ${JSON.stringify(fill)}
						await makeaction(opt, value)
					}
					select.disabled = false
				})

				if (status) status.addEventListener('click', async () => {
					const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
					Dialog.alert(float.title || "Сохранено!")
				})
			})(document.currentScript.previousElementSibling)
		</script>
	`
}
const showStatus = () => `
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