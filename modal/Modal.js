const cls = (cls, el) => el.getElementsByClassName(cls)
const wm = new WeakMap() 
const Modal = {
	_wm: wm,
	getState: modal => {
		let state = wm.get(modal)
		if (!state) {
			state = {fnshows:[], fnhides:[], is: false, lastfocus: false}
			wm.set(modal, state)
		}
		return state
	},
	is: div => {
		const modal = div.classList.contains('popupmodal') ? div : cls('popupmodal', div)[0]
		const state = Modal.getState(modal)
		return state.is
	},
	hide: div => {
		const modal = div.classList.contains('popupmodal') ? div : cls('popupmodal', div)[0]
		modal.classList.remove('show')
		const state = Modal.getState(modal)
		state.is = false
		if (state.lastfocus) {
			state.lastfocus.focus({ preventScroll: true })
		}
		for (const fnhide of state.fnhides) fnhide()
	},
	show: div => {
		const modal = div.classList.contains('popupmodal') ? div : cls('popupmodal', div)[0]
		modal.classList.add('show')
		const close = cls('close', modal)[0]
		const state = Modal.getState(modal)
		state.is = true		
		state.lastfocus = document.activeElement
		modal.focus({ preventScroll: true })
		for (const fnshow of state.fnshows) fnshow()
	},
	showhide: (div, fnshow, fnhide) => {
		const modal = div.classList.contains('popupmodal') ? div : cls('popupmodal', div)[0]
		const state = Modal.getState(modal)
		if (fnshow) state.fnshows.push(fnshow)
		if (fnhide) state.fnhides.push(fnhide)
	},
	init: () => {
		for (const modal of cls('popupmodal', document.body)) {
			const state = Modal.getState(modal)
			if (state.init) continue				
			state.init = true
			const body = cls('body', modal)[0]
			const close = cls('close', modal)[0]
			if (close) {
				close.addEventListener('click', async () => {
					if (!modal.classList.contains('show')) return
					Modal.hide(modal)
				})
				close.addEventListener('keypress', e => { //32 space, 13 enter
					if (e.keyCode != 13) return
					if (!modal.classList.contains('show')) return
					e.preventDefault()
					Modal.hide(modal)
				})
			}
			document.body.addEventListener('click', async e => {
				if (!modal.classList.contains('show')) return
				let el = e.target
				const path = [el]
				while (el && el.parentElement) path.push(el = el.parentElement)
				if (path.find(el => el.tagName == 'A')) return Modal.hide(modal); //Клик по ссылке закрываем
				if (path.find(el => el == body)) return; //Клик внутри меню, меню не сворачивает
				Modal.hide(modal)
			}, true);
			modal.addEventListener('keydown', async e => {
				if (e.keyCode !== 13) return
				if (e.target != modal) return
				if (!modal.classList.contains('show')) return
			    Modal.hide(modal)
			});
			document.body.addEventListener('keydown', async e => {
				if (e.keyCode !== 27) return
			    if (!modal.classList.contains('show')) return
			    Modal.hide(modal)
			});
		}
	}
}

export { Modal }