export default class Layers {
	static store = {}
	static getInstance(root) {
		if (!Layers.store[root]) Layers.store[root] = new Layers(root)
		return Layers.store[root]
	}
	static getIndex(source, path) { //У path нет ведущий слэш
		const r = path.split('/')
		let index = source
		let name
		let depth = r.length
		while (name = r.shift()) {
			index = index.childs?.[name] || index.child
			if (index) continue
			depth = 1
			index = source.childs?.['404'] || source.childs?.['500']
			break
		}
		return {index, depth}
	}
	static runByIndex (rule, fn, path = []) {
		fn(rule, path)
		if (rule.childs) for (const i in rule.childs) Layers.runByIndex(rule.childs[i], fn, [...path, i])
		if (rule.child) Layers.runByIndex(rule.child, fn, [...path, false])
	}
	constructor(root) {
		this.root = root
	}
	async getSource () {
		//root должен быть без ведущего слэша и работать с дефисом
		let root = this.root
		if (root) root = '-' + root
		const { default: rule } = await import('/' + root + '/layers.json', {assert: { type: "json" }})
		return rule
	}
}