const Panel = {
	hide: (panel) => {
		Panel.down(panel)
		panel.classList.add('hide')
	},
	show: (panel) => {
		panel.classList.remove('hide')
	},
	down: (panel) => {
		panel.classList.remove('hide')
		const body = panel.querySelector('.body')
		body.scrollTo(0, 0)
		panel.classList.remove('show')
		Panel.ready(panel)
	},
	t: null,
	ready: panel => {
		panel.classList.remove('ready')
		clearTimeout(Panel.t)
		Panel.t = setTimeout(() => {
			if (!panel.classList.contains('show')) return
			panel.classList.add('ready')
		}, 0)
	},
	toggle: (panel) => {
		Panel.show(panel)
		const body = panel.querySelector('.body')
		body.scrollTo(0, 0)
		panel.classList.toggle('show')
		Panel.ready(panel)
		
	},
	up: panel => {
		Panel.show(panel)
		const body = panel.querySelector('.body')
		body.scrollTo(0, 0)
		panel.classList.add('show')
		Panel.ready(panel)
	},
	down: panel => {
		Panel.show(panel)
		const body = panel.querySelector('.body')
		body.scrollTo(0, 0)
		panel.classList.remove('show')
		Panel.ready(panel)
	}
}
export default Panel