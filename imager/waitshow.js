import isViewport from "/-inactive/isViewport.js"
import CallFrame from "/-inactive/CallFrame.js"
const check = () => {
	for (const el of document.getElementsByClassName('waitshow')) {
		if (!isViewport(el, 100)) continue
		el.classList.add('show')
	}
}
const waitshow = {
	init: () => {
		window.addEventListener('scroll', () => CallFrame(check, 400), { passive: true })
		window.addEventListener('resize', () => CallFrame(check, 400), { passive: true })
		CallFrame(check, 400)
	}
}
export default waitshow