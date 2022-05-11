let promise
let WebPCheck = callback => {
    if (promise) {
        if (callback) promise.then(r => callback(r))
        return promise
    }
    promise = new Promise(resolve => {
        let lossy = "UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA"
        let img = new Image();
        img.onload = () => resolve((img.width > 0) && (img.height > 0))
        img.onerror = () => resolve(false)
        img.src = "data:image/webp;base64," + lossy
    })
    if (callback) promise.then(r => callback(r))
    return promise
}

export { WebPCheck }
