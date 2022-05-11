import { CallFrame } from "/vendor/akiyatkin/waitshow/CallFrame.js"
import { isViewport } from "/vendor/akiyatkin/load/isViewport.js"
import { inActive } from "/vendor/akiyatkin/load/inActive.js"


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