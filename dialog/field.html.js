import nicked from "/-nicked"
const field = {}


//approved
field.images = ({name = 'file', file_id_name = 'file_id', action, files, remove}) => {
	const id = 'field-' + nicked(name)
	return `
		<div class="field-squares">
			${files.map(file => showFile(file, file_id_name)).join('')}
			<label class="show" for="${id}">
				<input multiple id="${id}" name="${name}" type="file" accept="image/*">
			</label>
			<script>
				(div => {
					const squares = div
					const label = squares.querySelector("label")
					const input = label.querySelector("input");
					let promise = Promise.resolve()
					const upload = async (file) => {
						//return new Promise(resolve => setTimeout(() => resolve({src:"/data/files/org_id/graph_id/audit_id/item_nick/02.png", file_id:777}), 1000))
						const body = new FormData()
						body.append('${name}', file)
						const ans = await fetch("${action}", {method: "POST", body}).then(r => r.json())
						if (ans.msg) {
							const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
							Dialog.alert(ans.msg)
						}
						return ans
					}
					const unload = async id => {
						const send = await import('/-dialog/send.js').then(r => r.default)
						const ans = await send('${remove}'+id)
						if (ans.msg) {
							const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
							Dialog.alert(ans.msg)
						}
						return ans.result
					}
					const addEvents = square => {
						const remove = square.querySelector('.remove')
						remove.addEventListener('click', async e => {
							e.stopPropagation()
							if (!confirm('Удалить файл?')) return 
							const r = await unload(square.dataset.id)
							if (r) square.remove()
						})
						square.addEventListener('click', e => {
							if (!square.classList.contains('show')) return
							window.open(square.dataset.src, '_blank');
						})
					}
					const addSquare = file => {
						const square = document.createElement('div')
						square.classList.add('field-square')
						square.dataset.id = file['${file_id_name}']
						square.innerHTML = '<div class="remove">&times;</div><canvas></canvas>'
						label.before(square)

						const canvas = square.querySelector('canvas')
						const ctx = canvas.getContext("2d")
						const reader = new FileReader()
						reader.onload = e => {
							const img = new Image()
							img.onload = () => {
								canvas.width = img.width
								canvas.height = img.height
								ctx.drawImage(img, 0, 0)
							}
							img.src = e.target.result
						}
						reader.readAsDataURL(file)
						addEvents(square)
						return square
					}
					
					const uploadFile = files => {
						if (files.length > 10) {
							alert("За раз загрузится только 10 файлов")
							files.length = 10
						}
						for (const file of files) {
							console.log(file)
							if (file.size > 10 * 1024 * 1024) {
								alert("Файл " + file.name + " более 10 МБ не будет загружен.")
								continue
							}
							if (!~['image/png', 'image/jpeg', 'image/webp','image/svg+xml'].indexOf(file.type)) {
								alert("Тип файла " + file.name + " " + file.type+ " не поддерживается.")
								continue
							}
							const square = addSquare(file)
							promise = promise.then(() => {
								return upload(file).then(ans => {
									square.dataset.id = ans['${file_id_name}']
									square.dataset.src = ans.src
									square.classList.add('show')
								}).catch(r => {
									square.classList.add('error')
								})
							})
						}
					}
					for (const square of squares.querySelectorAll('.field-square')) addEvents(square)
					input.addEventListener("change", async () => {
						const files = [...input.files]
						input.value = ''
						uploadFile(files)
					})

					document.body.addEventListener("dragover", e => {
						if (!div.closest('body')) return
						e.preventDefault()
					})
					document.body.addEventListener("drop", e => {
						if (!div.closest('body')) return
						const files = e.dataTransfer?.files
						if (!files) return
						e.preventDefault()
						uploadFile([...files])
					})
				})(document.currentScript.parentElement)
			</script>
		</div>
		
	`
}
const showFile = (file, file_id_name) => `
	<div class="field-square show" data-id="${file[file_id_name]}" data-src="${file.src}">
		<div class="remove">&times;</div>
		<img src="${file.src}">
	</div>
`
const showSrc = (src, width) => `
	<div class="field-square show" data-src="${src}">
		<div class="remove">&times;</div>
		<img style="max-width:100%; height:auto" src="${src}">
	</div>
`
//approved
field.image = ({name = 'file', action, width = 'auto', src, remove}) => {
	const id = 'field-' + nicked(name)
	return `
		<div class="field-squares" style="display: block;">
			${src ? showSrc(src, width) : '' }
			<label width="${width}" class="field-square ${src ? '' : 'show'}" for="${id}">
				<input class="field" id="${id}" name="${name}" type="file" accept="image/*">
			</label>
			<script>
				(div => {
					const squares = div
					const label = squares.querySelector("label")
					const input = label.querySelector("input");
					let promise = Promise.resolve()
					const upload = async (file) => {
						//return new Promise(resolve => setTimeout(() => resolve({src:"/data/files/org_id/graph_id/audit_id/item_nick/02.png", file_id:777}), 1000))
						const formData = new FormData()
						formData.append('${name}', file)
						const ans = await fetch("${action}", {
							method: "POST",
							body: formData
						}).then(r => r.json())
						if (ans.msg) {
							const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
							Dialog.alert(ans.msg)
						}
						input.dispatchEvent(new CustomEvent("field-saved", { detail: ans }))
						return ans
					}
					
					const addEvents = square => {
						const remove = square.querySelector('.remove')
						if (remove) remove.addEventListener('click', async e => {
							e.stopPropagation()
							if (!confirm('Удалить файл?')) return 
							const send = await import('/-dialog/send.js').then(r => r.default)
							const ans = await send('${remove}')
							if (ans.msg) {
								const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
								Dialog.alert(ans.msg)
							}
							if (ans.result) {
								square.remove()
								label.classList.add('show')
							}
							input.dispatchEvent(new CustomEvent("field-saved", { detail: ans }))
						})
						square.addEventListener('click', e => {
							if (!square.classList.contains('show')) return
							if (!square.dataset.src) return
							window.open(square.dataset.src, '_blank');
						})
					}
					const addSquare = file => {
						const square = document.createElement('div')
						square.classList.add('field-square')
						square.innerHTML = '<div class="remove">&times;</div><canvas></canvas>'
						label.before(square)

						const canvas = square.querySelector('canvas')
						const ctx = canvas.getContext("2d")
						const reader = new FileReader()
						reader.onload = e => {
							const img = new Image()
							img.onload = () => {
								canvas.width = img.width
								canvas.height = img.height
								ctx.drawImage(img, 0, 0)
							}
							img.src = e.target.result
						}
						reader.readAsDataURL(file)
						addEvents(square)
						return square
					}
					
					const uploadFile = file => {
						if (file.size > 10 * 1024 * 1024) {
							alert("Файл " + file.name + " более 10 МБ не будет загружен.")
							return
						}
						if (!~['image/png', 'image/jpeg', 'image/webp','image/svg+xml'].indexOf(file.type)) {
							alert("Тип файла " + file.name + " " + file.type+ " не поддерживается.")
							return
						}
						label.classList.remove('show')
						const square = addSquare(file)
						promise = promise.then(() => {
							return upload(file).then(ans => {
								square.dataset.src = ans.src
								square.classList.add('show')
							}).catch(r => {
								square.classList.add('error')
							})
						})
					}
					for (const square of squares.querySelectorAll('.field-square')) addEvents(square)
					input.addEventListener("change", async () => {
						if (!input.files[0]) return
						const file = input.files[0]
						console.log(file)
						input.value = ''
						uploadFile(file)
					})

					document.body.addEventListener("dragover", e => {
						if (!div.closest('body')) return
						e.preventDefault()
					})
					document.body.addEventListener("drop", e => {
						if (!div.closest('body')) return
						const files = e.dataTransfer?.files
						if (!files || !files[0]) return
						e.preventDefault()
						uploadFile(files[0])
					})
				})(document.currentScript.parentElement)
			</script>
		</div>
	`
}



