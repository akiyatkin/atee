import fs from 'fs/promises'
import cproc from '/-cproc'
import config from '/-config'

import times from '/-controller/times.js'
import Relate from '/-controller/Relate.js'
import deepFreeze from '/-controller/deepFreeze.js'

const CONF = await config('controller')

const Access = {
	isAdmin: (cookie) => {
		try {
			const { access:PASS } = CONF
			if (cookie === PASS) return true
			let pass = cookie.match('(^|;)?-controller=([^;]*)(;|$)')
			if (!pass) return false
			pass = decodeURIComponent(pass[2])
			return pass === PASS
		} catch (e) {
			return false
		}
	},
	setAccessTime: () => {
		times.ACCESS_TIME = Date.now()
		Access.mapate = new Map()
		console.log('new access time', Date())
		Access.poke.list.forEach(poked => {
			poked.storage = {}
		})
	},
	getAccessTime: () => times.ACCESS_TIME,
	getUpdateTime: () => times.UPDATE_TIME,

	mapate: new Map(),
	relate: (obj) => {
		if (Access.mapate.has(obj)) return Access.mapate.get(obj)
		const res = new Relate()
		Access.mapate.set(obj, res)
		return res
	},
	mapup: new Map(),
	relup: (obj, fn) => {
		if (Access.mapup.has(obj)) return Access.mapup.get(obj)
		const res = new Relate()
		Access.mapup.set(obj, res)
		return res
	},

	
	// cache: fn => { //depricated (relate ^)
	// 	fn.store = {}
	// 	return (...args) => {
	// 		const hash = JSON.stringify(args)
	// 		const store = fn.store[hash] || {}
	// 		fn.store[hash] = store
	// 		if (store.executed) {
	// 			if (store.executed >= Access.getAccessTime()) return store.result
	// 		}
	// 		store.executed = Date.now()
	// 		store.result = fn(...args)
	// 		return store.result
	// 	}
	// },
	mcache: (src, fn, check = false) => { //update cache, проверяющий дату изменений если с последнего был access
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
				//if (store.executed >= mtime) {
				if (store.executed >= new Date(mtime).getTime()) {
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


Access.poke = (func) => { //Результат складывать в Мешок не на долго, кэш
	const poked = (...args) => {
		const store = poked.storage[args.join(':')] ??= {} //Только простые аргументы должны быть
		clearTimeout(store.timer)
		store.timer = setTimeout(() => {
			delete store.ready
			delete store.cache
		}, 1 * 60 * 1000) //hours * min * sec
		if (!store.ready) {
			store.cache = deepFreeze(func(...args))
			
			store.ready = true
		}
		return store.cache
	}
	poked.storage = {}
	Access.poke.list.push(poked)
	return poked
}
Access.poke.list = []


export default Access
