const note = {}

note.css = ['/-note/style.css']


import Note from '/-note/Note.js'
note.checkErr = (data, env) => data.result ? '': `
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
note.ROOT = (data, env) => note.checkErr(data, env) || `
	<style>
		${env.scope} .notewrapper {
			opacity:0;
		}
	</style>
	<div class="notewrapper">
		<div class="note view" 
			aria-hidden="true"
			placeholder="Напишите что-нибудь" aria-label="Напишите что-нибудь">${Note.makeHTML(data.note.text, data.note.cursors)}<br></div>
		<textarea autocomplete="off" class="note area" 
			spellcheck="false"
			placeholder="Напишите что-нибудь" aria-label="Напишите что-нибудь" role="textbox" 
			tabindex="0">
${data.note.text}</textarea>
		<script>
			(div => {
				const note = ${JSON.stringify(data.note)}
				window.note = note
				//console.log(note.cursors)
				note.area = div.getElementsByClassName('area')[0]

				let beforecursor = {
					start: Number(note.cursor_start),
					size: Number(note.cursor_size),
					direction: Number(note.cursor_direction)
				}
				note.area.selectionStart = beforecursor.start
				note.area.selectionEnd = beforecursor.start + beforecursor.size
				note.area.selectionDirection = beforecursor.direction ? 'forward' : 'backward'

				note.view = div.querySelector('.view')
				note.waitchanges = []
				note.ordain = 0
				note.inputpromise = new Promise(async resolve => {
					const Note = await import('/-note/Note.js').then(r => r.default)
					const Move = await import('/-note/Move.js').then(r => r.default)
					Note.Move = Move
					window.Note = Note
					await checkUser(note)
					resolve(Note)
				})
				
				const checkUser = async (note) => {
					const send = await import('/-dialog/send.js').then(r => r.default)
					if (!note.user_id) { //При авторизации слой должен обновиться, при global user
						const ans = await send('/-user/set-user-id')
						note.user_id = ans.user_id
						note.user_token = ans.user_token
					}
				}
				

				const TAB = 9
				const ENTER = 13
				const HOME = 36
				const END = 35
				const LEFT = 37
				const RIGHT = 39
				const UP = 38
				const DOWN = 40
				const A = 65

				
				
				note.area.addEventListener('focus', async e => {

					const Note = await note.inputpromise
					const cursor = Note.getCursor(note)
					Note.send(note, {signal:{type:'focus', cursor, base:note.rev}})
				})
				note.area.addEventListener('blur', async e => {
					const Note = await note.inputpromise
					Note.send(note, {signal:{type:'blur', base:note.rev}})
				})

				note.area.focus()
				

				note.area.addEventListener('keydown', async e => {
					if (~[HOME, END].indexOf(e.keyCode)) { //input ради preventDefault стандартного действия, нет input
						e.preventDefault() 
						const Area = await import('/-note/Area.js').then(r => r.default)
						await Area.keydown(note.area, e)
					}
					if (~[ENTER, TAB].indexOf(e.keyCode)) { //input ради preventDefault стандартного ввода, есть input
						e.preventDefault()
						note.area.dispatchEvent(new Event('beforeinput', { bubbles: true, cancelable: true}))
						const Area = await import('/-note/Area.js').then(r => r.default)
						await Area.keydown(note.area, e)
					}
				})
				note.area.addEventListener('keyup', async e => {
					if (note.inputpromise.start) return
					if ((e.ctrlKey && ~[A].indexOf(e.keyCode)) || ~[UP, DOWN, LEFT, RIGHT, HOME, END].indexOf(e.keyCode)) {//без input ради сохранения курсора
						const Note = await note.inputpromise
						const cursor = Note.getCursor(note)
						if (cursor.size) return //select
						Note.send(note, {cursor})
					}
				})
				note.area.addEventListener('select', async e => {
					if (note.inputpromise.start) return
					const Note = await note.inputpromise
					const cursor = Note.getCursor(note)
					if (beforecursor.base == cursor.base && beforecursor.size == cursor.size && beforecursor.start == cursor.start && beforecursor.direction == cursor.direction) return
					
					beforecursor = cursor
					Note.send(note, {cursor})
				})
				note.area.addEventListener('click', async e => {
					if (note.inputpromise.start) return
					const Note = await note.inputpromise
					const cursor = Note.getCursor(note)
					if (cursor.size) return //select
					Note.send(note, {cursor})
				})
				
				
				note.area.addEventListener('dragstart', e => {
					e.preventDefault()
				})
				note.area.addEventListener('beforeinput', async e => {
					/*
						aob - before, remove
						anb - after, insert
					*/
					if (note.inputpromise.start) return
					const aob = note.area.textLength
					//let edge = note.area.selectionEnd
					//const ao = note.area.selectionEnd
					const text_before = note.area.value
					note.inputpromise = new Promise(resolve => note.area.addEventListener('input', async () => {
						const Note = await import('/-note/Note.js').then(r => r.default)
						await checkUser(note)
						resolve(Note)
					}, {once:true}))
					note.inputpromise.start = true
					
					const Note = await note.inputpromise

					note.inputpromise.start = false

					let text_after = note.area.value
					const limit = 65000
					if (note.area.textLength > limit) {
						const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
						Dialog.alert('Допустимая длина заметки '+limit+' символов.<br>Если больше, то это уже и не заметка получается.')
						text_after = note.area.value = text_after.slice(0, limit)
					}
					const an = note.area.selectionEnd
					const anb = note.area.textLength
					

					const ao = aob - anb + an

					let a = -1
					while (++a < ao) if (text_before[a] != text_after[a]) break //Поиск первого отличия с начала текста

					let o = ao - a
					let n = an - a

					if (n < 0) {
						a += n
						n = an - a
						o = ao - a
					}
					const change = {
						start: a,
						remove: text_before.substr(a, o),
						insert: text_after.substr(a, n),
						base: note.rev,
						ordain: ++note.ordain, //Важен для my
						cursor: Note.getCursor(note)
					}
					note.lastchange = change
					note.text = text_after

					for (const i in note.cursors) {
						Note.Move.cursorAfter(note.cursors[i], [change])
					}
					
					note.waitchanges.push(change)
					Note.viewHTML(note)
					Note.send(note, {change})
				})


				note.inputpromise.then(Note => Note.open(note))
			})(document.currentScript.parentNode)
		</script>
	</div>
`

export default note