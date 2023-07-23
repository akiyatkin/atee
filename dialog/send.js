const send = async (src, post) => {
	const options = {}
	const formBody = []
	if (post) {
		options.method = 'POST'
		options.headers = { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }
		for (const property in post) {
			const encodedKey = encodeURIComponent(property)
			const encodedValue = encodeURIComponent(post[property])
			formBody.push(encodedKey + "=" + encodedValue)
		}
		options.body = formBody.join("&")
	}
	return await fetch(src, options).then(res => res.json()).catch(e => ({msg:"Ошибка на сервере"}))
}
export default send