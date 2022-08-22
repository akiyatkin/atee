const cls = (cls, el) => el.getElementsByClassName(cls)
export const Dialog = {
	show: async (modal, html) => {
		modal = modal.tagName ? modal : document.getElementById(modal)
		const Client = await window.getClient()
		const popobj = await import('/-dialog/layout.html.js')
		await Client.htmltodiv(popobj['ROOT'](), modal)
		
		const body = cls('body', modal)[0]
		const close = cls('close', modal)[0]
		if (close) {
			close.addEventListener('click', async (e) => {
				if (!modal.classList.contains('show')) return
				Dialog.hide(modal)
			})
			close.addEventListener('keypress', e => { //32 space, 13 enter
				if (e.keyCode != 13) return
				if (!modal.classList.contains('show')) return
				e.preventDefault()
				Dialog.hide(modal)
			})
		}
		document.body.addEventListener('click', async e => {
			if (!modal.classList.contains('show')) return
			let el = e.target
			const path = [el]
			while (el && el.parentElement) path.push(el = el.parentElement)
			if (path.find(el => el.tagName == 'A')) return Dialog.hide(modal); //Клик по ссылке закрываем
			if (path.find(el => el == body)) return; //Клик внутри меню, меню не сворачивает
			Dialog.hide(modal)
		}, true);
		modal.addEventListener('keydown', async e => {
			if (e.keyCode !== 13) return
			if (e.target != modal) return
			if (!modal.classList.contains('show')) return
		    Dialog.hide(modal)
		});
		document.body.addEventListener('keydown', async e => {
			if (e.keyCode !== 27) return
		    if (!modal.classList.contains('show')) return
		    Dialog.hide(modal)
		});

		const div = cls('popupcontent', modal)[0]
		modal.classList.add('show')
		modal.focus({ preventScroll: true })
		await Client.htmltodiv(html, div)
	},
	hide: modal => {
		modal = modal.tagName ? modal : document.getElementById(modal)
		modal.classList.remove('show')
	}
}