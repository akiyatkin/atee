import fs from 'fs/promises'
import cproc from '/-cproc'
import config from '/-config'

import times from '/-controller/times.js'

const CONF = await config('controller')
const STORE = {}
export const Access = {
	isAdmin: (cookie) => {
		try {
			const { access:PASS } = CONF
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
		times.ACCESS_TIME = Date.now()
		console.log('new access time', Date())
		for (const i in STORE) delete STORE[i]
	},
	getAccessTime: () => times.ACCESS_TIME,
	getUpdateTime: () => times.UPDATE_TIME,

	map: new Map(), //Кэшировать стоит то что может повториться в рамках сборки контроллера иначе бессмыслено
	relate: (obj, fn) => {
		if (Access.map.has(obj)) return Access.map.get(obj)
		const res = {}
		res.once = (name, fn) => cproc(res, name, () => {
			if (res[name]) return res[name].result
			res[name] = {}
			res[name].result = fn()
			return res[name].result
		})
		Access.map.set(obj, res)
		return res
	},
	cache: fn => { //depricated (relate?)
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
	mcache: (src, fn, check = false) => {
		fn.store = {}
		return (...args) => {
			args.push(src)
			const hash = JSON.stringify(args)
			const store = fn.store[hash] || {}
			fn.store[hash] = store
			
			
			if (!check && store.executed && store.executed >= Access.getAccessTime()) return store.result
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
export default Access
