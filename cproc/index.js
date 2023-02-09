const map = new Map()
/*
	Последовательное выполнение функций с замещением на одинаковых группах

	cproc(Store, 'test', async () => await void)
	cproc(Store, 'test', async () => await void) //void запустится 1 раз, оба вызова вернут одинаковый результат, замещение по группе ''

	cproc(Store, 'test1', async () => await void)
	cproc(Store, 'test2', async () => await void) //void запустится 2 раза, параллельно, вперемешку


	cproc(Store, 'test', async () => await void, 1)
	cproc(Store, 'test', async () => await void, 2) //void запустится 2 раза, второй раз после того как завершится 1, группы разные, замещения не будет
	//Одновременный запуск не перемешает шаги выполнения в void. 


	cproc(Obj, key, func, 1)
	cproc(Obj, key, func, 2)
	cproc(Obj, key, func, 1) //не нужно буквально помнить об первом 1, так как или 1 завершился и надо встать в очередь и выполнить снова или сейчас выполняется и возвращается текущий.
	cproc(Obj, key, func, 3) //в одном key выполняется только один, остальные забываются, нет кэша
*/

const cproc = (obj, key, fn, group = '') => {
	if (!map.has(obj)) map.set(obj, {})
	const glob = map.get(obj)

	if (!Object.hasOwn(glob, key)) glob[key] = {}
	const store = glob[key]
	
	if (store.promise) { //Уже выполняется
		if (store.group == group) { //Замещающий вызов только когда прям сейчас выполняется
			return store.promise
		} else { //Без замещения, последовательный вызов
			return store.promise.then(() => cproc(obj, key, fn, group))
		}
	} else {
		store.group = group
		store.promise = fn(group).then(result => {
			delete glob[key]
			if (!Object.keys(glob).length) map.delete(obj)
			return result
		})
		return store.promise
	}
}
export default cproc