import Acc from '/-user/Acc.js'
import Move from '/-note/Move.js'
import send from '/-dialog/send.js'
const escapeText = (text) => text.replace(/[<>]/g, tag => ({"<": '&lt;','>': '&gt;'})[tag] || tag)
const splice = (text, start, size, chunk) => {
	return text.slice(0, start) + chunk + text.slice(start + size)
}
const Note = {
	getCursor: (note) => ({
		start: note.area.selectionStart,
		size: note.area.selectionEnd - note.area.selectionStart,
		base: note.rev,
		direction: Number(note.area.selectionDirection == 'forward')
		//ordain: ++note.ordain //Важен для change если my
	}),
	makeTEXT: (text, change) => {
		return splice(text, change.start, change.remove.length, change.insert)
	},
	cursorHTML: async (note, cursor) => {
		//console.log('cursor', note.waitchanges.length)
		if (cursor.user_id != note.user_id) {
			Move.cursorAfter(cursor, note.waitchanges)
			note.cursors[cursor.user_id] = cursor
			Note.viewHTML(note)
		}
	},
	test: () => {
		const cursor = {"start":3,"size":0,"base":2535,"direction":1,"user_id":"1","color":"red"}
		const hang = {"start":3,"remove":"4","insert":"","base":2535,"ordain":1,"cursor":{"start":3,"size":0,"base":2535,"direction":1}}

		/*
			cursor
			a[n]b
			
			rewind
			z(y)v
			z(x)v

			a = 3
			ao = 3
			an = 3


			z = 3
			y = 1
		*/

		console.log(cursor)
		Move.cursorAfter(cursor, [hang])
		console.log(cursor)
	},
	changeHTML: async (note, change) => {
		//Пришёл change с сервера не моего сокета, но моего пользователя может быть
		
		Move.changeAfter(change, note.waitchanges, true)

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
		const html = Note.makeHTML(note.text, note.cursors)
		note.view.innerHTML = html + '<br>'
	},
	makeHTML: (text, cursors) => {
		//console.log('cursors', cursors)
		//const colors = ['red', 'green','blue','orange','yellow']
		//for (const user_id in cursors) {
			//cursors[user_id].color = colors.shift() || 'gray'
		//}

		cursors = Object.values(cursors)
		cursors.sort((a, b) => a.start - b.start)
		
		
		

		const splits = {}
		splits[0] = {pos:0, start:{}, end: {}, blinks: []}
		for (const {color, start, size, direction} of cursors) {
			const end = start + size

			if (!splits[start]) splits[start] = {pos: start, start:{}, end:{}, blinks:[]}
			if (!splits[end]) splits[end] = {pos: end, start:{}, end:{}, blinks:[]}

			if (direction) {
				splits[end].blinks.push(color)
			} else {
				splits[start].blinks.push(color)
			}

			if (!size) continue
			splits[start].start[color] = color
			splits[end].end[color] = color
		}

		
		const lights = Object.values(splits)
		lights.sort((a, b) => a.pos - b.pos)
		lights.map(light => {
			light.start = Object.values(light.start)
			light.end = Object.values(light.end)
		})


		const going = []
		for (const pos of lights) {
			for (const color of pos.start) {
				going.push(color)
			}
			for (const color of pos.end) {
				going.splice(going.indexOf(color), 1)
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

		
		let html = ''
		for (const light of lights) {
			for (const color of light.blinks) {
				html += `<span class="cursor ${color}"></span>`
			}
			for (const color of light.colors) {
				html += `<span class="select ${color}">`
			}
			html += light.part
			for (const color of light.colors) {
				html += '</span>'
			}
		}
		return html
		/*
			[
				{pos:10, part, blinks:[gray], colors:[blue]}
				{pos:20, part, colors:[blue green]}
				{pos:30, part, colors:[green]}
				{pos:40, part }
				{pos:50, part, blinks:[brown red]}
			]
		*/
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
		//console.log('send', data)

		if (Move.debug) {
			setTimeout(() => {
				if (socket.readyState > 1) return
				socket.send(data)
			}, 1000)
		} else {
			socket.send(data)
		}
		
	},
	open: (note) => {
		const wshost = ~location.host.indexOf('127.0.0.1') ? '127.0.0.1:8889' : 'ws.' + location.host
		if (!note.socket) {
			const socket = new Promise((resolve, reject) => {
				const protocol = location.protocol === "https:" ? "wss" : "ws"

				const socket = new WebSocket(protocol + '://'+ wshost + `/?rev=${note.rev}&date_load=${note.now}&note_id=${note.note_id}&note_token=${note.token}&user_id=${note.user_id}&user_token=${note.user_token}`)
				socket.addEventListener('open', e => {
					note.area.disabled = false
					return resolve(socket)
				})
				const error = async e => {
					//console.log('error', e)
					//note.area.disabled = true
					const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
					Dialog.alert('Упс, что-то пошло не так. Нет соединения с сервером. <br>Обновите страницу или попробуйте продолжить позже.')
				}
				socket.addEventListener('error', error)
				socket.addEventListener('message', async event => {
					
					
					const {payload, my} = JSON.parse(event.data)
					const {cursor, change, signal} = payload

					
					if (signal) {
						if (signal.type == 'reset') {
							note.rev = signal.rev
							note.text = signal.text
							note.area.value = note.text
							Note.viewHTML(note)
							
						} else if (signal.type == 'rename') {
							const Client = await window.getClient()
							Client.reloaddiv('NOTES')
						} else if (signal.type == 'blur') {
							//delete note.cursors[signal.user_id]
							//Note.viewHTML(note)
						} else if (signal.type == 'focus') {
							if (signal.cursor.user_id != note.user_id) {
								note.cursors[signal.cursor.user_id] = signal.cursor
								Note.viewHTML(note)
							}
						}
					}
					await note.inputpromise
					//console.log('message', my, change, cursor, signal)

					if (cursor) {
						Note.cursorHTML(note, cursor)
					} else if (change) {
						if (my) {
							note.rev = change.rev
							//Note.send(note, {signal:{type:'base', base:note.rev}})
							note.waitchanges.shift()
							return
						} else {
							Note.changeHTML(note, change)
						}
						//const data = JSON.stringify({signal:{type:'base', base:note.rev}})
						//socket.send(data)
					}
				})
				socket.addEventListener('close', event => {
					note.area.disabled = true
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