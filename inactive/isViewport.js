let isViewport = (el, delta = 0) => {
    if (!el) return false
    let H = window.innerHeight
    let r = el.getBoundingClientRect()
    let t = r.top - delta
    let b = r.bottom + delta
    return !!Math.max(0, t > 0 ? H - t : (b < H ? b + 1 : H)) // +1 фикс для всплывающего окна бутстрапа, на момент всплытия всё по 0 и проверка не проходит
    //return !!Math.max(0, t > 0 ? H - t : (b < H ? b : H))
}
export { isViewport }
export default isViewport