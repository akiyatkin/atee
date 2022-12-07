const ws = new WeakMap()
const Img = {
	load: img => {
		/*
			Возвращает промис. Может быть и resolve и reject.
			Картинка должна быть в блоке display none и loading lazy, чтобы картинка загружалась только с вызовом этой функции
		*/
		let promise = ws.get(img)
		if (promise) return promise
		if (!img) {
			promise = Promise.reject(false)
			ws.set(img, promise)
			return promise
		}
		if (img.complete) {
			promise = new Promise(resolve => resolve(img.naturalWidth > 0))
			//promise = new Promise(resolve => resolve(true))
			ws.set(img, promise)
			return promise
		}
		promise = new Promise(resolve => {
			img.addEventListener('load', () => resolve(img.naturalWidth > 0))
			//img.addEventListener('load', () => resolve(true))
			img.addEventListener('error', () => resolve(false))
		})
		if (img.loading) img.loading = 'eager'
		ws.set(img, promise)
		return promise
	}
}

export { Img }
export default Img