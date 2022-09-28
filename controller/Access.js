import fs from 'fs/promises'

const STORE = {}
export const Access = {
	isAdmin: async (cookie) => {
		try {
			const {default:{access:PASS}} = await import('/data/.controller.json', {assert: {type: "json"}})
			if (cookie === PASS) return true
			let pass = cookie.match('(^|;)?\-controller=([^;]*)(;|$)')
			if (!pass) return false
			pass = decodeURIComponent(pass[2])
			return pass === PASS
		} catch (e) {
			return false
		}
	},
	getStore: (name, args) => {
		const hash = JSON.stringify(args)
		if (!STORE[name]) STORE[name] = {}
		if (!STORE[name][hash]) STORE[name][hash] = {}
		return STORE[name][hash]
	},
	setAccessTime: () => {
		ACCESS_TIME = Date.now()
		for (const i in STORE) delete STORE[i]
	},
	getAccessTime: () => ACCESS_TIME,
	getUpdateTime: () => UPDATE_TIME,

	map: new Map(), //Кэшировать стоит то что может повториться в рамках сборки контроллера иначе бессмыслено
	relate: (obj, fn) => {
		if (Access.map.has(obj)) return Access.map.get(obj)
		const res = {}
		res.once = (name, fn) => {
			if (res[name]) return res[name].result
			res[name] = {}
			res[name].result = fn()
			return res[name].result
		}
		Access.map.set(obj, res)
		return res
	},
	cache: fn => {
		fn.store = {}
		return (...args) => {
			const hash = JSON.stringify(args)
			const store = fn.store[hash] || {}
			fn.store[hash] = store
			if (store.executed) {
				if (store.executed >= Access.getAccessTime()) return store.result
			}
			store.executed = Date.now()
			store.result = fn(...args)
			return store.result
		}
	},
	mcache: (src, fn) => {
		fn.store = {}
		return (...args) => {
			args.push(src)
			const hash = JSON.stringify(args)
			const store = fn.store[hash] || {}
			fn.store[hash] = store
			
			
			if (store.executed && store.executed >= Access.getAccessTime()) return store.result
			if (store.promise) return store.promise

			store.promise = new Promise(async resolve => {
				const { mtime } = await fs.stat(src)
				if (store.executed >= mtime) {
					store.executed = Access.getAccessTime()
				} else {
					store.executed = Date.now()
					store.result = await fn(...args)
				}
				resolve(store.result)
				delete store.promise
			})
			return store.promise
		}
	}
}
const UPDATE_TIME = Date.now()
let ACCESS_TIME = Date.now()