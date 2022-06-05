
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
	cache: (name, args, fn) => {
		const store = Access.getStore(name, args)
		if (store.executed) return store.result
		store.executed = true
		store.result = fn(...args)
		return store.result
	}
}
const UPDATE_TIME = Date.now()
let ACCESS_TIME = Date.now()