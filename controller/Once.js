export const Once = {
	proxy: fn => {
		const cache = {}
		return (...args) => {
			const key = args.join(':')
			if (cache[key]) return cache[key].res
			cache[key] = { res: fn(...args) }
			return cache[key].res
		}
	}
}