await new Promise(resolve => {
	const link = document.createElement('link')
	link.rel = 'stylesheet'
	link.onload = resolve
	link.href = '/-imager/showBig.css'	
	document.head.prepend(link)
})


const showBig = (div) => {
	const images = div.querySelectorAll(".image")
	let showed = false
	const show = (image) => {
		if (showed) hide(showed)
		showed = image
		image.classList.add("big")
		image.scrollIntoView()
	}
	const hide = (image = showed) => {
		showed = false
		image.classList.remove("big")
	}
	const next = () => {
		const image = showed.nextElementSibling
		hide()
		if (image) show(image)
	}
	for (const image of images) {
		
		const small = image.querySelector('.small')
		small.addEventListener("click", e => {
			e.stopPropagation()
			show(image)
		})
		const big = image.querySelector('.big')
		big.addEventListener("click", e => {
			e.stopPropagation()
			return next()
		})
	}
	const ENTER = 13
	const ESC = 27
	window.addEventListener('click', () => {
		if (!showed) return
		hide()
	})
	window.addEventListener("keypress", e => {
		if (!showed) return
		if (e.keyCode != ENTER) return
		next()
	})
	window.addEventListener("keydown", e => {
		if (!showed) return
		if (e.keyCode != ESC) return
		hide()
	})
}


export default showBig