const showRadio = (k, v, name, value) => {
	const id = 'field-' + nicked(name) +'-' + nicked(k)
	return `
		<label for="${id}">
			<input id="${id}" value="${k}" type="radio" name="${name}"${value == k ? ' checked' : ''}/>
			<span>${v}</span>
		</label>
	`
}
//approved
field.radio = ({name, action = '', value = '', values}) => `
	<div style="
		display: grid;
		gap: 0.7rem;
	">
		${Object.entries(values).map(([k, v]) => showRadio(k, v, name, value || '')).join('')}
		<script>
			(div => {
				for (const input of div.querySelectorAll('input')) {
					input.addEventListener('input', async () => {
						const send = await import('/-dialog/send.js').then(r => r.default)
						const ans = await send('${action}', {${name}: input.value})
						if (ans.msg) {
							const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
							Dialog.alert(ans.msg)
						}
					})
				}
			})(document.currentScript.parentElement)
		</script>
	</div>
`
//approved
field.switch = ({name, reloaddiv, go, goid, reload, action, value, values, args = {}}) => {
	return `
	<span>
		<button class="a field" style="display: inline-block; cursor:pointer;">${values[value || ""]}</button>
		<script>
			(btn => {
				btn.addEventListener('click', async (e) => {

					const senditmsg = await import('/-dialog/senditmsg.js').then(r => r.default)
					const args = ${JSON.stringify(args)}
					args.ctrl = e.ctrlKey ? 'yes' : ''
					const ans = await senditmsg(btn, '${action}', args)
					
					const status = ans['${name}']
					if (!ans.result) return 

					const values = ${JSON.stringify(values)}
					if (values[status || '']) btn.innerHTML = values[status || '']
					
					btn.dispatchEvent(new CustomEvent("field-saved", { detail: ans }))
					const Client = await window.getClient()

					if (${!!reloaddiv}) Client.reloaddiv("${reloaddiv}")
					if (${!!go}) Client.go("${go}" + ("${goid}" ? ans["${goid}"] : ''))
					if (${!!reload}) Client.reload()

				})
			})(document.currentScript.previousElementSibling)
		</script>
	</span>`
}
field.prompt = ({
		ok = 'ОК', unit = '', recaptcha = false, label = 'Укажите ваш Email', descr,
		cls = '',
		layer = false,
		input = null,
		onlyfuture = false,
		value = '', name = 'email', type = 'email', action, args = {}, go, reloaddiv, goid, reload
	}) => {
	return `
		<span>
			<button class="field ${cls}">${value}${unit}</button>
			<script>
				(btn => {
					btn.addEventListener('click', async () => {
						const Prompt = await import('/-dialog/prompt/Prompt.js').then(r => r.default)
						const layer = ${JSON.stringify(layer)}
						Prompt.open({
							type:'${type}',
							layer,
							onlyfuture: ${onlyfuture},
							descr: '${descr || ''}',
							value: '${value || ''}',
							input: '${input || ''}',
							name:'${name}',
							placeholder:'${label}',
							ok: '${ok}',
							click: async value => {
								const senditmsg = await import('/-dialog/senditmsg.js').then(r => r.default)
								const args = ${JSON.stringify(args)}
								args['${name}'] = value
								if (${!!recaptcha}) {
									const recaptcha = await import('/-dialog/recaptcha.js').then(r => r.default)	
									const token = await recaptcha.getToken()
									args["g-recaptcha-response"] = token
								}
								const ans = await senditmsg(btn, '${action}', args)
								if (ans.result && (ans['${name}'] || ans['${name}'] == 0)) btn.innerHTML = ans['${name}'] + '${unit}'

								if (ans.result) btn.dispatchEvent(new CustomEvent("field-saved", { detail: ans }))
								const Client = await window.getClient()
								const goid = "${goid ? goid : ''}"
								if (ans.result && ${!!reloaddiv}) Client.reloaddiv('${reloaddiv}')
								if (ans.result && ${!!go}) Client.go('${go}' + (goid ? ans[goid] : ''))
								if (ans.result && ${!!reload}) Client.reload()
								return ans.result
							}
						})
					})
				})(document.currentScript.previousElementSibling)
			</script>
		</span>
	`
}



