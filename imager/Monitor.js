await new Promise(resolve => {
	const link = document.createElement('link')
	link.rel = 'stylesheet'
	link.onload = resolve
	link.href = '/-imager/monitor.css'
	document.head.prepend(link)
})



const Monitor = {}


Monitor.init = div => {
	const links = div.querySelectorAll("a.monitor")
	let showed = false
	const show = (link) => {
		if (showed) hide()
		
		const big = document.createElement('div')
		showed = {link, big}

		big.classList.add('big')
		big.innerHTML = `
			<img src="${link.href}">
		`
		link.prepend(big)
		big.scrollIntoView()
	}
	const hide = () => {
		showed.link.removeChild(showed.big)
		showed = false
	}
	const next = () => {
		const index = Array.from(links).findIndex( link => link == showed.link)
		const link = links.item(index + 1) || links[0]
		hide()
		if (link) show(link)
	}
	const prev = () => {
		const index = Array.from(links).findIndex( link => link == showed.link)
		const link = links.item(index - 1) || links[links.length - 1]
		hide()
		if (link) show(link)
	}
	for (const link of links) {
		
		// const small = link.querySelector('.small')
		// small.addEventListener("click", e => {
		// 	e.stopPropagation()
		// 	show(link)
		// })
		//const big = link.querySelector('.big')
		link.addEventListener("click", e => {
			e.preventDefault()
			e.stopPropagation()
			if (link.querySelector('.big')) {
				if (e.target.tagName == 'IMG') {
					if (window.innerWidth / 2 > e.pageX) {
						prev()
					} else {
						next()
					}
				} else {
					hide()
				}
			} else {
				if (!showed) return show(link)
			}
		})
	}
	const ENTER = 13
	const ESC = 27
	window.addEventListener('click', () => {
		if (!showed) return
		hide()
	})
	window.addEventListener("keydown", e => {
		if (!showed) return
		if (e.keyCode == ENTER) next()
		if (e.keyCode == ESC) hide()
	})
}


export default Monitor