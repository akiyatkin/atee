
await new Promise(resolve => {
	const link = document.createElement('link')
	link.rel = 'stylesheet'
	link.onload = resolve
	link.href = '/-imager/sliderNeo.css'	
	document.head.prepend(link)
})


export default div => {
	const cls = cls => div.getElementsByClassName(cls)
	const el = cls('sliderNeo')[0] || div
	const left = cls('left')[0]
	const right = cls('right')[0]
	const width = el.scrollWidth
	const check = (scrollLeft = el.scrollLeft) => requestAnimationFrame(() => {
		if (left) left.style.opacity = scrollLeft < 1 ? 0 : 1
		if (right) right.style.opacity = length + scrollLeft >= width ? 0 : 1
	})

	const child = el.children[0]
	if (!child) return
	const length = child.offsetWidth

	let direction = true
	const set = (newval) => {
		check(newval)
		el.style.scrollBehavior = "smooth";
		el.scrollLeft = newval
		el.style.scrollBehavior = "auto";
	}
	const prev = () => {
		if (direction) return next()
		
		let len = (el.scrollLeft % length) || length
		let newval = el.scrollLeft - len
		if (newval < 0) {
			direction = true
			return next()
		}
		set(newval)
	}
	const next = () => {
		if (!direction) return prev()
		if (!el.closest('body')) return clearInterval(timer)

		let len = (((el.scrollWidth - length) - el.scrollLeft) % length)
		
		if (!len) len = length
		

		let newval = el.scrollLeft + len
		if (newval > el.scrollWidth - length) {
			direction = false
			return prev()
		}
		set(newval)
	}

	const timer = setInterval(next, 5000)
	setTimeout(next, 1000)
	let startx, starty, diffx, diffy, drag, lastfocus, scrollLeft, scrollTop;



	
	el.addEventListener('scroll', () => check)
	el.addEventListener('pointerover', () => {
		clearInterval(timer)
		el.style.scrollBehavior = "smooth";
		check(0)
		el.scrollLeft = 0
		el.style.scrollBehavior = "auto";
	}, {once: true})

	const isTouch = (e) => {
		const bigdiffx = (startx - (e.clientX + scrollLeft))
		const bigdiffy = (starty - (e.clientY + scrollTop))
		return Math.abs(bigdiffx) > 0 || Math.abs(bigdiffy) > 0
	}
	el.addEventListener('click', e => {
		if (!isTouch(e)) return
		e.stopPropagation()
		e.preventDefault()
		//next()
	})
	el.addEventListener('mousedown', e => {
		clearInterval(timer)
		if (e.target.nodeName === 'IMG') e.preventDefault();
		scrollLeft = el.scrollLeft
		scrollTop = el.scrollTop
		startx = e.clientX + el.scrollLeft
		starty = e.clientY + el.scrollTop
		diffx = 0
		diffy = 0
		drag = true
	})
	window.addEventListener('mousemove', e => {
		if (!drag) return
		diffx = (startx - (e.clientX + el.scrollLeft))
		diffy = (starty - (e.clientY + el.scrollTop))
		el.scrollLeft += diffx
		el.scrollTop += diffy
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
				el.scrollLeft += diffx * step
				el.scrollTop += diffy * step
				start -= 0.02
				window.requestAnimationFrame(animate)
			}
		};
		check(el.scrollLeft + diffx)
		animate()
	})
}