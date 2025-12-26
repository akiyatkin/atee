import Note from '/-note/Note.js'
import Move from '/-note/Move.js'
import Light from '/-note/Light.js'
import send from '/-dialog/send.js'

const Place = {Move}

Place.getLink = (note, user) => {
	const wshost = note.wshost
	const protocol = location.protocol === "https:" ? "wss" : "ws"
	return protocol + '://'+ wshost + `/?rev=${note.rev}&date_load=${note.now}&note_id=${note.note_id}&user_id=${user.user_id}&user_token=${user.token}`
}

Place.getOrCreateUser = async () => {
	const ans = await send('/-user/set-user-id')
	//await new Promise(resolve => setTimeout(resolve, 2000))
	return ans.user
}

Place.send = async (wrap, note, user, {signal, cursor, change}) => {
	const socket = await Place.prepareSocketAndSpy(wrap, note, user)
	// if (change) {
	// 	Note.moveBack({cursor:change.after, waitchanges})
	// 	Note.moveBack({cursor:change.before, waitchanges})
	// 	waitchanges.push(change)
	// }
	// if (cursor) {
	// 	Note.moveBack({cursor, waitchanges})
	// }

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
													

	const data = JSON.stringify({change, cursor, signal})

	//if (change?.insert) await new Promise(resolve => setTimeout(resolve, 1000))
	//else  await new Promise(resolve => setTimeout(resolve, 1))
	//await new Promise(resolve => setTimeout(resolve, Math.round(Math.random()) * 1000 + 1))
	//await new Promise(resolve => setTimeout(resolve, 1000))
	socket.send(data)


	// if (Move.debug) {
	// 	setTimeout(() => {
	// 		if (socket.readyState > 1) return
	// 		socket.send(data)
	// 	}, 1000)
	// } else {
		
	//}
}
Place.prepareSocketAndSpy = (wrap, note, user) => {
	if (note.socket) return note.socket
	const socket = note.socket = new Promise((resolve, reject) => {
		const area = wrap.querySelector('.area')
		const view = wrap.querySelector('.view')
		const link = Place.getLink(note, user)
		const socket = new WebSocket(link)
		
		const error = async e => {
			// for (const change of note.waitchanges) {
			// 	change.error = true
			// }
			const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
			Dialog.alert('Упс, что-то пошло не так. Нет соединения с сервером. <br>Обновите страницу или попробуйте продолжить позже.')
		}
		socket.addEventListener('error', error)

		socket.addEventListener('open', e => {
			for (const change of note.waitchanges) {
				Place.send(wrap, note, user, {change})
			}
			wrap.classList.add('joined')
			return resolve(socket)
		})

		socket.addEventListener('message', async event => {
			const {payload, my, from, to} = JSON.parse(event.data)
			const {cursor, change, signal} = payload
			const {user_id, hue} = from
			const {rev} = to

			let sethtmlview = false
			let mycursor = false

			if (signal) {
				wrap.dispatchEvent(new CustomEvent("note-signal", { bubbles: false, detail: {signal, my, user_id} }))
				if (signal.type == 'reset') {
					note.rev = rev
					note.text = signal.text
					area.value = note.text
					sethtmlview = true
				} else if (signal.type == 'isslash') {
					note.isslash = signal.bit
				} else if (signal.type == 'isbracket') {
					note.isbracket = signal.bit
					sethtmlview = true
				} else if (signal.type == 'isbold') {
					note.isbold = signal.bit
					sethtmlview = true					
				} else if (signal.type == 'iswrap') {
					note.iswrap = signal.bit
					if (signal.bit) wrap.classList.add('wrap')
					else wrap.classList.remove('wrap')

				} else if (signal.type == 'onlyview') {
					const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
					Dialog.alert('Доступен только просмотр. Такие дела.')	
				} else if (signal.type == 'reject') {
					if (user_id == user.user_id) {
						const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
						Dialog.alert('Ваш доступ был отозван. Такие дела.')	
					}
				} else if (signal.type == 'leave') {
					delete note.cursors[signal.user_id]
				} else if (signal.type == 'joined') {
					// if (user_id == user.user_id) {
					// 	area.style = "--hue: " + hue
					// }
				} else if (signal.type == 'rename') {
				} else if (signal.type == 'blur') {
					sethtmlview = true
				} else if (signal.type == 'focus') {
					// if (user_id != user.user_id) {
					// 	// Move.cursorAfter(signal.cursor, note.waitchanges)
					// 	// note.cursors[user_id] = signal.cursor
					// 	sethtmlview = true
					// }
				}
			}
			

			if (change) {
				note.rev = rev
				if (my) {
					note.waitchanges.shift()
					sethtmlview = true
				} else {
					for (const wait of note.waitchanges) {
						Move.changeAfter(wait, [change])
					}
					Move.changeAfter(change, note.waitchanges)

					mycursor = Place.createCursor(area, note)

					Move.cursorAfter(mycursor, [change])

					for (const i in note.cursors) {
						const cursor = note.cursors[i]
						Move.cursorAfter(cursor, [change])
					}
					area.value = note.text = Place.splice(note.text, change.start, change.remove.length, change.insert)
					sethtmlview = true
					wrap.dispatchEvent(new CustomEvent("note-change", { bubbles: false, detail: {change, my, user_id} }))
				}
			}
			if (cursor) {
				if (user_id != user.user_id) {
					Move.cursorAfter(cursor, note.waitchanges)
					cursor.hue = hue
					note.cursors[user_id] = cursor
					sethtmlview = true
				} else {
					if (!my) { //Когда открыта соседняя вкладка
						mycursor = cursor
					}
				}
			}

			if (sethtmlview) {
				view.innerHTML = Light.view(note)
				
			}
			if (mycursor) {
				area.selectionStart = mycursor.start
				area.selectionEnd = mycursor.start + mycursor.size
				area.selectionDirection = mycursor.direction ? 'forward' : 'backward'
			}
		})
		socket.addEventListener('close', event => {
			wrap.classList.remove('joined')
			delete note.socket
		})
		const cancel = () => {
			if (!area.closest('body') && socket.readyState < 2) {
				socket.removeEventListener('error', error)
				socket.close()
			}
			if (socket.readyState > 1) {
				window.removeEventListener('crossing-sitemap-headready', cancel)
			}
		}
		window.addEventListener('crossing-sitemap-headready', cancel)
	})
	return note.socket
}

Place.createCursor = (area, note) => ({
	start: area.selectionStart,
	size: area.selectionEnd - area.selectionStart,
	base: note.rev,
	direction: Number(area.selectionDirection == 'forward')
})
Place.splice = (text, start, size, chunk) => {
	return text.slice(0, start) + chunk + text.slice(start + size)
}



export default Place