export class Bread {
	crumbs = []
	top = null //Верхний уровень контроллера
	root = null //Путь от реального корня до контроллера
	search = null //Строка запроса как она есть
	get = null //get параметры
	path = null //строка запроса к контроллеру
	constructor (path, get, search, root) {
		this.search = search
		this.root = root
		this.get = get
		this.path = path
		path = path.split('/').filter(p => p)
		let top = new Crumb(this, path.join('/'))
		this.top = top
		const cont = []
		this.crumbs.push(top)
		while (path.length) {
			const p = path.shift()
			const crumb = new Crumb(this, path.join('/'), cont.join('/'), p)
			this.crumbs.push(crumb)
			cont.push(p)
			crumb.parent = top
			top.child = crumb
			top = crumb
		}
	}
	getCrumb (i) {
		return this.crumbs[i]
	}
}
class Crumb {
	child = null
	parent = null
	#crumb = null
	#bread = null
	constructor (bread, next = '', cont = '', name = '') {
		this.#bread = bread
		this.name = name
		this.cont = cont //до, без name
		this.next = next //после, без name
		this.#crumb = '/' + [bread.root, cont, name].filter(p => p).join('/')
	}
	toString () {
		return this.#crumb
	}
}