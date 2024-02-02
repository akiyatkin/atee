export default class Bread {
	crumbs = []
	top = null //Верхний уровень контроллера
	end = null //Последний уровень адресной строки
	root = null //Путь от реального корня до контроллера
	href = null //Строка запроса как она есть
	get = null //get параметры
	path = null //строка запроса к контроллеру
	depth = null //Глубина запроса, или последний индекс в crumbs
	constructor (path, get, href, root) {
		this.href = href
		
		const r = href.split('?')
		r.shift()
		this.search = r.join('?')

		this.root = root
		this.get = get
		this.path = path
		path = path.split('/').filter(p => p)
		this.depth = path.length
		let top = new Crumb(root, path.join('/'))
		this.top = top
		const prev = []
		this.crumbs.push(top)
		while (path.length) {
			const name = path.shift()
			const crumb = new Crumb(root, path.join('/'), prev.join('/'), name, top)
			this.crumbs.push(crumb)
			prev.push(name)
			top = crumb
		}
		this.end = this.crumbs[this.depth]
	}
	getCrumb (i) {
		if (!this.crumbs[i]) this.crumbs[i] = new Crumb(this.root, '', this.path, '', this.getCrumb(i - 1))
		return this.crumbs[i]
	}
}
class Crumb {
	child = null
	parent = null
	#crumb = null
	constructor (root, next = '', prev = '', name = '', parent) {
		this.parent = parent
		if (parent) parent.child = this
		this.name = name
		this.prev = prev //до, без name
		this.next = next //после, без name
		this.#crumb = '/' + [root, prev, name].filter(p => p).join('/')
	}
	toString () {
		return this.#crumb
	}
}