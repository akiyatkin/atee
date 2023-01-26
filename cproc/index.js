const map = new Map()
/*
	Последовательное выполнение функций с замещением на группу
*/
const cproc = (obj, key, fn, group = '') => {
	if (!map.has(obj)) map.set(obj, {})
	const store = map.get(obj)
	if (!Object.hasOwn(store, key)) store[key] = {}
	if (Object.hasOwn(store[key], group)) return Promise.all(Object.values(store[key])).then(r => store[key][group])
	const promise = new Promise(resolve => resolve(fn(group))).then((r) => {
		delete store[key][group]
		if (!Object.keys(store[key]).length) delete store[key]
		if (!Object.keys(store).length) map.delete(obj)
		return r
	})
	store[key][group] = promise
	return Promise.all(Object.values(store[key])).then(r => promise)
}
export default cproc