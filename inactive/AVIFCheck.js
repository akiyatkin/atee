let promise
let AVIFCheck = callback => {
    if (promise) {
        if (callback) promise.then(r => callback(r))
        return promise
    }
    promise = new Promise(resolve => {
        let lossy = "AAAAHGZ0eXBtaWYxAAAAAG1pZjFhdmlmbWlhZgAAAPNtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAAA5waXRtAAAAAAABAAAAHmlsb2MAAAAABEAAAQABAAAAAAEXAAEAAAAeAAAAKGlpbmYAAAAAAAEAAAAaaW5mZQIAAAAAAQAAYXYwMUltYWdlAAAAAHJpcHJwAAAAU2lwY28AAAAUaXNwZQAAAAAAAAABAAAAAQAAABBwYXNwAAAAAQAAAAEAAAAXYXYxQ4EADAAKCQAAAAAAffyAIAAAABBwaXhpAAAAAAMICAgAAAAXaXBtYQAAAAAAAAABAAEEAQKDhAAAACZtZGF0CgkAAAAAAH38gCAyERAAsgAAAkAAAAB5R6SJZPyA"
        let img = new Image();
        img.onload = () => resolve((img.width > 0) && (img.height > 0))
        img.onerror = () => resolve(false)
        img.src = "data:image/avif;base64," + lossy
    })
    if (callback) promise.then(r => callback(r))
    return promise
}

export { AVIFCheck }
