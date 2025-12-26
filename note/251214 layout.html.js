const note = {}

note.css = ['/-note/style.css']
import Note from '/-note/Note.js'
import escapeText from '/-note/escapeText.js'

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
	${note.show(data.note)}
`
const removeProp = (note, prop) => {
	const mynote = {...note}
	delete mynote[prop]
	return mynote
}
note.show = (note, placeholder = "Напишите что-нибудь") => `
	<div data-note_id="${note.note_id}" class="notewrapper ${note.iswrap ? 'wrap' : ''}">
		<style>
			.notewrapper {
				opacity:0;
			}
		</style>
		<div class="note view" aria-hidden="true" placeholder="${placeholder}" aria-label="${placeholder}">${Note.viewHTML(note)}</div>
		<textarea ${note.ismy == 'view' ? 'disabled' : ''} autocomplete="off" style="--hue: ${note.hue}" class="note area" spellcheck="false" placeholder="${placeholder}" aria-label="${placeholder}" role="textbox" tabindex="0">
${escapeText(note.text)}</textarea>		
		<script>
			(wrap => {
				const note = ${JSON.stringify(removeProp(note, 'text'))}
				//window.note = note
				note.area = wrap.getElementsByClassName('area')[0]
				note.wrap = wrap
				note.text = note.area.value

				let beforecursor = {
					start: Number(note.cursor_start),
					size: Number(note.cursor_size),
					direction: Number(note.cursor_direction)
				}
				note.area.selectionStart = beforecursor.start
				note.area.selectionEnd = beforecursor.start + beforecursor.size
				note.area.selectionDirection = beforecursor.direction ? 'forward' : 'backward'

				note.view = wrap.querySelector('.view')
				
				note.waitchanges = []
				note.inputpromise = new Promise(async resolve => {
					const Note = await import('/-note/Note.js').then(r => r.default)
					const Move = await import('/-note/Move.js').then(r => r.default)
					Note.Move = Move
					//window.Note = Note
					await checkUser(note)
					resolve(Note)
				})
				
				const checkUser = async (note) => {					
					if (note.user_id) return //При авторизации слой должен обновиться, при global user
					const send = await import('/-dialog/send.js').then(r => r.default)
					const ans = await send('/-user/set-user-id')
					note.user_id = ans.user.user_id
					note.user_token = ans.user.token
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
					wrap.classList.add('focus')
					const Note = await note.inputpromise
					const cursor = Note.getCursor(note)
					Note.sendArea(note, {signal:{type:'focus', cursor, base:note.rev}})
				})
				note.area.addEventListener('blur', async e => {
					wrap.classList.remove('focus')
					const Note = await note.inputpromise
					Note.sendArea(note, {signal:{type:'blur', base:note.rev}})
				})


				note.area.addEventListener('select', async e => {
					if (note.inputpromise.start) return
					if (document.activeElement != note.area) return
					//if (!wrap.classList.contains('focus')) return //Если курсор пользователя смещается сервером, надо исключить такое событие
					const Note = await note.inputpromise
					const cursor = Note.getCursor(note)
					if (beforecursor.base == cursor.base && beforecursor.size == cursor.size && beforecursor.start == cursor.start && beforecursor.direction == cursor.direction) return
					
					beforecursor = cursor
					Note.sendArea(note, {cursor})
				})
				note.area.addEventListener('click', async e => {
					if (note.inputpromise.start) return
					const Note = await note.inputpromise
					const cursor = Note.getCursor(note)
					if (cursor.size) return //select
					Note.sendArea(note, {cursor})
				})
				
				note.area.addEventListener('dragstart', e => {
					e.preventDefault()
				})

				
				note.inputpromise.then(Note => Note.open(note))
				if (note.ismy == 'view') return
				
				//window.addEventListener('crossing', () => {
				//	console.log('curret focus')
				//note.area.focus()
				//}, {once: true})
				
				// note.area.addEventListener('paste', async e => {
				// 	const text = e.clipboardData.getData('text')
				// 	const Area = await import('/-note/Area.js').then(r => r.default)
				// 	await Area.paste(note.area, e, text)
				// })
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
				note.area.addEventListener('mousedown', async e => {
					const Area = await import('/-note/Area.js').then(r => r.default)
					Area.mousedown(note.area, e)
				})
				note.area.addEventListener('keyup', async e => {
					if (note.inputpromise.start) return
					if ((e.ctrlKey && ~[A].indexOf(e.keyCode)) || ~[UP, DOWN, LEFT, RIGHT, HOME, END].indexOf(e.keyCode)) {//без input ради сохранения курсора
						const Note = await note.inputpromise
						const cursor = Note.getCursor(note)
						if (cursor.size) return //select
						Note.sendArea(note, {cursor})
					}
					
				})
				const beforeinput = async (note) => {
					if (note.inputpromise.start) return
					const aob = note.area.textLength
					const text_before = note.area.value
					note.inputpromise = new Promise(resolve => note.area.addEventListener('input', async () => {
						
						const Note = await import('/-note/Note.js').then(r => r.default)
						await checkUser(note)

						const symbol = note.area.value[note.area.selectionStart - 2]
						if (symbol == '/' && note.isslash) {
							const Area = await import('/-note/Area.js').then(r => r.default)
							Area.control(note.area)
						}

						//await new Promise(resolve => setTimeout(resolve, Math.round(Math.random()) * 1000 + 1))

						resolve(Note)
					}, {once:true}))
					note.inputpromise.start = true
					
					const Note = await note.inputpromise

					note.inputpromise.start = false

					let text_after = note.area.value
					const limit = 65000
					if (note.area.textLength > limit) {
						text_after = note.area.value = text_after.slice(0, limit)
						import('/-dialog/Dialog.js').then(r => r.default).then(Dialog => {
							Dialog.alert('Допустимая длина заметки '+limit+' символов.<br>Если больше, то это уже и не заметка получается.')	
						})
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
						cursor: Note.getCursor(note)
					}
					note.lastchange = change
					note.text = text_after

					for (const i in note.cursors) {
						Note.Move.cursorAfter(note.cursors[i], [change])
					}
					
					note.waitchanges.push(change)
					note.view.innerHTML = Note.viewHTML(note)
					Note.sendArea(note, {change})
				}
				note.area.addEventListener('beforeinput', e => {
					/*
						aob - before, remove
						anb - after, insert
					*/
					beforeinput(note)
				})
			})(document.currentScript.parentNode)
		</script>
	</div>
