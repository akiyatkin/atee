import Acc from '/-user/Acc.js'
import Move from '/-note/Move.js'
import send from '/-dialog/send.js'
import escapeText from '/-note/escapeText.js'

const splice = (text, start, size, chunk) => {
	return text.slice(0, start) + chunk + text.slice(start + size)
}
if (Move.debug && globalThis.window) {
	window.Test = await import('/-note/Test.js').then(r => r.default)
}


const Note = {	
	getCursor: (note) => ({
		start: note.area.selectionStart,
		size: note.area.selectionEnd - note.area.selectionStart,
		base: note.rev,
		direction: Number(note.area.selectionDirection == 'forward')
	}),
	makeTEXT: (text, change) => {
		return splice(text, change.start, change.remove.length, change.insert)
	},
	cursorHTML: async (note, cursor) => {
		if (cursor.user_id != note.user_id) {
			Move.cursorAfter(cursor, note.waitchanges)
			note.cursors[cursor.user_id] = cursor
			Note.viewHTML(note)
		}
	},
	changeHTML: async (note, change) => {
		//Пришёл change с сервера не моего сокета, но моего пользователя может быть
		
		Move.changeAfter(change, note.waitchanges)

		const mycursor = Note.getCursor(note)

		Move.cursorAfter(mycursor, [change])

		for (const i in note.cursors) {
			const cursor = note.cursors[i]
			Move.cursorAfter(cursor, [change])
		}
		if (change.cursor.user_id != note.user_id) {
			Move.cursorAfter(change.cursor, note.waitchanges)
			note.cursors[change.cursor.user_id] = change.cursor
		}

		note.rev = change.rev
		note.area.value = note.text = Note.makeTEXT(note.text, change)
		Note.viewHTML(note)

		//await note.inputpromise
		//note.inputpromise.start = true
		note.area.selectionStart = mycursor.start
		note.area.selectionEnd = mycursor.start + mycursor.size
		note.area.selectionDirection = mycursor.direction ? 'forward' : 'backward'
		//note.inputpromise.start = false


		
	},
	viewHTML: (note) => {
		const html = Note.makeHTML(note.text, note.cursors, note.waitchanges)
		note.view.innerHTML = html + '<br>'
	},
	makeHTML: (text, cursors, waitchanges = []) => {
		cursors = Object.values(cursors)

		// [2,3,4,5] - надо подсветить 2 после применения 3,4,5
		const lastchange = waitchanges[waitchanges.length - 1]
		
			
		const changes = [...waitchanges]
		const marks = []

		const steps = []
		while (changes.length) {
			const change = {...changes.pop()}
			const mark = {
				hue: 360, //mute
				start: change.start,
				size: change.insert.length
			}
			Move.cursorAfter(mark, steps)
			steps.unshift(change)
			marks.push(mark)
		}
		
		for (const mark of marks) cursors.push(mark)
		

		cursors.sort((a, b) => a.start - b.start)
		
		
		
		
		const splits = {}
		splits[0] = {pos:0, start:{}, end: {}, blinks: []}
		for (const {hue, start, size, direction} of cursors) {
			const end = start + size

			if (!splits[start]) splits[start] = {pos: start, start:{}, end:{}, blinks:[]}
			if (!splits[end]) splits[end] = {pos: end, start:{}, end:{}, blinks:[]}


			if (direction === 1) {
				splits[end].blinks.push(hue)
			} else if (direction === 0) {
				splits[start].blinks.push(hue)
			} else {
				//подсветка без курсора
			}

			if (!size) continue
			splits[start].start[hue] = hue
			splits[end].end[hue] = hue
		}

		
		const lights = Object.values(splits)
		lights.sort((a, b) => a.pos - b.pos)
		lights.map(light => {
			light.start = Object.values(light.start)
			light.end = Object.values(light.end)
		})


		const going = []
		for (const pos of lights) {
			for (const hue of pos.start) {
				going.push(hue)
			}
			for (const hue of pos.end) {
				going.splice(going.indexOf(hue), 1)
			}
			pos.colors = going.slice()
			delete pos.end
			delete pos.start
		}
		

		lights.reverse()
		let prev = text.length
		for (const light of lights) {
			const size = prev - light.pos
			light.part = escapeText(text.substr(light.pos, size))
			prev = light.pos
		}
		lights.reverse()
		/*
			[
				{pos:10, part, blinks:[gray], colors:[blue]}
				{pos:20, part, colors:[blue green]}
				{pos:30, part, colors:[green]}
				{pos:40, part }
				{pos:50, part, blinks:[brown red]}
			]
		*/
		
		let html = ''
		for (const light of lights) {
			for (const hue of light.blinks) {
				html += `<span style="--hue: ${hue}" class="cursor"></span>`
			}
			for (const hue of light.colors) {
				if (hue == 360) { //mute
					html += `<span class="select mute">`
				} else {
					html += `<span style="--hue: ${hue}" class="select">`	
				}
				
			}
			//html += light.part.replaceAll('&','&amp;')
			html += light.part
			for (const color of light.colors) {
				html += '</span>'
			}
		}
		return html
		
		/*
			`
				
				asd 10
				<span class="cursor gray"></span>
				<span class="cursor blue"></span>
					fasd 20
				</span>
				<span class="select blue">
				<span class="select green">
					fasd 30
				</span>
				</span>
				<span class="select green">
					просто 40
				</span>
				курсор 50 
				<span class="cursor brown"></span> 
				<span class="cursor red"></span>
			`
			`</span>`
		*/



		//text.slice(0, start)


		//return escapeText(text)
	},
	
	send: async (note, {signal, cursor, change}) => {
		// if (change) {
		// 	Note.moveBack({cursor:change.after, waitchanges})
		// 	Note.moveBack({cursor:change.before, waitchanges})
		// 	waitchanges.push(change)
		// }
		// if (cursor) {
		// 	Note.moveBack({cursor, waitchanges})
		// }

		const socket = await Note.open(note)   

		/*
			text - abc
			waitchanges[] = abc

			send - abc
			server - abc.23
			
			message - abc.23

			waitchanges.remove(abc)

		*/

		/*
			[1,2,3]
			1
			[2,3]
			b
			-3,-2, +b +2 +3
			2
			[3]
			[3,4,5]
			3
			[4,5]
			4
			[5]
			c
			-5, +c, +5
		*/
														

		const data = JSON.stringify({signal, cursor, change})

		if (Move.debug) {
			setTimeout(() => {
				if (socket.readyState > 1) return
				socket.send(data)
			}, 1000)
		} else {
			socket.send(data)
		}
	},
	getLink: (note) => {
		const wshost = note.wshost
		const protocol = location.protocol === "https:" ? "wss" : "ws"
		return protocol + '://'+ wshost + `/?rev=${note.rev}&date_load=${note.now}&note_id=${note.note_id}&note_token=${note.token}&user_id=${note.user_id}&user_token=${note.user_token}`
	},
	open: (note) => {
		if (!note.socket) {
			const socket = new Promise((resolve, reject) => {
				const link = Note.getLink(note)
				const socket = new WebSocket(link)
				socket.addEventListener('open', e => {
					for (const change of note.waitchanges) {
						Note.send(note, {change})
					}
					note.wrap.classList.add('joined')
					return resolve(socket)
				})
				const error = async e => {
					// for (const change of note.waitchanges) {
					// 	change.error = true
					// }
					const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
					Dialog.alert('Упс, что-то пошло не так. Нет соединения с сервером. <br>Обновите страницу или попробуйте продолжить позже.')
				}
				socket.addEventListener('error', error)
				socket.addEventListener('message', async event => {
					const {payload, my} = JSON.parse(event.data)
					const {cursor, change, signal} = payload
					if (signal) {
						signal.myuser = signal.user_id == note.user_id
						signal.my = my
						note.wrap.dispatchEvent(new CustomEvent("note-signal", { bubbles: false, detail: signal }))
						if (signal.type == 'reset') {
							note.rev = signal.rev
							note.text = signal.text
							note.area.value = note.text
							Note.viewHTML(note)
						} else if (signal.type == 'onlyview') {
							const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
							Dialog.alert('Доступен только просмотр. Такие дела.')	
						} else if (signal.type == 'reject') {
							if (signal.myuser) {
								const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
								Dialog.alert('Ваш доступ был отозван. Такие дела.')	
							}
						} else if (signal.type == 'leave') {
							delete note.cursors[signal.user_id]
						} else if (signal.type == 'joined') {
							if (signal.user_id == note.user_id) {
								note.area.style = "--hue: " + signal.hue
							}
						} else if (signal.type == 'rename') {
						} else if (signal.type == 'blur') {
							Note.viewHTML(note)
						} else if (signal.type == 'focus') {
							if (signal.cursor.user_id != note.user_id) {
								Move.cursorAfter(signal.cursor, note.waitchanges)
								note.cursors[signal.cursor.user_id] = signal.cursor
								Note.viewHTML(note)
							}
						}
					}
					await note.inputpromise
					

					if (cursor) {
						Note.cursorHTML(note, cursor)
					} else if (change) {
						if (my) {
							note.rev = change.rev
							//Note.send(note, {signal:{type:'base', base:note.rev}})
							note.waitchanges.shift()
							Note.viewHTML(note)
						} else {
							for (const wait of note.waitchanges) {
								Move.changeAfter(wait, [change])

							}
							Note.changeHTML(note, change)
						}
						note.wrap.dispatchEvent(new CustomEvent("note-change", { bubbles: false, detail: change }))
						//const data = JSON.stringify({signal:{type:'base', base:note.rev}})
						//socket.send(data)
					}
				})
				socket.addEventListener('close', event => {
					note.wrap.classList.remove('joined')
					delete note.socket
				})
				const cancel = () => {
					if (!note.area.closest('body') && socket.readyState < 2) {
						socket.removeEventListener('error', error)
						socket.close()
					}
					if (socket.readyState > 1) {
						window.removeEventListener('crossing-sitemap-headready', cancel)
					}
				}
				window.addEventListener('crossing-sitemap-headready', cancel)
			})
			note.socket = socket
			
		}
		return note.socket
	}
}
export default Note