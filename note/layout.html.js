import Light from '/-note/Light.js'

const tpl = {}
export default tpl

tpl.css = ['/-note/style.css']


tpl.checkErr = (data, env) => data.result ? '': `
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
tpl.ROOT = (data, env) => tpl.checkErr(data, env) || `
	${tpl.show(data.note)}
`
const removeProp = (note, prop) => {
	const mynote = {...note}
	delete mynote[prop]
	return mynote
}
tpl.show = (note, placeholder = "Напишите что-нибудь") => `
	<div data-note_id="${note.note_id}" class="joined notewrapper ${note.iswrap ? 'wrap' : ''}">
		<style>
			.notewrapper {
				opacity: 0;
			}
		</style>
		<div class="note view" aria-hidden="true" placeholder="${placeholder}" aria-label="${placeholder}">${Light.view(note)}</div>
		<textarea ${note.ismy == 'view' ? 'disabled' : ''} autocomplete="off" style="--hue: ${note.hue}" class="note area" spellcheck="false" placeholder="${placeholder}" aria-label="${placeholder}" role="textbox" tabindex="0">${Light.area(note)}</textarea>
		<script>
			(wrap => {
				let Area = false
				import('/-note/Area.js').then(r => r.default).then(r => Area = r)
				const createCursor = (area, note) => ({
					start: area.selectionStart,
					size: area.selectionEnd - area.selectionStart,
					base: note.rev,
					direction: Number(area.selectionDirection == 'forward')
				})
				//ОПРЕДЕЛЕНИЕ
				const area = wrap.querySelector('.area')
				const note = ${JSON.stringify(removeProp(note, 'text'))}
				note.text = area.value
				note.waitchanges = []

				area.selectionStart = note.cursor_start
				area.selectionEnd = note.cursor_start + note.cursor_size
				area.selectionDirection = note.cursor_direction ? 'forward' : 'backward'
				
				//note.cursor = createCursor(area, note)

				const PlacePromise = new Promise(async resolve => { //Запускается сразу, так как надо получать обнволения при загрузке
					const Place = await import('/-note/Place.js').then(r => r.default)
					const Light = await import('/-note/Light.js').then(r => r.default)
					const user = await Place.getOrCreateUser()
					const socket = await Place.prepareSocketAndSpy(wrap, note, user)
					resolve({Light, Place, user})
				})

				const TAB = 9
				const ENTER = 13
				const HOME = 36
				const END = 35
				const LEFT = 37
				const RIGHT = 39
				const UP = 38
				const DOWN = 40
				const A = 65
				
				/*
					КУРСОР
				*/
				area.addEventListener('focus', async e => {
					wrap.classList.add('focus')
					const cursor = createCursor(area, note)
					const {user, Place} = await PlacePromise
					Place.send(wrap, note, user, {signal:{type:'focus', cursor, base:note.rev}})
				})
				area.addEventListener('blur', async e => {
					wrap.classList.remove('focus')
					const {user, Place} = await PlacePromise
					Place.send(wrap, note, user, {signal:{type:'blur', base:note.rev}})
				})				
				area.addEventListener('mouseup', async e => {
					await new Promise(resolve => setTimeout(resolve, 1))
					const cursor = createCursor(area, note)
					const {user, Place} = await PlacePromise
					Place.send(wrap, note, user, {cursor})
				})
				if (note.ismy == 'view') return
				
				area.addEventListener('mousedown', async e => {
					if (!Area) return
					Area.mousedown(area, e)
				})
				area.addEventListener('keydown', async e => {
					if (!Area) return
					if (~[HOME, END].indexOf(e.keyCode)) { //input ради preventDefault стандартного действия, нет input
						e.preventDefault()
						Area.keydown(area, e)
					}
					if (~[ENTER, TAB].indexOf(e.keyCode)) { //input ради preventDefault стандартного ввода, есть input
						e.preventDefault()
						area.dispatchEvent(new Event('beforeinput', { bubbles: true, cancelable: true}))
						Area.keydown(area, e)
					}
				})
				area.addEventListener('keyup', async e => {
					if ((e.ctrlKey && ~[A].indexOf(e.keyCode)) || ~[UP, DOWN, LEFT, RIGHT, HOME, END].indexOf(e.keyCode)) {//без input ради сохранения курсора
						//await new Promise(resolve => setTimeout(resolve, 1))
						const cursor = createCursor(area, note)
						const {user, Place} = await PlacePromise
						Place.send(wrap, note, user, {cursor})
					}
				})
				/*
					ИЗМЕНЕНИЯ
				*/

				area.addEventListener('beforeinput', async e => {
					const limit = 65000
					if (area.textLength > limit) {
						import('/-dialog/Dialog.js').then(r => r.default).then(Dialog => {
							Dialog.alert('Допустимая длина заметки '+limit+' символов.<br>Если больше, то это уже и не заметка получается.')	
						})
						return e.preventDefault()
					}

					let text_after
					const inputPromise = new Promise(resolve => area.addEventListener('input', async () => {
						
						if (Area) {
							const symbol = area.value[area.selectionStart - 2] //e.data
							if (symbol == '/' && note.isslash) {
								Area.control(area)
							}
						}

						text_after = note.text = area.value
						resolve(PlacePromise)
					}, {once:true}))


					const text_before = area.value
					const {user, Place, Light} = await inputPromise
					
					const cursor = createCursor(area, note)
					
					
					const an = area.selectionEnd
					const anb = area.textLength //anb - after, insert
					const aob = text_before.length //aob - before, remove

					const ao = aob - anb + an

					let a = -1
					while (++a < ao) if (text_before[a] != text_after[a]) break

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
						base: note.rev
					}
					for (const i in note.cursors) {
						Place.Move.cursorAfter(note.cursors[i], [change])
					}
					
					note.waitchanges.push(change)
					const view = wrap.querySelector('.view')
					view.innerHTML = Light.view(note)
					Place.send(wrap, note, user, {change, cursor})
				})

			})(document.currentScript.parentNode)
		</script>
	</div>
`


tpl.button = ({label = 'Укажите ваш Email', descr, value, name = 'title', type = 'email', action, args = {}, go, reloaddiv, goid, reload}) => {
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

tpl.POPUP = (data, env) => `

	${data.note ? tpl.show(data.note) : data.msg}
`
