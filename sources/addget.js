const addget = (params = {}, urlParams = new URLSearchParams(window.location.search)) => {
	if (urlParams instanceof URLSearchParams) {
		for (const [name, value] of urlParams) if (!(name in params)) params[name] = value
	} else {
		for (const [name, value] of Object.entries(urlParams)) if (!(name in params)) params[name] = value
	}
	delete params.t
	const search = Object.entries(params)
		.filter(([key, val]) => val !== '' && val !== null)
		.map(([key, val]) => key)
		.sort()
		.map(key => `${key}=${params[key]}`)
		.join('&')
	return search ? '?' + search : ''
}
export default addget