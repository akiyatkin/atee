import Relate from '/-controller/Relate.js'

export default class Visitor {
	#map = new Map() //Кэшировать стоит то что может повториться в рамках сборки контроллера иначе бессмыслено
	relate (obj) {
		if (this.#map.has(obj)) return this.#map.get(obj)
		const res = new Relate()
		this.#map.set(obj, res)
		return res
	}
	constructor (client) {
		this.client = Object.assign({
			cookie: '',
			referer: '',
			host: '',
			ip: ''
		}, client)
	 }
}