import CallFrame from "./CallFrame.js"
import isViewport from "./isViewport.js"
import inActive from "./inActive.js"


const inViewport = (el, cb) => {
    return inActive.then(() => {
        return new Promise(resolve => {
            const func = () => {
                if (!isViewport(el)) return
                window.removeEventListener('resize', handler)
                window.removeEventListener('scroll', handler)
                if (cb) cb()
                resolve()
                return true
            }
            const handler = () => CallFrame(func)
            window.addEventListener('resize', handler)
            window.addEventListener('scroll', handler)
            handler()
        })
    })
}

export { inViewport }
export default inViewport