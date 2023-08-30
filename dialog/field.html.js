import nicked from "/-nicked"
const field = {}

field.images = ({name = 'file', file_id_name = 'file_id', action, files, remove}) => {
	const id = 'field-' + nicked(name)
	return `
		<div class="field-squares">
			${files.map(file => showFile(file, file_id_name)).join('')}
			<label class="show" for="${id}">
				<input multiple id="${id}" name="${name}" type="file" accept="image/*">
			</label>
		</div>
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
			})(document.currentScript.previousElementSibling)
		</script>
	`
}
const showFile = (file, file_id_name) => `
	<div class="field-square show" data-id="${file[file_id_name]}" data-src="${file.src}">
		<div class="remove">&times;</div>
		<img src="${file.src}">
	</div>
`
const showSrc = (src) => `
	<div class="field-square show" data-src="${src}">
		<div class="remove">&times;</div>
		<img src="${src}">
	</div>
`
field.image = ({name = 'file', action, src, remove}) => {
	const id = 'field-' + nicked(name)
	return `
		<div class="field-squares" style="display: block;">
			${src ? showSrc(src) : '' }
			<label class="field-square ${src ? '' : 'show'}" for="${id}">
				<input id="${id}" name="${name}" type="file" accept="image/*">
			</label>
		</div>
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
			})(document.currentScript.previousElementSibling)
		</script>
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
field.radio = ({name, action = '', value = '', values}) => `
	<div style="
		display: grid;
		gap: 0.7rem;
	">
		${Object.entries(values).map(([k, v]) => showRadio(k, v, name, value || '')).join('')}
	</div>
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
`
field.switch = ({name, action, value, values}) => {
	return `
	<div>
		<button class="a" style="display: inline-block; cursor:pointer; padding:calc(.75rem / 3) 0">${values[value || ""]}</button>
		<script>
			(btn => {
				btn.addEventListener('click', async () => {
					const send = await import('/-dialog/send.js').then(r => r.default)
					const ans = await send('${action}')
					const status = ans['${name}']
					const values = ${JSON.stringify(values)}
					if (ans.msg) {
						const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
						Dialog.alert(ans.msg)
					}
					if (ans.result) btn.innerHTML = values[status || '']
  					btn.dispatchEvent(new CustomEvent("field-saved", { detail: ans }))
				})
			})(document.currentScript.previousElementSibling)
		</script>
	</div>`
}
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
					if (ans.msg) {
						const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
						Dialog.alert(ans.msg)
					}
					if (ans.result) btn.querySelector('.a').innerHTML = values[status || '']
				})
			})(document.currentScript.previousElementSibling)
		</script>
	</div>`
}
// field.prompt = ({name, go, reloaddiv, goid, confirm, title, label, title, action}) => {
	
// 	return `
// 		<button>${title}</button>
// 		<script>
// 			(btn => {
// 				btn.addEventListener('click', async () => {
// 					if (btn.classList.contains('process')) return
// 					const ask = "${confirm || ''}"
// 					const prompt = ${JSON.stringify(prompt)}
// 					if (prompt) {
// 						const second = window.prompt(prompt.title, prompt.value)
// 						if (!second) return
// 					}  
// 					if (ask && !window.confirm(ask)) return
// 					const sendit = await import('/-dialog/sendit.js').then(r => r.default)
// 					const ans = await sendit(btn, '${action}')
// 					if (ans.msg) {
// 						const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
// 						Dialog.alert(ans.msg)
// 						btn.innerHTML = ans.msg
// 					}
// 					const Client = await window.getClient()
// 					const goid = "${goid ? goid : ''}"
// 					if (ans.result && ${!!reloaddiv}) Client.reloaddiv('${reloaddiv}')
// 					if (ans.result && ${!!go}) Client.go('${go}' + (goid ? ans[goid] : ''))
// 				})
// 			})(document.currentScript.previousElementSibling)
// 		</script>
// 	`
// }
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
field.text = (name, title, action, value, type = 'text') => {
	const id = 'field-' + nicked(title)
	return `
		<div class="float-label success">
			<input 
				
				name="${name}" 
				type="${type}" 
				id="${id}" 
				value="${value}" 
				placeholder="${title}" 
				class="field">
			<label for="${id}">${title}</label>
			${showStatus()}
			<script>
				(float => {
					const field = float.querySelector('.field')					
					field.addEventListener('input', async () => {
						const sendit = await import('/-dialog/sendit.js').then(r => r.default)
						let value = field.value
						if (~['datetime-local', 'date'].indexOf(field.type)) value = Math.floor(new Date(field.value).getTime() / 1000)
						const ans = await sendit(float, '${action}', {[field.name]: value})
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
field.ok = ({name, title, action, value, newvalue, go, reloaddiv, goid, type = 'text'}) => {
	const id = 'field-' + nicked(title)
	return `
		<div class="float-label ${value ? 'success' : 'submit'}">
			<input name="${name}" type="${type}" id="${id}" value="${value || newvalue}" placeholder="${title}" class="field">
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

//${!after || (after.action && options.some(obj => !obj[tname])) ? '' : '<optgroup label="------------"></optgroup><option value="after">' + after.title + '</option>'}
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
		</div>
		<script>
			(float => {
				const select = float.querySelector('.field')
				const status = float.querySelector('.status')
				const makeaction = async (opt, value = '') => {
					if (opt.action) {
						const sendit = await import('/-dialog/sendit.js').then(r => r.default)

						const ans = await sendit(float, opt.action, value ? {[opt.name]: value} : false)
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