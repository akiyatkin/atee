await new Promise(resolve => {
	const link = document.createElement('link')
	link.rel = 'stylesheet'
	link.onload = resolve
	link.href = '/-imager/sliderNeo.css'	
	document.head.prepend(link)
})


export default div => {
	const cls = cls => div.getElementsByClassName(cls)
	const slider = cls('sliderNeo')[0] || div
	const gap = parseInt(getComputedStyle(slider).rowGap) || 0
	//const count = (child.offsetWidth + gap) / (slider.scrollWidth + gap)
	const left = cls('left')[0]
	const right = cls('right')[0]
	const child = slider.children[0]
	if (!child) return
	const length = child.offsetWidth + gap
	const width = slider.scrollWidth

	//scrollWidth - полная ширина
	//offsetWidth - видимая ширина
	//scrollLeft - прокручено слева

	const check = (scrollLeft = slider.scrollLeft) => requestAnimationFrame(() => {
		if (left) left.style.opacity = scrollLeft < 1 ? 0 : 1
		if (right) right.style.opacity = slider.offsetWidth + scrollLeft >= slider.scrollWidth ? 0 : 1
	})
	


	let direction = true
	const set = (newval) => {
		check(newval)
		slider.style.scrollBehavior = "smooth";
		slider.scrollLeft = newval
		slider.style.scrollBehavior = "auto";
	}
	const prev = () => {
		const length = child.offsetWidth + gap
		let len = length - ((slider.scrollLeft) % length)
		if (len < length * 1 / 2) len = length - len
		else len = 2 * length - len
		let newval = slider.scrollLeft - len
		if (newval <= 10) {
			newval = 0
			direction = true
		}
		set(newval)
	}
	const next = () => {
		const length = child.offsetWidth + gap
		let len = ((slider.scrollWidth - slider.offsetWidth + slider.scrollLeft) % length)
		/*
			slider.scrollWidth = 1000
			slider.offsetWidth = 200
			slider.scrollLeft = 10
			length || child.offsetWidth + gap = 100
			let = 1000 - 200 + 10 % 100 = 810 % 100 = 10
		*/
		if (len < length * 1 / 2) len = length - len
		else len = 2 * length - len
		let newval = slider.scrollLeft + len
		if (newval >= slider.scrollWidth - slider.offsetWidth - 10) {
			direction = false
			newval = slider.scrollWidth - slider.offsetWidth
		}
		set(newval)
	}
	const go = () => {
		if (!slider.closest('body')) return clearInterval(timer)
		return direction ? next() : prev()
	}
	
	if (left) left.addEventListener('click', prev)
	if (right) right.addEventListener('click', next)

	const timer = setInterval(go, 5000)
	setTimeout(go, 1000)

	let startx, starty, diffx, diffy, drag, lastfocus, scrollLeft, scrollTop;

	slider.addEventListener('scroll', () => check)
	slider.addEventListener('pointerover', () => {
		clearInterval(timer)
		set(0)
	}, {once: true})

	const isTouch = (e) => {
		const bigdiffx = (startx - (e.clientX + scrollLeft))
		const bigdiffy = (starty - (e.clientY + scrollTop))
		return Math.abs(bigdiffx) > 0 || Math.abs(bigdiffy) > 0
	}
	slider.addEventListener('click', e => {
		if (!isTouch(e)) return
		e.stopPropagation()
		e.preventDefault()
	}, true)

	slider.addEventListener('mousedown', e => {
		clearInterval(timer)
		if (e.target.nodeName === 'IMG') e.preventDefault();
		scrollLeft = slider.scrollLeft
		scrollTop = slider.scrollTop
		startx = e.clientX + slider.scrollLeft
		starty = e.clientY + slider.scrollTop
		diffx = 0
		diffy = 0
		drag = true
	})
	window.addEventListener('mousemove', e => {
		if (!drag) return
		diffx = (startx - (e.clientX + slider.scrollLeft))
		diffy = (starty - (e.clientY + slider.scrollTop))
		slider.scrollLeft += diffx
		slider.scrollTop += diffy
	})
	window.addEventListener('mouseup', e => {
		if (!drag) return
		drag = false
		if (!isTouch(e)) return
		let start = 1
		const animate = function () {
			var step = Math.sin(start)
			if (step <= 0) {
				window.cancelAnimationFrame(animate)
				check()
			} else {
				slider.scrollLeft += diffx * step
				slider.scrollTop += diffy * step
				start -= 0.02
				window.requestAnimationFrame(animate)
			}
		};
		check(slider.scrollLeft + diffx)
		animate()
	})
}