`


note.button = ({label = 'Укажите ваш Email', descr, value, name = 'title', type = 'email', action, args = {}, go, reloaddiv, goid, reload}) => {
	return `
		<span>
			<button class="field">${value}</button>
			<script>
				(btn => {
					btn.addEventListener('click', async () => {
						const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
						let args = ${JSON.stringify(args)}
						for (const name in args) {
							const value = args[name]
							if (value === null) delete args[name]
						}
						const params = args ? '?' + new URLSearchParams(args).toString() : ''
						const json = '${action}' + params
						const popup = await Dialog.open({
							conf:{
								placeholder:'${label}',
							},
							json,
							tpl:"/-note/layout.html.js",
							sub:"POPUP"
						}, btn.parentNode, () => {}, async popup => {
							const senditmsg = await import('/-dialog/senditmsg.js').then(r => r.default)
							const ans = await senditmsg(btn, json)
							btn.innerHTML = ans.note.title || '${label}'
							if (ans.result) btn.dispatchEvent(new CustomEvent("field-saved", { detail: ans }))
							const Client = await window.getClient()
							if (ans.result && ${!!reloaddiv}) Client.reloaddiv('${reloaddiv}')
							if (ans.result && ${!!reload}) Client.reload()
						})
					})
				})(document.currentScript.previousElementSibling)
			</script>
		</span>
	`
}

note.POPUP = (data, env) => `

	${data.note ? note.show(data.note) : data.msg}
`


export default note