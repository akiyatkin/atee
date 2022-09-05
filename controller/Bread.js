export class Bread {
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
			const crumb = new Crumb(root, path.join('/'), prev.join('/'), name)
			this.crumbs.push(crumb)
			prev.push(name)
			crumb.parent = top
			top.child = crumb
			top = crumb
		}
		this.end = this.crumbs[this.depth]
	}
	getCrumb (i) {
		return this.crumbs[i]
	}
}
class Crumb {
	child = null
	parent = null
	#crumb = null
	constructor (root, next = '', prev = '', name = '') {
		this.name = name
		this.prev = prev //до, без name
		this.next = next //после, без name
		this.#crumb = '/' + [root, prev, name].filter(p => p).join('/')
	}
	toString () {
		return this.#crumb
	}
}