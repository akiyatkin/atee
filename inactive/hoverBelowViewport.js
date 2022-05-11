import { CallFrame } from "./CallFrame.js"
import { isBelowViewport } from "./isBelowViewport.js"
let second = false
const hoverBelowViewport = (el, over, out) => {
    let isover = false
    let isout = false
    if (!el) return
    const func = () => {
        if (isBelowViewport(el)) {
            if (!isover) {
                isover = true
                isout = false
                over()
            }
        } else {
            if (!isout) {
                isout = true
                isover = false
                out()
            }
        }
    }
    const handler = () => CallFrame(func)
    window.addEventListener('resize', handler)
    window.addEventListener('scroll', handler)
    const init = () => {
        second = true
        handler()
        document.body.removeEventListener('click', init)
        document.body.removeEventListener('mouseover', init)
    }
    if (!second) {
        document.body.addEventListener('click', init)
        document.body.addEventListener('mouseover', init)
    } else {
        handler()
    }
}

export { hoverBelowViewport }