/*
	admitted - разрешённые ключи. Например m, search, page, sort а остальные в адрес попадать не будут 
*/
const addget = (params = {}, urlParams = new URLSearchParams(window.location.search), admitted = false) => {
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