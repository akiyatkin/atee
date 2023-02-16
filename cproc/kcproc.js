const map = new Map()
/*
тотже cproc только c name, origin key = name + key
*/
const kcproc = (obj, name, key, fn, group = '') => {
	if (!map.has(obj)) map.set(obj, {})
	const namesglob = map.get(obj)
	
	if (!Object.hasOwn(namesglob, name)) namesglob[name] = {}
	const glob = namesglob[name]

	if (!Object.hasOwn(glob, key)) glob[key] = {}
	const store = glob[key]
	
	if (store.promise) { //Уже выполняется
		if (store.group == group) { //Замещающий вызов только когда прям сейчас выполняется
			return store.promise
		} else { //Без замещения, последовательный вызов
			return store.promise.then(() => kcproc(obj, name, key, fn, group))
		}
	} else {
		store.group = group
		store.promise = fn(group).then(result => {
			delete glob[key]
			if (!Object.keys(glob).length) delete namesglob[name]
			if (!Object.keys(namesglob).length) map.delete(obj)
			return result
		})
		return store.promise
	}
}
export default kcproc