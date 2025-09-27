/*
	- admitted - разрешённые ключи. Например m, search, page, sort а остальные в адрес попадать не будут 
		Если admitted не указан, то сохранятся все аргументы что уже есть в адресе (кроме t, t удаляется всегда)
	- удалить параметр из адресной строки params = {query: null}

	- Пример на сервере
		${addget(env.bread.get, {p:1}, ['m', 'query', 'sort', 'count']}
	- Пример на клиенте 
		addget(Client.bread.get, {p:1})
		addget(new URLSearchParams(window.location.search), {p:1, query: null})
	
	- Если параметры есть то результат это строка с вопросом '?...'
	- Якорь не сохраняется

	- Значение по умолчанию addget(Client.bread.get, {p:1, count: Client.bread.get.count || 10})
		

*/
const addget = (urlParams, params = {}, admitted = false) => {
	//urlParams ||= new URLSearchParams(window.location.search)
	const list = urlParams instanceof URLSearchParams ? urlParams : Object.entries(urlParams)
	for (const [name, value] of list) {
		if (!(name in params) && (!admitted || ~admitted.indexOf(name))) params[name] = value
	}
	delete params.t
	const search = Object.entries(params)
		.filter(([key, val]) => val !== '' && val !== null && val !== undefined)
		.map(([key, val]) => key)
		.sort()
		.map(key => `${key}=${params[key]}`)
		.join('&')
	return search ? '?' + search : ''
}
export default addget