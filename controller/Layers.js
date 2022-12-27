export default class Layers {
	static store = {}
	static getInstance(root) {
		if (!Layers.store[root]) Layers.store[root] = new Layers(root)
		return Layers.store[root]
	}
	static getIndex(source, bread) { //У path нет ведущий слэш
		let top = bread.top
		let status = 200
		let depth = bread.depth
		let index = source
		while (top.child) {
			top = top.child
			index = index.childs?.[top.name] || index.child
			if (index) continue
			status = 404
			depth = 1
			index = source.childs?.[status]
			if (index) break
			status = 500
			index = source.childs?.[status]
			if (!index) depth = null
			break
		}
		return {index, depth, status}
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