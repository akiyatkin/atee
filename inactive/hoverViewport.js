import { CallFrame } from "./CallFrame.js"
import { isViewport } from "./isViewport.js"
import { inActive } from "./inActive.js"

/*
	over срабатывает когда el в поле зрения
	out срабатывает когда el выходит из поля зрения
*/
const hoverViewport = (el, over, out) => {
	inActive.then(() => {
		let isover = false
		let isout = false
		const func = () => {
			let r
			if (isViewport(el)) {
				if (isover) return
				isover = true
				isout = false
				if (over) r = over()
			} else {
				if (isout) return
				isout = true
				isover = false
				if (out) r = out()
			}
			if (r !== false) return
			document.body.removeEventListener('click', handler)
        	document.body.removeEventListener('mouseover', handler)
		}
		const handler = () => CallFrame(func)
		window.addEventListener('resize', handler)
		window.addEventListener('scroll', handler)
		handler()
	})
}
export default hoverViewport
export { hoverViewport }