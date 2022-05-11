let isViewport = el => {
    if (!el) return false
    let H = window.innerHeight
    let r = el.getBoundingClientRect()
    let t = r.top 
    let b = r.bottom
    return !!Math.max(0, t > 0 ? H - t : (b < H ? b + 1 : H)) // +1 фикс для всплывающего окна бутстрапа, на момент всплытия всё по 0 и проверка не проходит
    //return !!Math.max(0, t > 0 ? H - t : (b < H ? b : H))
}
export { isViewport }