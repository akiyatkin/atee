import { nicked } from "/-nicked/nicked.js"
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
	open: async ({div, tpl, sub, json}) => {
		const tplobj = await import(tpl)
		const data = !json ? null : await fetch(json).then(res => res.json())
		const id = 'dialog-'+nicked([tpl,sub,json].join('-'))
		let popup = document.getElementById(id)
		if (!popup) {
			popup = document.createElement('div')
			popup.id = id
			document.body.append(popup)
		}
		await Dialog.frame(popup, tplobj[sub](data))
		Dialog.show(popup)
		return popup
	},
	findPopup: el => el.closest('.dialogframe').parentElement,
	create: (div, html) => {
		const popup = document.createElement('div')
		div.append(popup)
		return Dialog.frame(popup, html)
	},
	frame: async (popup, html) => {
		popup = popup.tagName ? popup : document.getElementById(popup)
		const popobj = await import('/-dialog/layout.html.js')
		const { evalScripts } = await import('/-controller/evalScripts.js')
		popup.innerHTML = popobj['ROOT']()
		await evalScripts(popup)
		const dialog = popup.children[0]
		for (const close of cls('close', dialog)) {
			close.addEventListener('click', async (e) => {
				if (!dialog.classList.contains('show')) return
				Dialog.hide(popup)
			})
			close.addEventListener('keypress', e => { //32 space, 13 enter
				if (e.keyCode != 13) return
				if (!dialog.classList.contains('show')) return
				e.preventDefault()
				Dialog.hide(popup)
			})
		}
		const body = cls('dialogbody', dialog)[0]
		let downe = false
		//body.addEventListener('mouseover', () => over = true)
		dialog.addEventListener('mousedown', (e) => downe = e)
		dialog.addEventListener('click', async e => {
			if (downe.screenX != e.screenX) return
			if (!dialog.classList.contains('show')) return
			let el = e.target
			const path = [el]
			while (el && el.parentElement) path.push(el = el.parentElement)
			if (path.some(el => el.tagName == 'A')) return Dialog.hide(popup) //Клик по ссылке закрываем
			//if (over) return
			if (path.some(el => el == body)) return //Клик внутри, окно не сворачивает
			if (!path.some(el => el == dialog)) return //Клик где-то вообще вне окна, по чему-то, что сверху например
			Dialog.hide(popup)
		}, true)
		const div = cls('dialogcontent', dialog)[0]
		
		div.innerHTML = html
		await evalScripts(div)
		return popup
	},
	parents:[],
	show: popup => {
		//document.getElementsByTagName('html')[0].style.overscrollY = 'hidden'
		popup = popup.tagName ? popup : document.getElementById(popup)
		const dialog = popup.children[0]
		const i = Dialog.parents.indexOf(popup)
		if (~i) Dialog.parents.splice(i, 1)
		Dialog.parents.push(popup)
		const body = cls('dialogbody', dialog)[0]
		if (body.show) body.show()
		dialog.classList.add('show')
		dialog.lastfocus = document.activeElement
		document.activeElement.blur()	
		return popup
	},
	hide: popup => {
		//document.getElementsByTagName('html')[0].style.overscrollY = ''
		popup = popup.tagName ? popup : document.getElementById(popup)
		const dialog = popup.children[0]
		const i = Dialog.parents.indexOf(popup)
		if (~i) Dialog.parents.splice(i, 1)
		dialog.classList.remove('show')
		if (!Dialog.parents.length) dialog.lastfocus.focus({ preventScroll: true })
	}
}
window.Dialog = Dialog