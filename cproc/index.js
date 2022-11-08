const map = new Map()
const cproc = async (obj, key, fn) => {
	if (!map.has(obj)) map.set(obj, new Map())
	const store = map.get(obj)
	if (store.has(key)) return store.get(key)
	const promise = fn()
	store.set(key, promise)
	await promise
	store.delete(key)
	if (!store.size) map.delete(obj)
	return promise
}
/*
	//параллельного асинхронное выполнение исключается, результат общий первый
	cproc(obj, key, () => {
	
	})
*/
export default cproc