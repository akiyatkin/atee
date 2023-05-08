const requestNextAnimationFrame = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn))

const link = document.createElement('link')
link.rel = 'stylesheet'
link.href = '/-controller/animate.css'
document.head.prepend(link)

export const animate = (tag, a, animate = '', promise = Promise.resolve()) => {
	if (!a) return
	const reg = new RegExp(tag + '-animate-')
	
	if (!animate) animate = tag == 'a' ? 'zoom' : 'opacity'
	animate = '-' + animate

	const classList = a.classList
	classList.forEach(name => {
		if (reg.test(name)) classList.remove(name)
	})
	classList.add(tag + '-animate'+animate+'-before')	
	setTimeout(() => {
		promise.finally(() => {			
			requestNextAnimationFrame(() => classList.replace(tag + '-animate' + animate + '-before', tag + '-animate' + animate + '-after'))
		}).catch(e => null)
	}, 100)
}

export default animate