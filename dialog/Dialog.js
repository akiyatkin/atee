const cls = (cls, el) => el.getElementsByClassName(cls)
const link = document.createElement('link')
link.rel = 'stylesheet'
link.href = '/-dialog/style.css'
document.head.prepend(link)
document.addEventListener('keydown', async e => {
	if (!~[27].indexOf(e.keyCode)) return //13
	const l = Dialog.parents.length
	if (!l) return
	const parent = Dialog.parents[l-1]
    Dialog.hide(parent)
})
export const Dialog = {
	frame: async (parent, html) => {

		parent = parent.tagName ? parent : document.getElementById(parent)
		const popobj = await import('/-dialog/layout.html.js')
		const { htmltodiv } = await import('/-controller/htmltodiv.js')
		htmltodiv(popobj['ROOT'](), parent)
		const dialog = parent.children[0]
		for (const close of cls('close', dialog)) {
			close.addEventListener('click', async (e) => {
				if (!dialog.classList.contains('show')) return
				Dialog.hide(parent)
			})
			close.addEventListener('keypress', e => { //32 space, 13 enter
				if (e.keyCode != 13) return
				if (!dialog.classList.contains('show')) return
				e.preventDefault()
				Dialog.hide(parent)
			})
		}

		const body = cls('dialogbody', dialog)[0]
		dialog.addEventListener('click', async e => {
			if (!dialog.classList.contains('show')) return
			let el = e.target
			const path = [el]
			while (el && el.parentElement) path.push(el = el.parentElement)
			if (path.some(el => el.tagName == 'A')) return Dialog.hide(parent) //Клик по ссылке закрываем
			if (path.some(el => el == body)) return //Клик внутри, окно не сворачивает
			if (!path.some(el => el == dialog)) return //Клик где-то вообще вне окна, по чему-то, что сверху например
			Dialog.hide(parent)
		}, true)
		const div = cls('dialogcontent', dialog)[0]
		htmltodiv(html, div)
	},
	parents:[],
	show: parent => {
		//document.getElementsByTagName('html')[0].style.overscrollY = 'hidden'
		parent = parent.tagName ? parent : document.getElementById(parent)
		const dialog = parent.children[0]
		const i = Dialog.parents.indexOf(parent)
		if (~i) Dialog.parents.splice(i, 1)
		Dialog.parents.push(parent)
		const body = cls('dialogbody', dialog)[0]
		if (body.show) body.show()
		dialog.classList.add('show')
		dialog.lastfocus = document.activeElement
		document.activeElement.blur()	
		
	},
	hide: parent => {
		//document.getElementsByTagName('html')[0].style.overscrollY = ''
		parent = parent.tagName ? parent : document.getElementById(parent)
		const dialog = parent.children[0]
		const i = Dialog.parents.indexOf(parent)
		if (~i) Dialog.parents.splice(i, 1)
		dialog.classList.remove('show')
		if (!Dialog.parents.length) dialog.lastfocus.focus({ preventScroll: true })
	}
}