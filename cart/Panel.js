const Panel = {
	t: null,
	toggle: (panel) => {
		const hand = panel.querySelector('.hand')
		const body = panel.querySelector('.body')
		body.scrollTo(0, 0)
		panel.classList.toggle('show')
		panel.classList.remove('ready')
		clearTimeout(Panel.t)
		Panel.t = setTimeout(() => {
			if (!panel.classList.contains('show')) return
			panel.classList.add('ready')
		}, 500)
	}
}
export default Panel