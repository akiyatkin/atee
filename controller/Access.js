const STORE = {}
export const Access = {
	getStore: (name, args) => {
		const hash = JSON.stringify(args)
		if (!STORE[name]) STORE[name] = {}
		if (!STORE[name][hash]) STORE[name][hash] = {}
		return STORE[name][hash]
	},
	now: () => Math.round(Date.now() / 1000),
	setAccessTime: () => {
		ACCESS_TIME = Access.now()
		for (const i in STORE) delete STORE[i]
	},
	getAccessTime: () => ACCESS_TIME,
	getUpdateTime: () => UPDATE_TIME,
	cache: (name, args, fn) => {
		const store = Access.getStore(name, args)
		if (store.executed) return store.result
		store.executed = true
		store.result = fn(...args)
		return store.result
	}
}
const UPDATE_TIME = Access.now()
let ACCESS_TIME = Access.now()