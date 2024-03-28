import nicked from "/-nicked"
const cls = (cls, el) => el.getElementsByClassName(cls)
const link = document.createElement('link')
link.rel = 'stylesheet'
link.href = '/-dialog/style.css'
document.head.prepend(link)
document.addEventListener('keydown', e => {
	if (!~[27].indexOf(e.keyCode)) return //13
	const l = Dialog.parents.length
	if (!l) return
	const parent = Dialog.parents[l-1]
	//e.stopImmediatePropagation()
    Dialog.hide(parent)
})
const addCSS = href => { //файл этот нельзя использовать на сервере
	if (document.head.querySelector('link[href="'+href+'"]')) return
	const link = document.createElement('link')
	link.rel = 'stylesheet'
	link.href = href
	document.head.prepend(link)
}
const hides = new WeakMap()
export const Dialog = {
	open: async (layer, div = document.body, onshow, onhide) => {
		const {tpl, sub, parsed = '', json = '', data} = layer
		const tplobj = await import(tpl).then(res => res.default || res)
		layer.data = !json ? data : await fetch(json).then(res => res.json())
		const id = 'dialog-' + nicked([tpl,sub,json,parsed].join('-'))
		let popup = document.getElementById(id)
		if (!popup) {
			if (tplobj.css) {
				for (const link of tplobj.css) addCSS(link)
			}
			popup = document.createElement('div')
			popup.id = id
			div.append(popup) //div может оказаться выше запланированных окон отправи формы успех или ошибка
		}
		if (onhide) {
			const list = hides.get(popup) || []
			list.push(onhide)
			hides.set(popup, list)
		}
		const theme = await import('/-controller/Theme.js').then(r => r.default.get())
		//const layer = {tpl, sub, json, div:id}
		layer.div = id
		const look = { theme }
		const env = { layer, ...look }
		env.sid = 'sid-' + layer.div + '-' + layer.sub + '-'
		env.scope = '#' + layer.div
		const Client = await window.getClient()
		env.bread = Client.bread
		await Dialog.frame(popup, tplobj[sub](layer.data, env))
		
		Dialog.show(popup, onshow)
		return popup
	},
	alert: async (html) => {
		const id = 'dialog-alert'
		let popup = document.getElementById(id)
		if (!popup) {
			popup = document.createElement('div')
			popup.id = id
			document.body.after(popup)
		}
		await Dialog.frame(popup, html)
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
		const popobj = await import('/-dialog/layout.html.js').then(res => res.default || res)
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
			if (path.some(el => ~['A'].indexOf(el.tagName))) return Dialog.hide(popup) //Клик по ссылке закрываем
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
	index:1000,
	show: (popup, onshow) => {
		//document.getElementsByTagName('html')[0].style.overscrollY = 'hidden'
		popup = popup.tagName ? popup : document.getElementById(popup)
		const dialog = popup.children[0]
		const i = Dialog.parents.indexOf(popup)
		if (~i) Dialog.parents.splice(i, 1)
		Dialog.parents.push(popup)
		const body = cls('dialogbody', dialog)[0]
		if (body.show) body.show()
		dialog.classList.add('show')
		dialog.style.zIndex = ++Dialog.index
		dialog.lastfocus = document.activeElement
		document.activeElement.blur()
		const focus = dialog.querySelector('[tabindex="0"]')
		if (focus) focus.focus()
		if (onshow) onshow(popup)
		return popup
	},

	hide: popup => {
		//document.getElementsByTagName('html')[0].style.overscrollY = ''
		popup = popup || Dialog.parents.pop()
		popup = popup.tagName ? popup : document.getElementById(popup)

		const dialog = popup.children[0]
		const i = Dialog.parents.indexOf(popup)
		if (~i) Dialog.parents.splice(i, 1)
		dialog.classList.remove('show')
		if (!Dialog.parents.length) dialog.lastfocus.focus({ preventScroll: true })

		const list = hides.get(popup)
		if (list) {
			list.forEach((onhide) => {
				onhide(popup)
			})
		}
	}
}
export default Dialog
window.Dialog = Dialog