export default class Visitor {
	#map = new Map() //Кэшировать стоит то что может повториться в рамках сборки контроллера иначе бессмыслено
	relate (obj, fn) {
		if (this.#map.has(obj)) return this.#map.get(obj)
		const res = {}
		res.once = (name, fn) => {
			if (res[name]) return res[name].result
			res[name] = {}
			res[name].result = fn()
			return res[name].result
		}
		this.#map.set(obj, res)
		return res
	}
	constructor (request) {
		this.client = {
			cookie: request.headers.cookie || '', 
			host: request.headers.host, 
			ip: request.headers['x-forwarded-for'] || request.socket.remoteAddress
		}
	 }
}