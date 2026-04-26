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
	const lefts = cls('left')
	const rights = cls('right')
	let child = slider.children[0]
	if (!child.offsetWidth) child = slider.children[1]
	if (!child) return
	const length = child.offsetWidth + gap
	const width = slider.scrollWidth

	//scrollWidth - полная ширина
	//offsetWidth - видимая ширина
	//scrollLeft - прокручено слева

	const check = (scrollLeft = slider.scrollLeft) => requestAnimationFrame(() => {
		for (const left of lefts) left.style.opacity = scrollLeft < 1 ? 0 : 1
		for (const right of rights) right.style.opacity = slider.offsetWidth + scrollLeft + 1 >= slider.scrollWidth ? 0 : 1
	})
	


	let direction = true
	const set = (newval) => {
		check(newval)
		slider.style.scrollBehavior = "smooth";
		slider.scrollLeft = newval
		slider.style.scrollBehavior = "auto";
	}
	const prev = () => {
		const slide_width = child.offsetWidth + gap		
		//console.log(slider.scrollWidth, slider.offsetWidth, slider.scrollLeft)
		/*
			slider.scrollWidth = 4000  вся длина скрытая за прокруткой
			slider.offsetWidth = 1295 видимая часть
			slider.scrollLeft = 10 сколько уже прокрутили от начала
			slide_width = 400 - ширина слайда
			slide_shift = 10 % 400 = 10 - сдвиг от слайда
			max_scroll = 4000 - 1295
			newval = slider.scrollLeft = сколько надо прокрутить
		*/
		const slide_shift = slider.scrollLeft % slide_width
		const max_scroll = slider.scrollWidth - slider.offsetWidth
		let newval = slider.scrollLeft - slide_width
		if (slide_shift) {
			if (slide_width / 2 < slide_shift) { //Сдвиг дальше середины, мотаем влево
				newval = newval + (slide_width - slide_shift) //Проматываем текущий и переходим на следующий
			} else { //Ближе середины
				newval = newval - slide_shift //Доматываем текущий
			}
		}

		if (newval >= 0) {
			return set(newval)
		} else if (newval > - slide_width) {
			return set(0)
		} else {
			return
			//return set(0)
		}
	}
	const next = () => {
		const slide_width = child.offsetWidth + gap		
		//console.log(slider.scrollWidth, slider.offsetWidth, slider.scrollLeft)
		/*
			slider.scrollWidth = 4000  вся длина скрытая за прокруткой
			slider.offsetWidth = 1295 видимая часть
			slider.scrollLeft = 10 сколько уже прокрутили от начала
			slide_width = 400 - ширина слайда
			slide_shift = 10 % 400 = 10 - сдвиг от слайда
			max_scroll = 4000 - 1295
			newval = slider.scrollLeft = сколько надо прокрутить
		*/
		const slide_shift = slider.scrollLeft % slide_width
		const max_scroll = slider.scrollWidth - slider.offsetWidth
		let newval = slider.scrollLeft + slide_width
		if (slide_shift) {
			if (slide_width / 2 < slide_shift) { //Сдвиг дальше середины
				newval = newval + (slide_width - slide_shift) //Проматываем текущий и переходим на следующий
			} else { //Ближе середины
				newval = newval - slide_shift //Доматываем текущий
			}
		}

		if (newval <= max_scroll) {
			return set(newval)
		} else if (newval <= max_scroll + slide_width) {
			return set(max_scroll)
		} else {
			return
			//return set(0)
		}
		
	}
	const go = () => {
		if (!slider.closest('body')) return clearInterval(timer)
		return direction ? next() : prev()
	}
	
	for (const left of lefts) left.addEventListener('click', prev)
	for (const right of rights) right.addEventListener('click', next)

	const timer = setInterval(go, 6000)
	setTimeout(go, 6000)

	let startx, starty, diffx, diffy, drag, lastfocus, scrollLeft, scrollTop;

	slider.addEventListener('scroll', () => check, { passive: true })
	slider.addEventListener('pointerover', () => {
		clearInterval(timer)
		set(0)
	}, {once: true, passive: true})

	slider.addEventListener('touchstart', () => {
		check()
		setTimeout(check, 100)
		setTimeout(check, 500)
		setTimeout(check, 1000)
	}, { passive: true })
	slider.addEventListener('touchend', () => {
		check()
		setTimeout(check, 100)
		setTimeout(check, 500)
		setTimeout(check, 1000)
	}, { passive: true })
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