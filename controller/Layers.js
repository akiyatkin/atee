//const fi = (before, after) => before && after ? before + after : {toString:() => ''}
//const fi = (...args) => args.some(a => !a) ? '' : args.join('')
const fin = (before, after) => before ? before + after : ''
const lin = (before, after) => after ? before + after : ''

const split = (sep, str) => {
	if (!str) return []
	const i = str.indexOf(sep)
	return ~i ? [str.slice(0, i), str.slice(i + 1)] : [str]
}
const wakeup = (root, rule, depth = 0) => {
	if (!rule) return 
	if (!rule.layout) return
	for (const pts in rule.layout) {
		for (const div in rule.layout[pts]) {
			const tsf = rule.layout[pts][div]
			const [name = '', subframe = ''] = tsf ? split(':', tsf) : []
			const [sub = '', frame = ''] = split('.', subframe)
			const ts = fin(name, lin(':', sub))
			const sid = [div, name, sub, frame].join('-')
			//const ts = fi(name, ':' + sub)
			const layer = { sid, ts, tsf, name, sub, div, depth, tpl:null, html: null, json:null, layers: null}
			if (root.onlyclient && ~root.onlyclient.indexOf(ts)) layer.onlyclient = true
			if (root.global && root.global[ts]) layer.global = root.global[ts]
			if (frame) {
				layer.frame = frame
				layer.frameid = frame ? 'FRAMEID-' + frame.replaceAll('.','-') : ''
			}
			rule.layout[pts][div] = layer
		}
	}

	wakeup(root, rule.child, depth + 1)
	if (rule.childs) for (const path in rule.childs) {
		wakeup(root, rule.childs[path], depth + 1)
	}
}
const spread = (rule, parent) => { //всё что в layout root переносим в свой child или childs
	if (!rule) return
	if (!rule.layout) return
	if (parent) {
		for (const tsf in parent.layout) {
			if (!rule.layout[tsf]) rule.layout[tsf] = {}
			for (const div in parent.layout[tsf]) {
				if (!rule.layout[tsf][div]) rule.layout[tsf][div] = { ...parent.layout[tsf][div] }
			}
		}
	}
	spread(rule.child, rule)
	if (rule.childs) for (const path in rule.childs) {
		spread(rule.childs[path], rule)
	}
}



const maketree = (layer, layout, rule) => {
	if (!layout) return
	//if (layer.name == 'params') 
	const tsf = layer.tsf
	if (!layout[tsf]) return
	layer.layers = Object.values(layout[tsf])
	for (const l of layer.layers) {
		maketree(l, layout, rule)
	}
}

const runByLayer = (rule, fn) => {
	Layers.runByIndex(rule, r => {
		Layers.runByRootLayer(rule.root, fn)
	})
}

const applyframes = (rule) => {
	if (!rule.frame) return
	const frame = rule.frame
	//Нужно встроить фреймы в вёрстку
	Layers.runByIndex(rule, (root) => {
		//Показывается ли в каком-то div слой с frame
		for (const up in root.layout) {
			for (const div in root.layout[up]) {
				const inner = root.layout[up][div]
				if (!frame[inner]) continue
				
				root.layout[up][div] = frame[inner] + '.' + div
				const tsf = frame[inner] +'.' +div
				//rule.frames[frame[inner]]

				if (!root.layout[tsf]) root.layout[tsf] = (rule.frames && rule.frames[frame[inner]]) ? {...rule.frames[frame[inner]]} : {}
				root.layout[tsf]['FRAMEID'+'-'+div] = inner
			}
		}
	})
}
const RULS = {}




