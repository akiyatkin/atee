import Relate from '/-controller/Relate.js'

export default class Visitor {
	#map = new Map() //Кэшировать стоит то что может повториться в рамках сборки контроллера иначе бессмыслено
	relate (obj, fn) {
		if (this.#map.has(obj)) return this.#map.get(obj)
		const res = new Relate()
		this.#map.set(obj, res)
		return res
	}
	constructor (request) {
		//this.request нельзя сохранять, чтобы отдельный view не решил что может что-то отправить и закрыть request
		this.client = {
			cookie: request.headers.cookie || '', 
			referer: request.headers.referer || '',
			host: request.headers.host, 
			ip: request.headers['x-forwarded-for'] || request.socket.remoteAddress
		}
	 }
}