field.search = ({label = 'Поиск', descr, value, name = 'name', search, find = 'find', action, confirm, args = {}, go, reloaddiv, goid, reload}) => {
	return `
		<span>
			<button class="field">${value||label}</button>
			<script>
				(btn => {
					btn.addEventListener('click', async () => {
						const Search = await import('/-dialog/search/Search.js').then(r => r.default)
						let descr = '${descr || ''}'
						const ask = "${confirm || ''}"
						if (ask && !window.confirm(ask)) return
						if (!descr && ask) descr = ask
						Search.open({
							action:'${search}',
							descr: descr,
							placeholder:'${label}',
							click: async (row, need) => {
								const senditmsg = await import('/-dialog/senditmsg.js').then(r => r.default)
								const args = ${JSON.stringify(args)}
								args['${name}'] = row['${find}']
								args['search'] = need.value
								const ans = await senditmsg(btn, '${action}', args)
								if (ans.result && (ans['${name}'] || ans['${name}'] == 0)) btn.innerHTML = ans['${name}']
								if (ans.result) btn.dispatchEvent(new CustomEvent("field-saved", { detail: ans }))
								const Client = await window.getClient()
								const goid = "${goid ? goid : ''}"
								if (ans.result && ${!!reloaddiv}) Client.reloaddiv('${reloaddiv}')
								if (ans.result && ${!!go}) Client.go('${go}' + (goid ? ans[goid] : ''))
								if (ans.result && ${!!reload}) Client.reload()
								return ans.result
							}
						})
					})
				})(document.currentScript.previousElementSibling)
			</script>
		</span>
	`
}
//approved
field.button = ({label, name = '', cls = '', action, args = {}, go = '', reloaddiv = '', goid = '', confirm, reload}) => {
	return `
		<span>
			<button class="field ${cls}">${label}</button>
			<script>
				(btn => {
					btn.addEventListener('click', async () => {
						if (btn.classList.contains('process')) return
						const ask = "${confirm || ''}"
						if (ask && !window.confirm(ask)) return
						const senditmsg = await import('/-dialog/senditmsg.js').then(r => r.default)
						const args = ${JSON.stringify(args)}
						const ans = await senditmsg(btn, '${action}', args)

						if (!ans.result) return 
						btn.dispatchEvent(new CustomEvent("field-saved", { detail: ans }))
						const Client = await window.getClient()
						if (${!!name} && (ans["${name}"] || ans["${name}"] == 0)) btn.innerHTML = ans["${name}"]
						if (${!!reloaddiv}) Client.reloaddiv("${reloaddiv}")
						if (${!!go}) Client.go("${go}" + ("${goid}" ? ans["${goid}"] : ''))
						if (${!!reload}) Client.reload()
					})
				})(document.currentScript.previousElementSibling)
			</script>
		</span>
	`
}
//approved
field.area = ({name, label, action, value}) => {
	const id = 'field-' + nicked(label)
	return `
		<div class="float-label success">
			<div name="${name}" contenteditable id="${id}" class="field">${value}</div>
			<label for="${id}">${label}</label>
			${showStatus()}
			<script>
				(float => {
					const field = float.querySelector('.field')					
					field.addEventListener('input', async () => {
						const sendit = await import('/-dialog/sendit.js').then(r => r.default)
						const ans = await sendit(float, '${action}', {${name}: field.innerHTML})
						field.dispatchEvent(new CustomEvent("field-saved", { detail: ans }))
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
//approved
field.text = ({name, label, action, args = {}, value, type = 'text'}) => {
	const id = 'field-' + nicked(label)
	return `
		<div class="float-label success">
			<input 
				
				name="${name}" 
				type="${type}" 
				id="${id}" 
				value="${value}" 
				placeholder="${label}" 
				class="field">
			<label for="${id}">${label}</label>
			${showStatus()}
			<script>
				(float => {
					const field = float.querySelector('.field')					
					field.addEventListener('input', async () => {
						const sendit = await import('/-dialog/sendit.js').then(r => r.default)
						let value = field.value
						if (~['datetime-local', 'date'].indexOf(field.type)) value = Math.floor(new Date(field.value).getTime() / 1000)
						const args = ${JSON.stringify(args)}
						args[field.name] = value
						const ans = await sendit(float, '${action}', args)
						field.dispatchEvent(new CustomEvent("field-saved", { detail: ans }))
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


//approved
field.percent = ({name, label, action, value}) => {
	const id = 'field-' + nicked(label)
	return `
		<div class="float-label success">
			<input 
				min="0"
				max="100"
				name="${name}" 
				type="number" 
				id="${id}" 
				value="${value}" 
				placeholder="${label}" 
				class="field">
			<label for="${id}">${label}</label>
			${showStatus()}
			<script>
				(float => {
					const field = float.querySelector('.field')					
					field.addEventListener('input', async () => {
						const sendit = await import('/-dialog/sendit.js').then(r => r.default)
						let value = field.value
						if (~['datetime-local', 'date'].indexOf(field.type)) value = Math.floor(new Date(field.value).getTime() / 1000)
						const ans = await sendit(float, '${action}', {[field.name]: value})
  						field.dispatchEvent(new CustomEvent("field-saved", { detail: ans }))
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

//approved
field.datetime = ({name, action, label = '', value = '', onlyfuture = false}) => {
	if (value) {
		value = new Date(value * 1000)
		value.setMinutes(value.getMinutes() - value.getTimezoneOffset())
		value = value.toISOString().slice(0,16)
	} else {
		value = ''
	}
	const id = 'field-' + nicked(label)
	return `
		<div class="float-label success">
			<input 
				min="${onlyfuture ? new Date().toISOString().split('T')[0] : '2000-01-01'}" 
				max="2099-01-01"
				name="${name}" 
				type="datetime-local" 
				id="${id}" 
				value="${value}" 
				placeholder="${label}" 
				class="field">
			<label for="${id}">${label}</label>
			${showStatus()}
			<script>
				(float => {
					const field = float.querySelector('.field')					
					const check = async () => {
						console.log(field.value)
						if (field.value) return
						const sendit = await import('/-dialog/sendit.js').then(r => r.default)
						sendit.setClass(float, 'error')
						float.title = "Укажите дату полностью"
					}
					field.addEventListener('focus', check)
					field.addEventListener('click', check)
					field.addEventListener('keydown', check)

					field.addEventListener('input', async () => {
						const sendit = await import('/-dialog/sendit.js').then(r => r.default)
						const value = Math.floor(new Date(field.value).getTime() / 1000)
						const ans = await sendit(float, '${action}', {[field.name]: value})
						//if (ans[field.name]) {
						//	let value = new Date(ans[field.name] * 1000)
						//	value.setMinutes(value.getMinutes() - value.getTimezoneOffset())
						//	value = value.toISOString().slice(0,16)
						//	field.value = value
						//}

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

//approved
field.date = ({name, action, label = '', value = '', onlyfuture = false}) => {
	if (value) {
		value = new Date(value * 1000)
		value.setMinutes(value.getMinutes() - value.getTimezoneOffset())
		value = value.toISOString().slice(0,10)
	} else {
		value = ''
	}
	const id = 'field-' + nicked(label)
	return `
		<div class="float-label success">
			<input 
				min="${onlyfuture ? new Date().toISOString().split('T')[0] : ''}" 
				name="${name}" 
				type="date" 
				id="${id}" 
				value="${value}" 
				placeholder="${label}" 
				class="field">
			<label for="${id}">${label}</label>
			${showStatus()}
			<script>
				(float => {
					const field = float.querySelector('.field')
					const check = async () => {
						console.log(field.value)
						if (field.value) return
						const sendit = await import('/-dialog/sendit.js').then(r => r.default)
						sendit.setClass(float, 'error')
						float.title = "Укажите дату полностью"
					}
					field.addEventListener('focus', check)
					field.addEventListener('click', check)
					field.addEventListener('keydown', check)				
					field.addEventListener('input', async () => {
						const sendit = await import('/-dialog/sendit.js').then(r => r.default)
						const value = Math.floor(new Date(field.value).getTime() / 1000)
						const ans = await sendit(float, '${action}', {${name}: value})
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

//approved
field.textok = ({name, label, action, value, newvalue = '', go, clear = false, reloaddiv, goid, type = 'text'}) => {
	const id = 'field-' + nicked(label)
	return `
		<div class="float-label ${value ? 'success' : 'submit'}">
			<input name="${name}" type="${type}" id="${id}" value="${value || newvalue}" placeholder="${label}" class="field">
			<label for="${id}">${label}</label>
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
							if (ans.result && ${!!clear}) field.value = ''
							field.dispatchEvent(new CustomEvent("field-saved", { detail: ans }))
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

//approved
field.textdisabled = ({label, value}) => {
	const id = 'field-' + nicked(label)
	return `
		<div class="float-label success">
			<input disabled type="text" id="${id}" value="${value}" placeholder="${label}" class="field">
			<label for="${id}">${label}</label>
			${showStatus()}
		</div>
	`
}

const showOption = (obj, vname, tname, value, def) => `<option ${value == obj[vname] ? 'selected ' : ''}value="${obj[vname]}">${obj[tname] || def}</option>`

//approved
field.select = ({name, action, options, vname, tname, def = '', go, goid, selected, label, status, before, after}) => {
	const id = 'field-' + nicked(label)
	return `
		<div class="float-label ${status || ''}">
			<select name="${name}" id="${id}" class="field">
				${before ? '<option value="before">' + before.title + '</option>' : ''}
				${options.map(obj => showOption(obj, vname, tname, selected?.[vname], def))}
				${!after || !after.action ? '' : '<optgroup label="------------"></optgroup><option value="after">' + after.title + '</option>'}
			</select>
			<label for="${id}">${label}</label>
			${status ? showStatus() : ''}
			<script>
				(float => {
					const select = float.querySelector('.field')
					const status = float.querySelector('.status')
					const makeaction = async (opt, value = '') => {
						if (opt.action) {
							const sendit = await import('/-dialog/sendit.js').then(r => r.default)

							const ans = await sendit(float, opt.action, value ? {[opt.name]: value} : false)

							select.dispatchEvent(new CustomEvent("field-saved", { detail: ans }))
							
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
						if (value == 'before') {
							const opt = ${JSON.stringify(before)}
							await makeaction(opt)
						} else if (value == 'after') {
							const opt = ${JSON.stringify(after)}
							await makeaction(opt)
						} else {
							const opt = ${JSON.stringify({name, action, go, goid})}
							await makeaction(opt, value)
						}
						select.disabled = false
					})

					if (status) status.addEventListener('click', async () => {
						const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
						Dialog.alert(float.title || "Сохранено!")
					})
				})(document.currentScript.parentElement)
			</script>
		</div>
	`
}
const showStatus = () => `
	<div class="status" style="border: none;">
		<button class="submit transparent" style="color: brown; font-size: 16px; font-weight: bold; padding:0; border-radius: 4px; border: solid 1px color-mix(in srgb, currentColor 10%, transparent)">
			OK
		</button>
		<div class="success" style="color: var(--success); font-size: 16px; font-weight: bold; padding:0; border-radius: var(--size); border: solid 1px color-mix(in srgb, currentColor 10%, transparent)">
			✔
		</div>
		<div class="process" style="color: gray; border-radius: var(--size); border: solid 1px color-mix(in srgb, currentColor 10%, transparent)">
			<svg style="margin:4px" fill="currentColor" width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
				<path d="M12 22c5.421 0 10-4.579 10-10h-2c0 4.337-3.663 8-8 8s-8-3.663-8-8c0-4.336 3.663-8 8-8V2C6.579 2 2 6.58 2 12c0 5.421 4.579 10 10 10z" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</div>
		<button class="error transparent" style="color: var(--danger); font-size: 24px; font-weight:bold; padding:0; border-radius: var(--size); border: solid 1px color-mix(in srgb, currentColor 10%, transparent)">
			!
		</button>
	</div>
`

export default field