export default class Layers {
	static store = {}
	static runByRootLayer(root, fn) {
		fn(root)
		root.layers?.forEach(l => Layers.runByRootLayer(l, fn))
	}
	static getParsedIndex(rule, timings, bread, interpolate, theme) {
		const {index, status, depth} = Layers.getIndex(rule, bread)

		let check = ''
		if (index.checktpl) {
			const crumb = bread.getCrumb(depth)
			check = interpolate(index.checktpl, timings, {}, bread, crumb, theme)
		}
		
		if (!index) return []
		Layers.runByRootLayer(index.root, layer => {
			const crumb = bread.getCrumb(layer.depth)
			const {ts, tsf} = layer
			if (rule.replacetpl) layer.replacetpl = rule.replacetpl[layer.ts]
			if (layer.name) {
				if (rule.htmltpl && Object.hasOwn(rule.htmltpl, layer.name)) {
					layer.html = interpolate(rule.htmltpl[layer.name], timings, layer, bread, crumb, theme)
				} else {
					if (rule.html) layer.html = rule.html[layer.name]
				}
				if (rule.tpl) layer.tpl = rule.tpl[layer.name]
				
			}
			if (rule.parsedtpl?.[ts]) {
				layer.parsed = interpolate(rule.parsedtpl[ts], timings, layer, bread, crumb, theme)
			}
			if (rule.jsontpl?.[tsf]) {
				layer.json = interpolate(rule.jsontpl[tsf], timings, layer, bread, crumb, theme)
			} else if (rule.jsontpl?.[ts]) {
				layer.json = interpolate(rule.jsontpl[ts], timings, layer, bread, crumb, theme)
			} else if (rule.json?.[tsf]) {
				layer.json = rule.json[tsf]
			} else if (rule.json?.[ts]) {
				layer.json = rule.json[ts]
			}
		})
		return { index, status, check }
	}
	static collectPush(rule, timings, bread, root, interpolate, theme) {
		const push = []
		Layers.runByRootLayer(root, layer => {
			const crumb = bread.getCrumb(layer.depth)
			const ts = layer.ts
			if (rule.push && rule.push[ts]) {
				push.push(...rule.push[ts])
			}
			if (rule.pushtpl && rule.pushtpl[ts]) {
				rule.pushtpl[ts].forEach(val => {
					push.push(interpolate(val, timings, layer, bread, crumb, theme))	
				})
			}
		})
		return push
	}
	static async getRule(root) {
		if (RULS[root]) return RULS[root]
		//root должен быть без ведущего слэша и работать с дефисом
		const layers = Layers.getInstance(root)
		const source = await layers.getSource()
		const rule = structuredClone(source)
		
		applyframes(rule) //встраиваем фреймы
		wakeup(rule, rule) //объекты слоёв
		spread(rule) //layout в childs самодостаточный
		
		const tsf = rule.index
		const [name = '', subframe = ''] = split(':', tsf)
		const [sub = '', frame = ''] = split('.', subframe)
		const frameid = frame ? 'FRAMEID-' + frame.replaceAll('.','-') : ''
		const ts = fin(name, lin(':', sub))
		
		//const ts = fi(name, ':' + sub)
		Layers.runByIndex(rule, (r, path, depth) => { 
			//строим дерево root по дивам для каждого состояния path
			const layer = { tsf, ts, name, sub, frame, frameid, depth: 0, tpl:null, html: null, json:null, layers:null }
			r.root = layer
			maketree(r.root, r.layout, rule)
			delete r.layout
			Layers.runByRootLayer(r.root, layer => {
				const ts = layer.ts
				if (rule.animate && rule.animate[ts]) layer.animate = rule.animate[ts]			
				if (!rule.depth || rule.depth[ts] == null) return
				const dif = rule.depth[ts] - layer.depth
				layer.depth += dif
				Layers.runByRootLayer(layer, (l) => l.depth = layer.depth)
			})
		})
		RULS[root] = rule
		return RULS[root]
	}
	static getInstance(root) {
		if (!Layers.store[root]) Layers.store[root] = new Layers(root)
		return Layers.store[root]
	}
	static getIndex(source, bread) { //У path нет ведущего слэша
		let top = bread.top
		let status = 200
		let depth = bread.depth
		let index = source
		while (top.child) {
			top = top.child
			index = (index.childs && Object.hasOwn(index.childs, top.name)) ? index.childs[top.name] : index.child
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
		return {
			index, depth, status
		}
	}
	static runByIndex (rule, fn, path = [], depth = 0) {
		fn(rule, path, depth)
		depth++
		if (rule.childs) for (const i in rule.childs) Layers.runByIndex(rule.childs[i], fn, [...path, i], depth)
		if (rule.child) Layers.runByIndex(rule.child, fn, [...path, false], depth)
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