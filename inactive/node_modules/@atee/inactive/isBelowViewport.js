let isBelowViewport = el => {
    let r = el.getBoundingClientRect()
    return r.bottom < 0
}
export { isBelowViewport }